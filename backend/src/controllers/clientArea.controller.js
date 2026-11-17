/*
  Área del cliente (rol `client`).

  Un cliente no tiene agenda ni servicios: solo ve LAS CITAS QUE ÉL MISMO
  reservó, en cualquier barbero o barbería.

  Cómo se emparejan: las reservas públicas NO piden cuenta (nombre + teléfono),
  así que el único hilo que une las citas con la cuenta es el TELÉFONO.
  Se normaliza a dígitos con la misma función que usa el directorio de
  clientes, de modo que "+57 300 111 2233" y "3001112233" son el mismo número.
*/
import { Appointment } from '../models/Appointment.js'
import { Client, normalizePhone } from '../models/Client.js'
import { Profile } from '../models/Profile.js'

/** Máximo de citas devueltas (historial reciente). */
const MAX_APPOINTMENTS = 200

/**
 * Últimos 10 dígitos del número.
 *
 * El mismo teléfono se escribe de mil formas ("+57 311 222 3344", "3112223344",
 * "573112223344"): comparando solo la cola del número, el indicativo del país
 * deja de importar.
 */
function phoneSuffix(digits) {
  return digits.length > 10 ? digits.slice(-10) : digits
}

/**
 * GET /api/client/appointments
 * Citas del cliente autenticado, de más reciente a más antigua.
 * Si la cuenta aún no tiene teléfono, responde `needsPhone: true` para que el
 * frontend lo pida (sin teléfono no hay forma de saber cuáles son sus citas).
 */
export async function myAppointments(req, res, next) {
  try {
    const digits = normalizePhone(req.user.phone)
    if (!digits) {
      return res.json({ needsPhone: true, appointments: [] })
    }

    // El mismo teléfono puede existir como cliente en varios negocios y
    // escrito con o sin indicativo: se compara por la cola del número.
    const suffix = phoneSuffix(digits)
    const clients = await Client.find({ phoneNormalized: new RegExp(`${suffix}$`) })
      .select('_id')
      .lean()
    if (clients.length === 0) {
      return res.json({ needsPhone: false, appointments: [] })
    }

    const appointments = await Appointment.find({
      client: { $in: clients.map((c) => c._id) },
    })
      .sort({ startUtc: -1 })
      .limit(MAX_APPOINTMENTS)
      .lean()

    if (appointments.length === 0) {
      return res.json({ needsPhone: false, appointments: [] })
    }

    // Datos públicos del negocio de cada cita (una sola consulta).
    const ownerIds = [...new Set(appointments.map((a) => String(a.owner)))]
    const profiles = await Profile.find({ owner: { $in: ownerIds } })
      .select('owner type slug professionalName businessName location')
      .lean()
    const profileByOwner = new Map(profiles.map((p) => [String(p.owner), p]))

    res.json({
      needsPhone: false,
      appointments: appointments.map((a) => {
        const p = profileByOwner.get(String(a.owner)) || null
        return {
          _id: a._id,
          date: a.date,
          localStart: a.localStart,
          localEnd: a.localEnd,
          status: a.status,
          service: {
            name: a.serviceSnapshot?.name || '',
            price: a.serviceSnapshot?.price ?? 0,
            durationMinutes: a.serviceSnapshot?.durationMinutes ?? 0,
          },
          business: p
            ? {
                name: p.professionalName || p.businessName || '',
                slug: p.slug || null,
                location: p.location || '',
                type: p.type,
              }
            : null,
        }
      }),
    })
  } catch (err) {
    next(err)
  }
}
