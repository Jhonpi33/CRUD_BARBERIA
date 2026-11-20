import mongoose from 'mongoose'

import { Client, normalizePhone } from '../models/Client.js'
import { Appointment } from '../models/Appointment.js'

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id)
}

/**
 * Resumen de citas por cliente, calculado en UNA sola agregación:
 *   { total, visits, spent, lastVisit, nextVisit }
 * Se agrupan las fechas con $push y se calcula en JS para no depender de la
 * semántica de $min/$max sobre valores null.
 */
async function appointmentsStatsByClient(ownerId) {
  const rows = await Appointment.aggregate([
    { $match: { owner: ownerId } },
    {
      $group: {
        _id: '$client',
        total: { $sum: 1 },
        visits: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        spent: {
          $sum: {
            $cond: [{ $eq: ['$status', 'completed'] }, '$serviceSnapshot.price', 0],
          },
        },
        rows: { $push: { status: '$status', start: '$startUtc' } },
      },
    },
  ])

  const now = Date.now()
  const byClient = new Map()
  for (const row of rows) {
    let lastVisit = null
    let nextVisit = null
    for (const { status, start } of row.rows) {
      if (!start) continue
      const t = new Date(start).getTime()
      if (status === 'completed' && (lastVisit === null || t > lastVisit)) lastVisit = t
      if (
        (status === 'pending' || status === 'confirmed') &&
        t >= now &&
        (nextVisit === null || t < nextVisit)
      ) {
        nextVisit = t
      }
    }
    byClient.set(String(row._id), {
      total: row.total,
      visits: row.visits,
      spent: row.spent,
      lastVisit: lastVisit === null ? null : new Date(lastVisit),
      nextVisit: nextVisit === null ? null : new Date(nextVisit),
    })
  }
  return byClient
}

/**
 * GET /api/clients — lista los clientes del dueño autenticado.
 * ?phone=... permite buscar por teléfono (normalizado, parcial por prefijo).
 * El filtro es SIEMPRE por el _id del token.
 *
 * Cada cliente viene con un resumen de sus citas (stats) para que la lista
 * del panel muestre visitas, última visita, próxima cita y total gastado
 * sin N peticiones extra.
 */
export async function listClients(req, res, next) {
  try {
    const filter = { owner: req.user._id }
    const phone = typeof req.query.phone === 'string' ? req.query.phone.trim() : ''
    if (phone) {
      const digits = normalizePhone(phone)
      if (digits) {
        // Coincidencia por FRAGMENTO: así se encuentra al cliente aunque el
        // usuario escriba solo parte del número (sin código de país, con
        // espacios, etc.). `digits` solo contiene [0-9], sin riesgo de
        // inyección de regex.
        filter.phoneNormalized = { $regex: digits }
      }
    }
    const clients = await Client.find(filter).sort({ updatedAt: -1 }).limit(200)
    const stats = await appointmentsStatsByClient(req.user._id)

    res.json({
      clients: clients.map((c) => {
        const doc = c.toObject()
        doc.stats =
          stats.get(String(c._id)) ??
          { total: 0, visits: 0, spent: 0, lastVisit: null, nextVisit: null }
        return doc
      }),
    })
  } catch (err) {
    next(err)
  }
}

/** GET /api/clients/:id — cliente propio + historial de citas. */
export async function getClient(req, res, next) {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: 'Identificador de cliente inválido' })
    }
    const client = await Client.findOne({ _id: req.params.id, owner: req.user._id })
    if (!client) return res.status(404).json({ message: 'Cliente no encontrado' })

    const appointments = await Appointment.find({ client: client._id, owner: req.user._id })
      .sort({ startUtc: -1 })
      .limit(100)

    res.json({ client, appointments })
  } catch (err) {
    next(err)
  }
}

/**
 * PATCH /api/clients/:id/notes — { notes }
 * Guarda la ficha técnica privada del cliente (preferencias de corte,
 * alergias, etc.). Solo el dueño de la token puede editarla; un id ajeno
 * responde 404. Esta información NUNCA se expone en el perfil público.
 */
export async function updateClientNotes(req, res, next) {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: 'Identificador de cliente inválido' })
    }
    const client = await Client.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      { $set: { notes: req.body.notes } },
      { new: true, runValidators: true }
    )
    if (!client) return res.status(404).json({ message: 'Cliente no encontrado' })
    res.json({ client })
  } catch (err) {
    next(err)
  }
}
