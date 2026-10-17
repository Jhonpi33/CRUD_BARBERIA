import { Router } from 'express'
import { query } from 'express-validator'

import { validate } from '../middleware/validate.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import {
  listNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from '../controllers/notification.controller.js'

const router = Router()

/**
 * Roles que pueden ver notificaciones del panel: barber y barbershop_owner.
 * Todas las consultas filtran por req.user._id: cada usuario solo ve las suyas.
 */
router.use(requireAuth, requireRole('barber', 'barbershop_owner'))

/**
 * GET /api/notifications?limit=20&page=1&unread=true
 * `limit` se valida aquí y el controlador lo limita además a 50 como tope.
 */
router.get(
  '/',
  validate([
    query('limit')
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage('limit debe ser un número entero positivo'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('page debe ser un número entero positivo'),
    query('unread')
      .optional()
      .isIn(['true', 'false'])
      .withMessage('unread debe ser "true" o "false"'),
  ]),
  listNotifications
)

/** GET /api/notifications/unread-count */
router.get('/unread-count', getUnreadCount)

/** PATCH /api/notifications/read-all — marca todas las del usuario como leídas. */
router.patch('/read-all', markAllNotificationsRead)

/** PATCH /api/notifications/:id/read — marca UNA como leída (404 si no es suya). */
router.patch('/:id/read', markNotificationRead)

export default router
