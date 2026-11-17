import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { getWhatsAppCapabilities } from '../services/whatsappCloud.js'

const router = Router()

router.get('/status', requireAuth, requireRole('barber', 'barbershop_owner'), (_req, res) => {
  res.json({ channels: getWhatsAppCapabilities() })
})

export default router
