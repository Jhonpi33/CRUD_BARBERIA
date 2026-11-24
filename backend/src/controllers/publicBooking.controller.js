/*
  Reserva pública (`/api/public/booking/:slug`).

  La lógica vive en `services/bookingService.js` porque el agente de IA usa
  exactamente la misma. Este controlador solo valida la forma de la petición
  HTTP y da formato a la respuesta.
*/
import {
  getBookingInfo,
  getAvailability,
  createBooking,
  publicProfileData,
  BookingError,
} from '../services/bookingService.js'
import { AvailabilityError } from '../utils/availability.js'

/** Traduce un error de negocio a su respuesta HTTP. Devuelve true si ya respondió. */
function respondError(res, err) {
  if (err instanceof BookingError) {
    const body = { message: err.message }
    if (err.code) body.code = err.code
    if (err.errors) body.errors = err.errors
    res.status(err.status).json(body)
    return true
  }
  if (err instanceof AvailabilityError) {
    res.status(422).json({
      message: err.message,
      errors: [{ path: 'date', message: err.message }],
    })
    return true
  }
  return false
}

/**
 * GET /api/public/booking/:slug
 * Devuelve el perfil y sus servicios ACTIVOS para reservar.
 * No expone datos privados (ni email, ni config interna, ni servicios inactivos).
 */
export async function getPublicBookingInfo(req, res, next) {
  try {
    const { profile, services } = await getBookingInfo(req.params.slug)
    res.json({ profile: await publicProfileData(profile), services })
  } catch (err) {
    if (respondError(res, err)) return
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
    const { payload } = await getAvailability({
      slug: req.params.slug,
      serviceId,
      date,
    })
    res.json(payload)
  } catch (err) {
    if (respondError(res, err)) return
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
    const { serviceId, date, start, name, phone, whatsappOptIn = false } = req.body
    const { appointment } = await createBooking({
      slug: req.params.slug,
      serviceId,
      date,
      start,
      name,
      phone,
      whatsappOptIn,
      source: 'public',
    })

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
    if (respondError(res, err)) return
    next(err)
  }
}
