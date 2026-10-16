import { Router } from 'express'
import { body } from 'express-validator'
import rateLimit from 'express-rate-limit'

import { validate } from '../middleware/validate.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import {
  listAppointments,
  getAppointment,
  updateAppointmentStatus,
  cancelAppointment,
} from '../controllers/appointment.controller.js'

const router = Router()

/**
 * Roles que pueden administrar citas: barber y barbershop_owner.
 * admin y barber_employee NO (sin permisos agregados por conveniencia).
 */
router.use(requireAuth, requireRole('barber', 'barbershop_owner'))

/** GET /api/appointments?from=YYYY-MM-DD&to=YYYY-MM-DD */
router.get('/', listAppointments)

/** GET /api/appointments/:id */
router.get('/:id', getAppointment)

/** PATCH /api/appointments/:id/status — { status } */
router.patch(
  '/:id/status',
  validate([
    body('status')
      .isString()
      .withMessage('El estado es obligatorio')
      // Se aceptan los valores de estado válidos; si la TRANSICIÓN no está
      // permitida, la máquina de estados (appointmentStatus) responde 409.
      .isIn(['pending', 'confirmed', 'completed', 'cancelled', 'no_show'])
      .withMessage('Estado no válido'),
  ]),
  updateAppointmentStatus
)

/** DELETE /api/appointments/:id — cancela la cita. */
router.delete('/:id', cancelAppointment)

export default router
