import { Router } from 'express'
import { body } from 'express-validator'

import { validate } from '../middleware/validate.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { getMySchedule, putMySchedule } from '../controllers/schedule.controller.js'

const router = Router()

/**
 * Roles que pueden administrar el horario: barber y barbershop_owner.
 * admin y barber_employee NO.
 */
router.use(requireAuth, requireRole('barber', 'barbershop_owner'))

/** GET /api/schedule/me — sin configuración devuelve `defaults` sin crear datos. */
router.get('/me', getMySchedule)

/**
 * PUT /api/schedule/me — crea/actualiza la semana.
 * La validación profunda (bloques, solapes, descansos) se hace en el
 * controlador con la utilidad pura `validateWeekInput`.
 */
router.put(
  '/me',
  validate([
    body('timezone')
      .optional({ nullable: true })
      .isString()
      .withMessage('La zona horaria debe ser texto')
      .trim()
      .isLength({ max: 60 }),
    body('days')
      .optional({ nullable: true })
      .isObject()
      .withMessage('"days" debe ser un objeto con los días de la semana'),
  ]),
  putMySchedule
)

export default router
