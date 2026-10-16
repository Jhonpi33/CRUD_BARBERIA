import mongoose from 'mongoose'

import { Client, normalizePhone } from '../models/Client.js'
import { Appointment } from '../models/Appointment.js'

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id)
}

/**
 * GET /api/clients — lista los clientes del dueño autenticado.
 * ?phone=... permite buscar por teléfono (normalizado, parcial por prefijo).
 * El filtro es SIEMPRE por el _id del token.
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
    res.json({ clients })
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
