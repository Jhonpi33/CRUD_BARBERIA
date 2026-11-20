/*
  Rutas del área del cliente (rol `client`).

  Solo lectura de SUS propias citas: no hay endpoints para crear ni modificar
  citas desde aquí (eso sigue pasando por la reserva pública y por el panel
  del barbero).
*/
import { Router } from 'express'

import { requireAuth, requireRole } from '../middleware/auth.js'
import { myAppointments } from '../controllers/clientArea.controller.js'

const router = Router()

router.get('/appointments', requireAuth, requireRole('client'), myAppointments)

export default router
