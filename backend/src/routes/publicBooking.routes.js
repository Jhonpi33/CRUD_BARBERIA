import { Router } from 'express'
import { body, param } from 'express-validator'
import rateLimit from 'express-rate-limit'

import { validate } from '../middleware/validate.js'
import {
  getPublicBookingInfo,
  getPublicAvailability,
  createPublicBooking,
} from '../controllers/publicBooking.controller.js'

const router = Router()

/**
 * Rate limit para las reservas públicas: evita abuso/spam desde el enlace
 * público. En tests se amplía para poder ejercitar la concurrencia.
 */
const bookingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: process.env.NODE_ENV === 'test' ? 10000 : 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Demasiadas solicitudes. Intenta de nuevo en unos minutos.' },
})

/** Reglas del slug público (misma forma que el resto del proyecto). */
const slugRules = param('slug')
  .isString()
  .withMessage('Enlace inválido')
  .trim()
  .matches(/^[a-z0-9-]{1,80}$/)
  .withMessage('Enlace inválido')

/** GET /api/public/booking/:slug — perfil + servicios activos. */
router.get('/:slug', bookingLimiter, validate([slugRules]), getPublicBookingInfo)

/** GET /api/public/booking/:slug/availability — huecos libres reales. */
router.get(
  '/:slug/availability',
  bookingLimiter,
  validate([slugRules]),
  getPublicAvailability
)

/** POST /api/public/booking/:slug — crea la cita. */
router.post(
  '/:slug',
  bookingLimiter,
  validate([
    slugRules,
    body('serviceId').isString().withMessage('El servicio es obligatorio'),
    body('date').isString().withMessage('La fecha es obligatoria'),
    body('start').isString().withMessage('La hora es obligatoria'),
    body('name').isString().withMessage('El nombre es obligatorio'),
    body('phone').isString().withMessage('El teléfono es obligatorio'),
    body('whatsappOptIn')
      .optional()
      .isBoolean()
      .withMessage('La autorización de WhatsApp no es válida')
      .toBoolean(),
  ]),
  createPublicBooking
)

export default router
