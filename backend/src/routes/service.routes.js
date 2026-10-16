import { Router } from 'express'
import { body } from 'express-validator'

import { validate } from '../middleware/validate.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import {
  listServices,
  createService,
  getService,
  updateService,
  updateServiceStatus,
  deleteService,
} from '../controllers/service.controller.js'

const router = Router()

/**
 * Roles que pueden administrar servicios: barber y barbershop_owner.
 * admin y barber_employee NO (sin permisos agregados por conveniencia).
 */
router.use(requireAuth, requireRole('barber', 'barbershop_owner'))

const nameRules = body('name')
  .isString()
  .withMessage('El nombre es obligatorio')
  .trim()
  .isLength({ min: 2, max: 80 })
  .withMessage('El nombre debe tener entre 2 y 80 caracteres')

const descriptionRules = body('description')
  .optional({ nullable: true })
  .isString()
  .withMessage('La descripción debe ser texto')
  .trim()
  .isLength({ max: 500 })
  .withMessage('La descripción no puede superar 500 caracteres')

const priceRules = body('price')
  .isFloat({ min: 0, max: 100000000 })
  .withMessage('El precio debe ser un número no negativo (máx. 2 decimales)')
  .custom(
    (v) =>
      typeof v === 'number' &&
      Number.isFinite(v) &&
      Math.abs(v * 100 - Math.round(v * 100)) < 1e-6
  )
  .withMessage('El precio debe tener máximo 2 decimales')

const durationRules = body('durationMinutes')
  .isInt({ min: 10, max: 240 })
  .withMessage('La duración debe ser un entero entre 10 y 240 minutos')

/*
 * El formato del :id se comprueba en el controlador (=> 400 si está mal
 * formado); la propiedad del recurso también se comprueba allí (=> 404).
 */

/** GET /api/services */
router.get('/', listServices)

/** POST /api/services */
router.post(
  '/',
  validate([nameRules, descriptionRules, priceRules, durationRules]),
  createService
)

/** GET /api/services/:id */
router.get('/:id', getService)

/** PUT /api/services/:id */
router.put(
  '/:id',
  validate([nameRules, descriptionRules, priceRules, durationRules]),
  updateService
)

/** PATCH /api/services/:id/status — { isActive: boolean } */
router.patch(
  '/:id/status',
  validate([
    body('isActive')
      .isBoolean({ strict: true })
      .withMessage('isActive debe ser true o false'),
  ]),
  updateServiceStatus
)

/** DELETE /api/services/:id (ver criterio en el controlador) */
router.delete('/:id', deleteService)

export default router
