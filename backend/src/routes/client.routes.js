import { Router } from 'express'
import { body } from 'express-validator'

import { validate } from '../middleware/validate.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { listClients, getClient, updateClientNotes } from '../controllers/client.controller.js'

const router = Router()

/** Roles que pueden consultar clientes: barber y barbershop_owner. */
router.use(requireAuth, requireRole('barber', 'barbershop_owner'))

/** GET /api/clients — lista (con ?phone= para buscar por teléfono). */
router.get('/', listClients)

/** GET /api/clients/:id — detalle + historial de citas. */
router.get('/:id', getClient)

/**
 * PATCH /api/clients/:id/notes — { notes }
 * Notas privadas de la ficha técnica del cliente (solo las ve el barbero:
 * el perfil público no incluye este campo).
 */
router.patch(
  '/:id/notes',
  validate([
    body('notes')
      .isString()
      .withMessage('Las notas deben ser texto')
      .trim()
      .isLength({ max: 500 })
      .withMessage('Las notas no pueden superar 500 caracteres'),
  ]),
  updateClientNotes
)

export default router
