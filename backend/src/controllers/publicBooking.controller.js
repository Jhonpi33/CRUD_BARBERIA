import mongoose from 'mongoose'

import { Profile } from '../models/Profile.js'
import { Service } from '../models/Service.js'
import { Schedule } from '../models/Schedule.js'
import { Appointment } from '../models/Appointment.js'
import { Client, normalizePhone } from '../models/Client.js'
import { Notification } from '../models/Notification.js'

import { computeAvailability, AvailabilityError, isValidDate, dayKeyFromDate } from '../utils/availability.js'
import { STEP_MINUTES, occupiedSlotKeys, busyRangesFromAppointments } from '../utils/booking.js'
import { timeToMinutes } from '../utils/scheduleValidation.js'
import { wallClockToUtc, utcToWallClock } from '../utils/timezone.js'

/**
 * Política de autorización de la Fase 5 para reservar:
 * PÚBLICA Y EXPLÍCITA. Cualquier visitante puede reservar desde el enlace
 * /u/:slug (perfil completado). NO se acepta ningún dato del dueño desde el
 * body: el dueño se deduce SIEMPRE del slug del perfil.
 *
 * Toda la disponibilidad se recalcula en el servidor. El navegador solo
 * propone; el backend decide si el hueco existe y está libre.
 */

/** Carga el perfil público (solo si el onboarding está completado). */
async function loadProfileBySlug(slug) {
  if (typeof slug !== 'string' || !/^[a-z0-9-]{1,80}$/.test(slug)) return null
  return Profile.findOne({ slug, completedAt: { $ne: null } })
}

/** Datos públicos mínimos del perfil para la página de reserva. */
function publicProfileData(profile) {
  return {
    name: profile.professionalName || profile.businessName,
    type: profile.type,
    photoUrl: profile.photoUrl || profile.logoUrl || null,
    location: profile.location || null,
    phone: profile.phone || null,
    timezone: null, // se completa con el schedule en el endpoint de disponibilidad
  }
}

/**
 * GET /api/public/booking/:slug
 * Devuelve el perfil y sus servicios ACTIVOS para reservar.
 * No expone datos privados (ni email, ni config interna, ni servicios inactivos).
 */
export async function getPublicBookingInfo(req, res, next) {
  try {
    const profile = await loadProfileBySlug(req.params.slug)
    if (!profile) {
      return res.status(404).json({ message: 'Este perfil no acepta reservas en línea' })
    }

    const services = await Service.find({ owner: profile.owner, isActive: true })
      .sort({ durationMinutes: 1, name: 1 })
      .select('name description price durationMinutes')

    res.json({
      profile: publicProfileData(profile),
      services,
    })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/public/booking/:slug/availability?serviceId=...&date=YYYY-MM-DD
 * Disponibilidad real (recalculada aquí) descontando las citas existentes.
 */
export async function getPublicAvailability(req, res, next) {
  try {
    const { serviceId, date } = req.query

    const profile = await loadProfileBySlug(req.params.slug)
    if (!profile) {
      return res.status(404).json({ message: 'Este perfil no acepta reservas en línea' })
    }

    if (!isValidDate(date)) {
      return res.status(422).json({
        message: 'Fecha inválida',
        errors: [{ path: 'date', message: 'Usa una fecha real en formato YYYY-MM-DD' }],
      })
    }
    if (typeof serviceId !== 'string' || !mongoose.Types.ObjectId.isValid(serviceId)) {
      return res.status(400).json({ message: 'Identificador de servicio inválido' })
    }

    // El servicio debe pertenecer al dueño del perfil y estar ACTIVO.
    const service = await Service.findOne({
      _id: serviceId,
      owner: profile.owner,
      isActive: true,
    })
    if (!service) {
      return res.status(404).json({ message: 'Este servicio no está disponible' })
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
    const busyRanges = busyRangesFromAppointments(existing)
    const free = busyRanges.length
      ? theoretical.filter(
          (s) =>
            !busyRanges.some(
              (b) => s.startMinutes < b.endMinutes && b.startMinutes < s.endMinutes
            )
        )
      : theoretical

    res.json({
      date,
      timezone,
      durationMinutes: service.durationMinutes,
      stepMinutes: STEP_MINUTES,
      slots: free.map((s) => ({ start: s.start, end: s.end })),
    })
  } catch (err) {
    if (err instanceof AvailabilityError) {
      return res.status(422).json({
        message: err.message,
        errors: [{ path: 'date', message: err.message }],
      })
    }
    next(err)
  }
}

/**
 * POST /api/public/booking/:slug
 * Crea la cita. Body: { serviceId, date, start, name, phone }.
 *
 * El hueco se VUELVE a calcular en el servidor (nunca se confía en el
 * navegador). Si otra persona lo tomó entre que se pintó la página y se
 * envió el formulario, se responde 409 con una lista nueva de huecos libres.
 */
export async function createPublicBooking(req, res, next) {
  try {
    const { serviceId, date, start, name, phone } = req.body

    const profile = await loadProfileBySlug(req.params.slug)
    if (!profile) {
      return res.status(404).json({ message: 'Este perfil no acepta reservas en línea' })
    }

    // --- Validaciones de entrada ---
    if (typeof serviceId !== 'string' || !mongoose.Types.ObjectId.isValid(serviceId)) {
      return res.status(400).json({ message: 'Identificador de servicio inválido' })
    }
    if (!isValidDate(date)) {
      return res.status(422).json({
        message: 'Fecha inválida',
        errors: [{ path: 'date', message: 'Usa una fecha real en formato YYYY-MM-DD' }],
      })
    }
    if (typeof start !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(start)) {
      return res.status(422).json({
        message: 'Hora inválida',
        errors: [{ path: 'start', message: 'Usa una hora en formato HH:MM' }],
      })
    }
    const cleanName = typeof name === 'string' ? name.trim() : ''
    if (cleanName.length < 2 || cleanName.length > 120) {
      return res.status(422).json({
        message: 'El nombre es obligatorio',
        errors: [{ path: 'name', message: 'El nombre debe tener entre 2 y 120 caracteres' }],
      })
    }
    const cleanPhone = typeof phone === 'string' ? phone.trim() : ''
    const phoneDigits = normalizePhone(cleanPhone)
    if (phoneDigits.length < 7 || phoneDigits.length > 15) {
      return res.status(422).json({
        message: 'El teléfono es obligatorio',
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
      return res.status(404).json({ message: 'Este servicio no está disponible' })
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
      return res.status(409).json({
        code: 'SLOT_UNAVAILABLE',
        message: 'Ese horario ya no está disponible. Elige otro.',
      })
    }

    // --- Descontar citas existentes ---
    const existing = await Appointment.find({
      owner: profile.owner,
      date,
      status: { $in: ['pending', 'confirmed'] },
    }).select('startMinutes endMinutes')
    const busyRanges = busyRangesFromAppointments(existing)
    const stillFree = !busyRanges.some(
      (b) => requested.startMinutes < b.endMinutes && b.startMinutes < requested.endMinutes
    )
    if (!stillFree) {
      return res.status(409).json({
        code: 'SLOT_UNAVAILABLE',
        message: 'Ese horario ya fue reservado. Elige otro.',
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
      // Actualiza el nombre si cambió, sin duplicar el cliente.
      client.name = cleanName
      await client.save()
    }

    // --- Instantes UTC (la zona del dueño, no la del servidor) ---
    const startUtc = wallClockToUtc(date, requested.start, timezone)
    const endUtc = wallClockToUtc(date, requested.end, timezone)

    // --- Claves de slot que bloquea esta cita ---
    const occupied = occupiedSlotKeys(date, requested.startMinutes, service.durationMinutes, STEP_MINUTES)

    // --- INSERT: el índice único parcial es el guardián de la concurrencia.
    // Si otra persona tomó el mismo hueco en paralelo, MongoDB lanza
    // DuplicateKeyError y respondemos 409.
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
        clientSnapshot: { name: cleanName, phone: cleanPhone },
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
        source: 'public',
        statusHistory: [{ status: 'pending', at: new Date(), by: null }],
      })
    } catch (err) {
      if (err?.code === 11000) {
        return res.status(409).json({
          code: 'SLOT_TAKEN',
          message: 'Ese horario acaba de ser reservado por otra persona. Elige otro.',
        })
      }
      throw err
    }

    // --- Notificación interna del panel (best-effort) ---
    // Se crea DESPUÉS de la cita y dentro de su propio try/catch: si falla,
    // solo se registra el error y la reserva sigue siendo válida. El
    // dedupeKey (type:appointmentId) con índice único evita duplicados si
    // este bloque se ejecutara dos veces para la misma cita.
    try {
      const w = utcToWallClock(appointment.startUtc.getTime(), appointment.timezone)
      const fecha = `${w.year}-${String(w.month).padStart(2, '0')}-${String(w.day).padStart(2, '0')}`
      const hora = `${String(w.hour).padStart(2, '0')}:${String(w.minute).padStart(2, '0')}`

      await Notification.create({
        owner: appointment.owner,
        type: 'booking_created',
        appointment: appointment._id,
        title: 'Nueva reserva',
        message: `${cleanName} reservó "${service.name}" para el ${fecha} a las ${hora} (${appointment.timezone}).`,
        dedupeKey: `booking_created:${appointment._id}`,
      })
    } catch (err) {
      // 11000 = clave duplicada: la notificación ya existe; no es un error.
      if (err?.code !== 11000) {
        console.error('[notificaciones] no se pudo crear la notificación de reserva:', err)
      }
    }

    // Respuesta PÚBLICA: sin datos internos del dueño.
    res.status(201).json({
      appointment: {
        id: appointment._id,
        date: appointment.date,
        start: appointment.localStart,
        end: appointment.localEnd,
        timezone: appointment.timezone,
        status: appointment.status,
        service: appointment.serviceSnapshot,
        clientName: appointment.clientSnapshot.name,
      },
      message: 'Reserva recibida. Recibirás la confirmación.',
    })
  } catch (err) {
    next(err)
  }
}
