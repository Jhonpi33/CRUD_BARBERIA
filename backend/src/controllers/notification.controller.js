import mongoose from 'mongoose'

import { Notification } from '../models/Notification.js'

/** ¿Tiene formato de ObjectId? */
function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id)
}

const MAX_LIMIT = 50
const DEFAULT_LIMIT = 20

/**
 * GET /api/notifications?limit=20&page=1&unread=true
 * Lista las notificaciones del USUARIO AUTENTICADO (siempre filtra por
 * req.user._id: nunca por un id que mande el cliente). `limit` se limita
 * a un máximo de 50 para no tumbar la BD con pedidos gigantes.
 */
export async function listNotifications(req, res, next) {
  try {
    const rawLimit = Number.parseInt(req.query.limit, 10)
    const limit =
      Number.isInteger(rawLimit) && rawLimit > 0
        ? Math.min(rawLimit, MAX_LIMIT)
        : DEFAULT_LIMIT

    const rawPage = Number.parseInt(req.query.page, 10)
    const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1

    const filter = { owner: req.user._id }
    if (req.query.unread === 'true') filter.readAt = null

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Notification.countDocuments(filter),
      Notification.countDocuments({ owner: req.user._id, readAt: null }),
    ])

    res.json({ notifications, total, page, limit, unreadCount })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/notifications/unread-count
 * Solo el conteo de no leídas del usuario autenticado.
 */
export async function getUnreadCount(req, res, next) {
  try {
    const count = await Notification.countDocuments({
      owner: req.user._id,
      readAt: null,
    })
    res.json({ count })
  } catch (err) {
    next(err)
  }
}

/**
 * PATCH /api/notifications/:id/read
 * Marca una notificación como leída. Si no pertenece al usuario => 404
 * (mismo patrón que las citas/clientes: no se filtra por id ajeno).
 */
export async function markNotificationRead(req, res, next) {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: 'Identificador de notificación inválido' })
    }

    const notification = await Notification.findOne({
      _id: req.params.id,
      owner: req.user._id,
    })
    if (!notification) {
      return res.status(404).json({ message: 'Notificación no encontrada' })
    }

    // Idempotente: si ya estaba leída no cambia readAt.
    if (!notification.readAt) {
      notification.readAt = new Date()
      await notification.save()
    }

    res.json({ notification })
  } catch (err) {
    next(err)
  }
}

/**
 * PATCH /api/notifications/read-all
 * Marca TODAS las notificaciones del usuario autenticado como leídas.
 */
export async function markAllNotificationsRead(req, res, next) {
  try {
    const result = await Notification.updateMany(
      { owner: req.user._id, readAt: null },
      { $set: { readAt: new Date() } }
    )
    res.json({ modified: result.modifiedCount })
  } catch (err) {
    next(err)
  }
}
