import mongoose from 'mongoose'
import { Service } from '../models/Service.js'

/** ¿Tiene formato de ObjectId? Si no, 400 (no 404: la petición está mal formada). */
function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id)
}

/** Campos editables. `owner` NUNCA se acepta del body. */
function pick(body) {
  const out = {}
  if (typeof body.name === 'string') out.name = body.name
  if (typeof body.description === 'string') out.description = body.description
  if (body.price !== undefined) out.price = body.price
  if (body.durationMinutes !== undefined) out.durationMinutes = body.durationMinutes
  if (body.isActive !== undefined) out.isActive = body.isActive
  return out
}

/** GET /api/services — lista propia (activos e inactivos, para administrar). */
export async function listServices(req, res, next) {
  try {
    const services = await Service.find({ owner: req.user._id }).sort({ createdAt: -1 })
    res.json({ services })
  } catch (err) {
    next(err)
  }
}

/** POST /api/services — crea un servicio propio (owner desde el JWT). */
export async function createService(req, res, next) {
  try {
    const service = await Service.create({ ...pick(req.body), owner: req.user._id })
    res.status(201).json({ service })
  } catch (err) {
    // El cliente intentó enviar un owner distinto => lo ignoramos arriba;
    // aquí solo cubrimos duplicado (owner, name).
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Ya tienes un servicio con ese nombre' })
    }
    next(err)
  }
}

/**
 * GET /api/services/:id — un servicio propio.
 * Recurso ajeno o inexistente => 404 (no se revela existencia de otros).
 */
export async function getService(req, res, next) {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: 'Identificador de servicio inválido' })
    }
    const service = await Service.findOne({ _id: req.params.id, owner: req.user._id })
    if (!service) return res.status(404).json({ message: 'Servicio no encontrado' })
    res.json({ service })
  } catch (err) {
    next(err)
  }
}

/** PUT /api/services/:id — actualiza un servicio propio (owner inmutable). */
export async function updateService(req, res, next) {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: 'Identificador de servicio inválido' })
    }
    // owner del body se descarta: no forma parte de pick().
    const service = await Service.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      { $set: pick(req.body) },
      { new: true, runValidators: true }
    )
    if (!service) return res.status(404).json({ message: 'Servicio no encontrado' })
    res.json({ service })
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Ya tienes un servicio con ese nombre' })
    }
    next(err)
  }
}

/** PATCH /api/services/:id/status — activar/desactivar (vía isActive boolean). */
export async function updateServiceStatus(req, res, next) {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: 'Identificador de servicio inválido' })
    }
    const service = await Service.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      { $set: { isActive: req.body.isActive } },
      { new: true, runValidators: true }
    )
    if (!service) return res.status(404).json({ message: 'Servicio no encontrado' })
    res.json({ service })
  } catch (err) {
    next(err)
  }
}

/**
 * DELETE /api/services/:id
 * Criterio de eliminación (Fase 4): aún no existen citas, por lo que no
 * puede haber referencias que romperse. Aun así, la interfaz prefiere
 * DESACTIVAR el servicio; eliminar es una acción explícita del usuario.
 * En la Fase 5 este endpoint pasará a comprobar citas asociadas.
 */
export async function deleteService(req, res, next) {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: 'Identificador de servicio inválido' })
    }
    const service = await Service.findOneAndDelete({ _id: req.params.id, owner: req.user._id })
    if (!service) return res.status(404).json({ message: 'Servicio no encontrado' })
    res.json({ message: 'Servicio eliminado' })
  } catch (err) {
    next(err)
  }
}
