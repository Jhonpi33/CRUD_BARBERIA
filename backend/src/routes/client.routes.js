import { Router } from 'express'

import { requireAuth, requireRole } from '../middleware/auth.js'
import { listClients, getClient } from '../controllers/client.controller.js'

const router = Router()

/** Roles que pueden consultar clientes: barber y barbershop_owner. */
router.use(requireAuth, requireRole('barber', 'barbershop_owner'))

/** GET /api/clients — lista (con ?phone= para buscar por teléfono). */
router.get('/', listClients)

/** GET /api/clients/:id — detalle + historial de citas. */
router.get('/:id', getClient)

export default router
