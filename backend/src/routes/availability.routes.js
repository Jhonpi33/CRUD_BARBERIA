import { Router } from 'express'

import { requireAuth, requireRole } from '../middleware/auth.js'
import { getAvailability } from '../controllers/availability.controller.js'

const router = Router()

/**
 * Política de Fase 4: PRIVADA. El servicio consultado debe pertenecer al
 * usuario autenticado. La política pública para la página de reservas
 * llegará en la Fase 5 como endpoint separado.
 */
router.use(requireAuth, requireRole('barber', 'barbershop_owner'))

/** GET /api/availability?date=YYYY-MM-DD&serviceId=... */
router.get('/', getAvailability)

export default router
