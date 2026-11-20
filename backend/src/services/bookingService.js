/*
  Servicio de reservas: la ÚNICA puerta para consultar disponibilidad y crear
  citas desde fuera del panel del dueño.

  Lo usan dos consumidores:
  1) La reserva pública (`/api/public/booking/:slug`) que ve el navegador.
  2) El agente de IA (WhatsApp / modo prueba), que agenda conversando.

  Tener la lógica en un solo lugar garantiza que el bot respete exactamente
  las mismas reglas que la web: horario del dueño, descansos, margen de
  cambio de turno, huecos en el pasado y concurrencia atómica.

  La autorización sigue siendo la misma: el dueño SIEMPRE se deduce del slug
  del perfil, nunca de un id que mande el cliente.
*/
import mongoose from 'mongoose'

import { Profile } from '../models/Profile.js'
import { Service } from '../models/Service.js'
import { Schedule } from '../models/Schedule.js'
import { Appointment } from '../models/Appointment.js'
import { Client, normalizePhone } from '../models/Client.js'
import { Notification } from '../models/Notification.js'
import { User } from '../models/User.js'

import {
  computeAvailability,
  AvailabilityError,
  isValidDate,
  dayKeyFromDate,
} from '../utils/availability.js'
import {
  STEP_MINUTES,
  occupiedSlotKeys,
  busyRangesFromAppointments,
  expandBusyRanges,
  isSlotInPast,
  filterPastSlots,
  DEFAULT_BUFFER_MINUTES,
} from '../utils/booking.js'
import { timeToMinutes } from '../utils/scheduleValidation.js'
import { wallClockToUtc, utcToWallClock } from '../utils/timezone.js'
import { sendBookingEmail } from '../utils/mailer.js'
import { getWhatsAppCapabilities, queueBookingWhatsApp } from './whatsappCloud.js'

/**
 * Error de negocio del servicio. El controlador lo traduce a HTTP; el agente
 * lo convierte en una frase para el cliente.
 */
export class BookingError extends Error {
  constructor(status, message, { code = null, errors = null } = {}) {
    super(message)
    this.name = 'BookingError'
    this.status = status
    this.code = code
    this.errors = errors
  }
}

/** Carga el perfil público (solo si el onboarding está completado). */
export async function loadBookableProfile(slug) {
  if (typeof slug !== 'string' || !/^[a-z0-9-]{1,80}$/.test(slug)) return null
  return Profile.findOne({ slug, completedAt: { $ne: null } })
}

/** Datos públicos mínimos del perfil para la página de reserva. */
export function publicProfileData(profile) {
  return {
    name: profile.professionalName || profile.businessName,
    type: profile.type,
    photoUrl: profile.photoUrl || profile.logoUrl || null,
    location: profile.location || null,
    phone: profile.phone || null,
    timezone: null, // se completa con el schedule en el endpoint de disponibilidad
    whatsappUpdatesAvailable: getWhatsAppCapabilities().clientUpdates,
  }
}

/**
 * Perfil + servicios activos para reservar.
 * Lanza 404 si el perfil no acepta reservas.
 */
export async function getBookingInfo(slug) {
  const profile = await loadBookableProfile(slug)
  if (!profile) {
    throw new BookingError(404, 'Este perfil no acepta reservas en línea', {
      code: 'PROFILE_NOT_BOOKABLE',
    })
  }

  const services = await Service.find({ owner: profile.owner, isActive: true })
    .sort({ durationMinutes: 1, name: 1 })
    .select('name description price durationMinutes bufferMinutes')

  return { profile, services }
}

/**
 * Disponibilidad real de un día para un servicio.
 * Devuelve también `profile` y `service` para que el agente pueda responder
 * con nombre de negocio, precio y duración.
 */
export async function getAvailability({ slug, serviceId, date }) {
  const profile = await loadBookableProfile(slug)
  if (!profile) {
    throw new BookingError(404, 'Este perfil no acepta reservas en línea', {
      code: 'PROFILE_NOT_BOOKABLE',
    })
  }

  if (!isValidDate(date)) {
    throw new BookingError(422, 'Fecha inválida', {
      code: 'INVALID_DATE',
      errors: [{ path: 'date', message: 'Usa una fecha real en formato YYYY-MM-DD' }],
    })
  }
  if (typeof serviceId !== 'string' || !mongoose.Types.ObjectId.isValid(serviceId)) {
    throw new BookingError(400, 'Identificador de servicio inválido', {
      code: 'INVALID_SERVICE_ID',
    })
  }

  // El servicio debe pertenecer al dueño del perfil y estar ACTIVO.
  const service = await Service.findOne({
    _id: serviceId,
    owner: profile.owner,
    isActive: true,
  })
  if (!service) {
    throw new BookingError(404, 'Este servicio no está disponible', {
      code: 'SERVICE_NOT_AVAILABLE',
    })
  }

  const schedule = await Schedule.findOne({ owner: profile.owner })
  const timezone = schedule?.timezone || 'America/Bogota'
  const day = schedule?.days?.[dayKeyFromDate(date)]

  // Citas que ya ocupan espacio (pending/confirmed) en esa fecha.
  const existing = await Appointment.find({
    owner: profile.owner,
    date,
    status: { $in: ['pending', 'confirmed'] },
  }).select('startMinutes endMinutes')

  const theoretical = computeAvailability({
    date,
    timezone,
    day,
    durationMinutes: service.durationMinutes,
    stepMinutes: STEP_MINUTES,
  })
  // El margen de cambio de turno rodea cada cita existente: dentro de ese
  // aire no se ofrece ningún inicio.
  const busyRanges = expandBusyRanges(
    busyRangesFromAppointments(existing),
    service.bufferMinutes
  )
  const free = busyRanges.length
    ? theoretical.filter(
        (s) =>
          !busyRanges.some(
            (b) => s.startMinutes < b.endMinutes && b.startMinutes < s.endMinutes
          )
      )
    : theoretical

  // Quita los huecos de HOY que ya quedaron en el pasado.
  const reservable = filterPastSlots(free, date, timezone)

  return {
    profile,
    service,
    payload: {
      date,
      timezone,
      durationMinutes: service.durationMinutes,
      bufferMinutes: service.bufferMinutes ?? DEFAULT_BUFFER_MINUTES,
      stepMinutes: STEP_MINUTES,
      slots: reservable.map((s) => ({ start: s.start, end: s.end })),
    },
  }
}

/**
 * Crea una cita.
 *
 * El hueco se VUELVE a calcular aquí (nunca se confía en quien llama). Si
 * otra persona lo tomó entre la consulta y el envío, se lanza 409.
 *
 * `source` distingue el origen ('agent' para el bot). Las notificaciones y el
 * correo al dueño son best-effort: si fallan, la cita sigue siendo válida.
 */
export async function createBooking({
  slug,
  serviceId,
  date,
  start,
  name,
  phone,
  whatsappOptIn = false,
  source = 'public',
}) {
  const profile = await loadBookableProfile(slug)
  if (!profile) {
    throw new BookingError(404, 'Este perfil no acepta reservas en línea', {
      code: 'PROFILE_NOT_BOOKABLE',
    })
  }

  // --- Validaciones de entrada ---
  if (typeof serviceId !== 'string' || !mongoose.Types.ObjectId.isValid(serviceId)) {
    throw new BookingError(400, 'Identificador de servicio inválido', {
      code: 'INVALID_SERVICE_ID',
    })
  }
  if (!isValidDate(date)) {
    throw new BookingError(422, 'Fecha inválida', {
      code: 'INVALID_DATE',
      errors: [{ path: 'date', message: 'Usa una fecha real en formato YYYY-MM-DD' }],
    })
  }
  if (typeof start !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(start)) {
    throw new BookingError(422, 'Hora inválida', {
      code: 'INVALID_TIME',
      errors: [{ path: 'start', message: 'Usa una hora en formato HH:MM' }],
    })
  }
  const cleanName = typeof name === 'string' ? name.trim() : ''
  if (cleanName.length < 2 || cleanName.length > 120) {
    throw new BookingError(422, 'El nombre es obligatorio', {
      code: 'INVALID_NAME',
      errors: [{ path: 'name', message: 'El nombre debe tener entre 2 y 120 caracteres' }],
    })
  }
  const cleanPhone = typeof phone === 'string' ? phone.trim() : ''
  const phoneDigits = normalizePhone(cleanPhone)
  if (phoneDigits.length < 7 || phoneDigits.length > 15) {
    throw new BookingError(422, 'El teléfono es obligatorio', {
      code: 'INVALID_PHONE',
      errors: [{ path: 'phone', message: 'El teléfono debe tener entre 7 y 15 dígitos' }],
    })
  }

  // --- Servicio activo y perteneciente al dueño ---
  const service = await Service.findOne({
    _id: serviceId,
    owner: profile.owner,
    isActive: true,
  })
  if (!service) {
    throw new BookingError(404, 'Este servicio no está disponible', {
      code: 'SERVICE_NOT_AVAILABLE',
    })
  }

  // --- Horario del dueño y zona horaria ---
  const schedule = await Schedule.findOne({ owner: profile.owner })
  const timezone = schedule?.timezone || 'America/Bogota'
  const day = schedule?.days?.[dayKeyFromDate(date)]

  // --- Recalcular la disponibilidad COMPLETA en el servidor ---
  const theoretical = computeAvailability({
    date,
    timezone,
    day,
    durationMinutes: service.durationMinutes,
    stepMinutes: STEP_MINUTES,
  })
  const startMinutes = timeToMinutes(start)
  const requested = theoretical.find((s) => s.startMinutes === startMinutes)

  if (!requested) {
    throw new BookingError(409, 'Ese horario ya no está disponible. Elige otro.', {
      code: 'SLOT_UNAVAILABLE',
    })
  }

  // --- El hueco no puede haber quedado en el pasado ---
  if (isSlotInPast({ date, start, timezone })) {
    throw new BookingError(422, 'Ese horario ya pasó. Elige una fecha y hora futuras.', {
      code: 'SLOT_IN_PAST',
    })
  }

  // --- Descontar citas existentes (con el margen de cambio de turno) ---
  const existing = await Appointment.find({
    owner: profile.owner,
    date,
    status: { $in: ['pending', 'confirmed'] },
  }).select('startMinutes endMinutes')
  const bufferMinutes = service.bufferMinutes ?? DEFAULT_BUFFER_MINUTES
  const busyRanges = expandBusyRanges(busyRangesFromAppointments(existing), bufferMinutes)
  const stillFree = !busyRanges.some(
    (b) => requested.startMinutes < b.endMinutes && b.startMinutes < requested.endMinutes
  )
  if (!stillFree) {
    throw new BookingError(409, 'Ese horario ya fue reservado. Elige otro.', {
      code: 'SLOT_UNAVAILABLE',
    })
  }

  // --- Cliente (deduplicado por teléfono dentro del dueño) ---
  let client = await Client.findOne({ owner: profile.owner, phoneNormalized: phoneDigits })
  if (!client) {
    client = await Client.create({
      owner: profile.owner,
      name: cleanName,
      phone: cleanPhone,
      phoneNormalized: phoneDigits,
    })
  } else if (client.name !== cleanName) {
    client.name = cleanName
    await client.save()
  }

  // --- Instantes UTC (la zona del dueño, no la del servidor) ---
  const startUtc = wallClockToUtc(date, requested.start, timezone)
  const endUtc = wallClockToUtc(date, requested.end, timezone)

  // --- Claves de slot que bloquea esta cita (incluye el margen) ---
  const occupied = occupiedSlotKeys(
    date,
    requested.startMinutes,
    service.durationMinutes + bufferMinutes,
    STEP_MINUTES
  )

  // --- INSERT: el índice único parcial es el guardián de la concurrencia ---
  let appointment
  try {
    appointment = await Appointment.create({
      owner: profile.owner,
      client: client._id,
      service: service._id,
      serviceSnapshot: {
        name: service.name,
        price: service.price,
        durationMinutes: service.durationMinutes,
      },
      clientSnapshot: {
        name: cleanName,
        phone: cleanPhone,
        whatsappOptIn: whatsappOptIn === true,
      },
      locationSnapshot: profile.location || '',
      date,
      timezone,
      localStart: requested.start,
      localEnd: requested.end,
      startMinutes: requested.startMinutes,
      endMinutes: requested.endMinutes,
      startUtc,
      endUtc,
      occupiedSlots: occupied,
      status: 'pending',
      source,
      statusHistory: [{ status: 'pending', at: new Date(), by: null }],
    })
  } catch (err) {
    if (err?.code === 11000) {
      throw new BookingError(
        409,
        'Ese horario acaba de ser reservado por otra persona. Elige otro.',
        { code: 'SLOT_TAKEN' }
      )
    }
    throw err
  }

  await notifyOwnerOfBooking({ appointment, service, clientName: cleanName })
  await queueBookingWhatsApp(appointment)

  return { appointment, service }
}

/**
 * Avisos al dueño: notificación interna + correo. Ambos best-effort, con su
 * propio try/catch: un fallo aquí nunca invalida la cita ya creada.
 */
async function notifyOwnerOfBooking({ appointment, service, clientName }) {
  try {
    const w = utcToWallClock(appointment.startUtc.getTime(), appointment.timezone)
    const fecha = `${w.year}-${String(w.month).padStart(2, '0')}-${String(w.day).padStart(2, '0')}`
    const hora = `${String(w.hour).padStart(2, '0')}:${String(w.minute).padStart(2, '0')}`

    await Notification.create({
      owner: appointment.owner,
      type: 'booking_created',
      appointment: appointment._id,
      title: 'Nueva reserva',
      message: `${clientName} reservó "${service.name}" para el ${fecha} a las ${hora} (${appointment.timezone}).`,
      dedupeKey: `booking_created:${appointment._id}`,
    })
  } catch (err) {
    // 11000 = clave duplicada: la notificación ya existe; no es un error.
    if (err?.code !== 11000) {
      console.error('[notificaciones] no se pudo crear la notificación de reserva:', err)
    }
  }

  try {
    const ownerUser = await User.findById(appointment.owner).select('email name')
    const mailResult = await sendBookingEmail({
      ownerEmail: ownerUser?.email,
      ownerName: ownerUser?.name,
      clientName,
      service: {
        name: service.name,
        price: service.price,
        durationMinutes: service.durationMinutes,
      },
      startUtc: appointment.startUtc,
      timezone: appointment.timezone,
    })

    if (mailResult.error) {
      console.error('[mailer] no se pudo enviar el correo de reserva:', mailResult.error)
    }
  } catch (err) {
    console.error('[mailer] error inesperado enviando el correo de reserva:', err)
  }
}
