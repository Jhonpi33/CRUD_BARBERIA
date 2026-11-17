import { WhatsAppOutbox } from '../models/WhatsAppOutbox.js'
import { Appointment } from '../models/Appointment.js'
import { Profile } from '../models/Profile.js'
import { normalizePhone } from '../models/Client.js'

const MAX_ATTEMPTS = 5
const STALE_CLAIM_MS = 2 * 60 * 1000
const REMINDER_MS = 3 * 60 * 60 * 1000

let transport = sendCloudTemplate

export function isWhatsAppConfigured(env = process.env) {
  return Boolean(
    env.WHATSAPP_ACCESS_TOKEN &&
      env.WHATSAPP_PHONE_NUMBER_ID &&
      /^v\d+\.\d+$/.test(env.WHATSAPP_GRAPH_API_VERSION || '')
  )
}

export function getWhatsAppCapabilities(env = process.env) {
  const configured = isWhatsAppConfigured(env)
  return {
    configured,
    barberAlerts: configured && Boolean(env.WHATSAPP_TEMPLATE_BOOKING_OWNER),
    clientUpdates:
      configured &&
      Boolean(
        env.WHATSAPP_TEMPLATE_BOOKING_CLIENT &&
          env.WHATSAPP_TEMPLATE_CONFIRMED_CLIENT &&
          env.WHATSAPP_TEMPLATE_REMINDER_CLIENT &&
          env.WHATSAPP_TEMPLATE_CANCELLED_CLIENT
      ),
  }
}

export function isWhatsAppPilotReady(env = process.env) {
  const channels = getWhatsAppCapabilities(env)
  return Boolean(
    channels.configured &&
      channels.barberAlerts &&
      channels.clientUpdates &&
      env.WHATSAPP_TEMPLATE_CANCELLED_CLIENT
  )
}

export function setWhatsAppTransport(nextTransport) {
  transport = nextTransport || sendCloudTemplate
}

function recipientNumber(value) {
  const digits = normalizePhone(value)
  if (digits.length === 10) return `57${digits}`
  if (digits.length >= 11 && digits.length <= 15) return digits
  return ''
}

function appointmentParameters(appointment, businessName) {
  return [
    appointment.clientSnapshot.name,
    businessName,
    appointment.serviceSnapshot.name,
    appointment.date,
    appointment.localStart,
    appointment.localEnd,
    appointment.locationSnapshot || '',
  ]
}

async function enqueue({ appointment, recipientRole, phone, templateName, parameters, dedupeSuffix, scheduledAt = new Date() }) {
  if (!isWhatsAppConfigured() || !templateName) return false
  const to = recipientNumber(phone)
  if (!to) return false

  try {
    await WhatsAppOutbox.updateOne(
      { dedupeKey: `${appointment._id}:${dedupeSuffix}` },
      {
        $setOnInsert: {
          appointment: appointment._id,
          recipientRole,
          recipientPhone: to,
          templateName,
          language: process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'es_CO',
          parameters,
          dedupeKey: `${appointment._id}:${dedupeSuffix}`,
          scheduledAt,
          status: 'pending',
        },
      },
      { upsert: true }
    )
    return true
  } catch (err) {
    if (err?.code !== 11000) console.error('[whatsapp] no se pudo guardar el aviso en cola:', err.code || 'error')
    return false
  }
}

/** Crea avisos de reserva y recordatorio; el outbox protege contra duplicados y reinicios. */
export async function queueBookingWhatsApp(appointment) {
  if (!isWhatsAppConfigured()) return
  try {
    const profile = await Profile.findOne({ owner: appointment.owner }).select(
      'professionalName businessName phone location whatsappNotificationsEnabled'
    ).lean()
    if (!profile) return
    const businessName = profile.professionalName || profile.businessName || 'Barbería'
    const params = appointmentParameters({
      ...(appointment.toObject?.() || appointment),
      locationSnapshot: appointment.locationSnapshot || profile.location,
    }, businessName)

    if (profile.whatsappNotificationsEnabled) {
      await enqueue({
        appointment,
        recipientRole: 'barber',
        phone: profile.phone,
        templateName: process.env.WHATSAPP_TEMPLATE_BOOKING_OWNER,
        parameters: params,
        dedupeSuffix: 'booking:barber',
      })
    }

    if (appointment.clientSnapshot.whatsappOptIn) {
      await enqueue({
        appointment,
        recipientRole: 'client',
        phone: appointment.clientSnapshot.phone,
        templateName: process.env.WHATSAPP_TEMPLATE_BOOKING_CLIENT,
        parameters: params,
        dedupeSuffix: 'booking:client',
      })

      const reminderAt = new Date(Math.max(Date.now(), appointment.startUtc.getTime() - REMINDER_MS))
      await enqueue({
        appointment,
        recipientRole: 'client',
        phone: appointment.clientSnapshot.phone,
        templateName: process.env.WHATSAPP_TEMPLATE_REMINDER_CLIENT,
        parameters: params,
        dedupeSuffix: 'reminder:3h',
        scheduledAt: reminderAt,
      })
    }
  } catch (err) {
    console.error('[whatsapp] no se pudieron preparar avisos de reserva:', err.code || 'error')
  }
}

/** Avisos al cliente cuando el barbero confirma o cancela. */
export async function queueAppointmentStatusWhatsApp(appointment, status) {
  if (!isWhatsAppConfigured()) return
  if (!['confirmed', 'cancelled'].includes(status)) return
  try {
    if (status === 'cancelled') {
      await WhatsAppOutbox.updateMany(
        {
          appointment: appointment._id,
          templateName: process.env.WHATSAPP_TEMPLATE_REMINDER_CLIENT,
          status: 'pending',
        },
        { $set: { status: 'cancelled' } }
      )
    }
    if (!appointment.clientSnapshot?.whatsappOptIn) return
    const profile = await Profile.findOne({ owner: appointment.owner }).select(
      'professionalName businessName location'
    ).lean()
    if (!profile) return
    const params = appointmentParameters(
      {
        ...(appointment.toObject?.() || appointment),
        locationSnapshot: appointment.locationSnapshot || profile.location,
      },
      profile.professionalName || profile.businessName || 'Barbería'
    )
    await enqueue({
      appointment,
      recipientRole: 'client',
      phone: appointment.clientSnapshot.phone,
      templateName:
        status === 'confirmed'
          ? process.env.WHATSAPP_TEMPLATE_CONFIRMED_CLIENT
          : process.env.WHATSAPP_TEMPLATE_CANCELLED_CLIENT,
      parameters: params,
      dedupeSuffix: `status:${status}:${appointment.statusHistory?.length || Date.now()}`,
    })
  } catch (err) {
    console.error('[whatsapp] no se pudo preparar el aviso de estado:', err.code || 'error')
  }
}

async function sendCloudTemplate(job) {
  const endpoint = `https://graph.facebook.com/${process.env.WHATSAPP_GRAPH_API_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: job.recipientPhone,
      type: 'template',
      template: {
        name: job.templateName,
        language: { code: job.language },
        components: [
          {
            type: 'body',
            parameters: job.parameters.map((text) => ({ type: 'text', text: String(text || '—') })),
          },
        ],
      },
    }),
    signal: AbortSignal.timeout(12000),
  })
  if (!response.ok) {
    const error = new Error('WhatsApp Cloud API rechazó el mensaje')
    error.code = `HTTP_${response.status}`
    throw error
  }
}

/** Procesa mensajes pendientes de manera exclusiva entre varias instancias. */
export async function processWhatsAppOutbox({ now = new Date(), limit = 10 } = {}) {
  if (!isWhatsAppConfigured()) return { processed: 0, disabled: true }
  let processed = 0
  for (let count = 0; count < limit; count += 1) {
    const staleBefore = new Date(now.getTime() - STALE_CLAIM_MS)
    const candidate = await WhatsAppOutbox.findOne({
      $or: [
        { status: 'pending', scheduledAt: { $lte: now }, attempts: { $lt: MAX_ATTEMPTS } },
        { status: 'sending', claimedAt: { $lte: staleBefore } },
      ],
    }).sort({ scheduledAt: 1, _id: 1 }).lean()
    if (!candidate) break

    if (candidate.status === 'sending' && candidate.attempts >= MAX_ATTEMPTS) {
      await WhatsAppOutbox.updateOne(
        { _id: candidate._id, status: 'sending', claimedAt: candidate.claimedAt },
        { $set: { status: 'failed', claimedAt: null, lastErrorCode: 'MAX_ATTEMPTS' } }
      )
      processed += 1
      continue
    }

    const claimFilter = candidate.status === 'pending'
      ? { _id: candidate._id, status: 'pending' }
      : { _id: candidate._id, status: 'sending', claimedAt: candidate.claimedAt }
    const claimed = await WhatsAppOutbox.findOneAndUpdate(
      claimFilter,
      { $set: { status: 'sending', claimedAt: now }, $inc: { attempts: 1 } },
      { new: true }
    )
    if (!claimed) continue

    if (claimed.templateName === process.env.WHATSAPP_TEMPLATE_REMINDER_CLIENT) {
      const appointment = await Appointment.findById(claimed.appointment).select('status startUtc').lean()
      if (!appointment || ['cancelled', 'completed', 'no_show'].includes(appointment.status) || appointment.startUtc <= now) {
        await WhatsAppOutbox.updateOne({ _id: claimed._id, status: 'sending' }, { $set: { status: 'cancelled', claimedAt: null } })
        processed += 1
        continue
      }
      if (appointment.status !== 'confirmed') {
        await WhatsAppOutbox.updateOne(
          { _id: claimed._id, status: 'sending' },
          { $set: { status: 'pending', scheduledAt: new Date(now.getTime() + 60_000), claimedAt: null } }
        )
        processed += 1
        continue
      }
    }

    try {
      await transport(claimed)
      await WhatsAppOutbox.updateOne(
        { _id: claimed._id, status: 'sending' },
        { $set: { status: 'sent', sentAt: new Date(), claimedAt: null, lastErrorCode: '' } }
      )
    } catch (err) {
      const permanentHttpError = /^HTTP_4(?!29\b)\d{2}$/.test(String(err?.code || ''))
      const failedPermanently = claimed.attempts >= MAX_ATTEMPTS || permanentHttpError
      const backoffMs = Math.min(60 * 60 * 1000, 60 * 1000 * 2 ** claimed.attempts)
      await WhatsAppOutbox.updateOne(
        { _id: claimed._id, status: 'sending' },
        {
          $set: {
            status: failedPermanently ? 'failed' : 'pending',
            scheduledAt: new Date(now.getTime() + backoffMs),
            claimedAt: null,
            lastErrorCode: String(err?.code || 'SEND_ERROR').slice(0, 40),
          },
        }
      )
    }
    processed += 1
  }
  return { processed, disabled: false }
}
