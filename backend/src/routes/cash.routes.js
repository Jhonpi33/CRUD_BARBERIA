import { Router } from 'express'
import { body } from 'express-validator'

import { validate } from '../middleware/validate.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import {
  getCurrentCash,
  openCash,
  closeCash,
  createMovement,
  deleteMovement,
  getCashHistory,
} from '../controllers/cash.controller.js'

const router = Router()

/**
 * Roles que pueden usar la caja: barber y barbershop_owner.
 * admin y barber_employee NO.
 */
router.use(requireAuth, requireRole('barber', 'barbershop_owner'))

/**
 * Dinero con máximo 2 decimales y no negativo (COP).
 * `optional` debe ir ANTES de los validadores: si el campo no llega,
 * la cadena se salta y el controlador usa su valor por defecto (0).
 */
function moneyRule(field, { min = 0, optional = false } = {}) {
  let chain = body(field)
  if (optional) chain = chain.optional({ values: 'nullish' })
  return chain
    .isFloat({ min, max: 10000000000 })
    .withMessage(`${field} debe ser un número válido`)
    .custom(
      (v) =>
        typeof v === 'number' &&
        Number.isFinite(v) &&
        Math.abs(v * 100 - Math.round(v * 100)) < 1e-6
    )
    .withMessage(`${field} debe tener máximo 2 decimales`)
}

const typeRules = body('type')
  .isString()
  .withMessage('El tipo de movimiento es obligatorio')
  .isIn(['income', 'expense'])
  .withMessage("El tipo debe ser 'income' (ingreso) o 'expense' (egreso)")

const amountRules = body('amount')
  .isFloat({ min: 0.01, max: 10000000000 })
  .withMessage('El valor debe ser mayor que cero')
  .custom(
    (v) =>
      typeof v === 'number' &&
      Number.isFinite(v) &&
      Math.abs(v * 100 - Math.round(v * 100)) < 1e-6
  )
  .withMessage('El valor debe tener máximo 2 decimales')

const conceptRules = body('concept')
  .isString()
  .withMessage('El concepto es obligatorio')
  .trim()
  .isLength({ min: 2, max: 140 })
  .withMessage('El concepto debe tener entre 2 y 140 caracteres')

const methodRules = body('method')
  .optional({ nullable: true })
  .isIn(['cash', 'transfer', 'card'])
  .withMessage("El medio de pago debe ser 'cash', 'transfer' o 'card'")

const appointmentRules = body('appointmentId')
  .optional({ nullable: true })
  .isMongoId()
  .withMessage('Identificador de cita inválido')

/** GET /api/cash/current — caja abierta (o null) + movimientos + totales. */
router.get('/current', getCurrentCash)

/** GET /api/cash/history?from=YYYY-MM-DD&to=YYYY-MM-DD — sesiones y cierres. */
router.get('/history', getCashHistory)

/** POST /api/cash/open — { openingBalance?, note? } (fondo inicial opcional, por defecto 0) */
router.post('/open', validate([moneyRule('openingBalance', { optional: true })]), openCash)

/** POST /api/cash/close — { closingBalance, note? } (conteo manual, obligatorio) */
router.post('/close', validate([moneyRule('closingBalance')]), closeCash)

/** POST /api/cash/movements — { type, amount, concept, method?, appointmentId? } */
router.post(
  '/movements',
  validate([typeRules, amountRules, conceptRules, methodRules, appointmentRules]),
  createMovement
)

/** DELETE /api/cash/movements/:id — solo dentro de la caja abierta. */
router.delete('/movements/:id', deleteMovement)

export default router
