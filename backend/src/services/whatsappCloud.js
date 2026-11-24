import { WhatsAppOutbox } from '../models/WhatsAppOutbox.js'
import { Appointment } from '../models/Appointment.js'
import { Profile } from '../models/Profile.js'
import { normalizePhone } from '../models/Client.js'
import { findLinkedWhatsApp, isOpenWAConfigured, sendOpenWANotice, whatsappNumber } from './openWhatsApp.js'

const MAX_ATTEMPTS = 5
const STALE_CLAIM_MS = 2 * 60 * 1000
const REMINDER_MS = 3 * 60 * 60 * 1000
const OPENWA_SAFE_RETRY_MS = 23 * 60 * 60 * 1000

let transport = sendCloudTemplate

export function isWhatsAppConfigured(env = process.env) {
  return isOpenWAConfigured(env) || isCloudConfigured(env)
}

function isCloudConfigured(env) {
  return (!env.WHATSAPP_PROVIDER || env.WHATSAPP_PROVIDER === 'cloud') && Boolean(
    env.WHATSAPP_ACCESS_TOKEN &&
      env.WHATSAPP_PHONE_NUMBER_ID &&
      /^v\d+\.\d+$/.test(env.WHATSAPP_GRAPH_API_VERSION || '')
  )
}

export function getWhatsAppCapabilities(env = process.env) {
  const configured = isCloudConfigured(env)
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

export async function getOwnerWhatsAppCapabilities(owner) {
  if (!isOpenWAConfigured()) return getWhatsAppCapabilities()
  const linked = Boolean(await findLinkedWhatsApp(owner))
  return { configured: true, barberAlerts: linked, clientUpdates: linked, pairingAvailable: true }
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

async function enqueue({ appointment, recipientRole, phone, templateName, parameters, dedupeSuffix, scheduledAt = new Date(), connection }) {
  const event = dedupeSuffix.startsWith('status:') ? dedupeSuffix.split(':').slice(0, 2).join(':') : dedupeSuffix
  const to = connection ? whatsappNumber(phone) : recipientNumber(phone)
  if (!connection && !templateName) return false
  if (!to) return false

  try {
    await WhatsAppOutbox.updateOne(
      { dedupeKey: `${appointment._id}:${dedupeSuffix}` },
      {
        $setOnInsert: {
          appointment: appointment._id,
          recipientRole,
          recipientPhone: to,
          templateName: connection ? event : templateName,
          ...(connection && { openwaSessionId: connection.sessionId, openwaPhone: connection.linkedPhone }),
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
    const connection = await findLinkedWhatsApp(appointment.owner)
    if (isOpenWAConfigured() && !connection) return
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
        connection,
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
        connection,
        recipientRole: 'client',
        phone: appointment.clientSnapshot.phone,
        templateName: process.env.WHATSAPP_TEMPLATE_BOOKING_CLIENT,
        parameters: params,
        dedupeSuffix: 'booking:client',
      })

      const reminderAt = new Date(Math.max(Date.now(), appointment.startUtc.getTime() - REMINDER_MS))
      await enqueue({
        appointment,
        connection,
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
          dedupeKey: `${appointment._id}:reminder:3h`,
          status: 'pending',
        },
        { $set: { status: 'cancelled' } }
      )
    }
    if (!appointment.clientSnapshot?.whatsappOptIn) return
    const connection = await findLinkedWhatsApp(appointment.owner)
    if (isOpenWAConfigured() && !connection) return
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
      connection,
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
  const useOpenWA = isOpenWAConfigured()
  let processed = 0
  for (let count = 0; count < limit; count += 1) {
    const staleBefore = new Date(now.getTime() - STALE_CLAIM_MS)
    const candidate = await WhatsAppOutbox.findOne({
      openwaSessionId: useOpenWA ? { $type: 'string' } : null,
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
      ? { _id: candidate._id, status: 'pending', scheduledAt: candidate.scheduledAt, attempts: candidate.attempts }
      : { _id: candidate._id, status: 'sending', claimedAt: candidate.claimedAt }
    const claimed = await WhatsAppOutbox.findOneAndUpdate(
      claimFilter,
      { $set: { status: 'sending', claimedAt: now }, $inc: { attempts: 1 } },
      { new: true }
    )
    if (!claimed) continue

    const claimIdentity = { _id: claimed._id, status: 'sending', claimedAt: now }
    const isReminder = claimed.dedupeKey.endsWith(':reminder:3h')
    const appointment = isReminder || useOpenWA
      ? await Appointment.findById(claimed.appointment).select('owner status startUtc').lean()
      : null
    if (isReminder) {
      if (!appointment || ['cancelled', 'completed', 'no_show'].includes(appointment.status) || appointment.startUtc <= now) {
        await WhatsAppOutbox.updateOne(claimIdentity, { $set: { status: 'cancelled', claimedAt: null } })
        processed += 1
        continue
      }
      if (appointment.status !== 'confirmed') {
        await WhatsAppOutbox.updateOne(
          claimIdentity,
          { $set: { status: 'pending', scheduledAt: new Date(now.getTime() + 60_000), claimedAt: null }, $inc: { attempts: -1 } }
        )
        processed += 1
        continue
      }
    }

    if (useOpenWA && (!appointment || (claimed.templateName !== 'status:cancelled' && (
      appointment.startUtc <= now || ['cancelled', 'completed', 'no_show'].includes(appointment.status)
    )))) {
      await WhatsAppOutbox.updateOne(claimIdentity, { $set: { status: 'cancelled', claimedAt: null } })
      processed += 1
      continue
    }

    try {
      if (useOpenWA) {
        if (claimed.firstDeliveryAttemptAt && now - claimed.firstDeliveryAttemptAt >= OPENWA_SAFE_RETRY_MS) {
          throw Object.assign(new Error('Venció la protección contra duplicados de OpenWA'), { code: 'OPENWA_RETRY_EXPIRED', permanent: true })
        }
        if (!claimed.firstDeliveryAttemptAt) {
          const saved = await WhatsAppOutbox.updateOne(claimIdentity, { $set: { firstDeliveryAttemptAt: now } })
          if (!saved.matchedCount) continue
        }
        if (claimed.recipientRole === 'barber') {
          const profile = await Profile.findOne({ owner: appointment.owner, whatsappNotificationsEnabled: true }).select('phone').lean()
          if (whatsappNumber(profile?.phone) !== claimed.recipientPhone) {
            await WhatsAppOutbox.updateOne(claimIdentity, { $set: { status: 'cancelled', claimedAt: null } })
            processed += 1
            continue
          }
        }
        await sendOpenWANotice(claimed, appointment.owner)
      } else {
        await transport(claimed)
      }
      await WhatsAppOutbox.updateOne(
        claimIdentity,
        { $set: { status: 'sent', sentAt: new Date(), claimedAt: null, lastErrorCode: '' } }
      )
    } catch (err) {
      const permanentHttpError = /^(?:OPENWA_)?HTTP_4(?!08\b|09\b|29\b)\d{2}$/.test(String(err?.code || ''))
      const unsafeToRetry = ['IDEMPOTENCY_OUTCOME_UNKNOWN', 'IDEMPOTENCY_KEY_REUSED'].includes(err?.code)
      const failedPermanently = claimed.attempts >= MAX_ATTEMPTS || permanentHttpError || unsafeToRetry || err?.permanent
      const backoffMs = Math.min(60 * 60 * 1000, 60 * 1000 * 2 ** claimed.attempts)
      await WhatsAppOutbox.updateOne(
        claimIdentity,
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
