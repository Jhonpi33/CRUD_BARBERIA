import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { getOwnerWhatsAppCapabilities } from '../services/whatsappCloud.js'
import {
  disconnectWhatsApp, getWhatsAppPairingCode, isOpenWAConfigured,
  readWhatsAppConnection, startWhatsAppConnection, WhatsAppLinkError,
} from '../services/openWhatsApp.js'

const router = Router()

router.use(requireAuth, requireRole('barber', 'barbershop_owner'))

router.get('/status', async (req, res, next) => {
  res.set('Cache-Control', 'no-store')
  try {
    res.json({ channels: await getOwnerWhatsAppCapabilities(req.user._id) })
  } catch (error) {
    next(error)
  }
})

const mutationLimit = rateLimit({
  windowMs: 60_000, limit: 6, keyGenerator: (req) => String(req.user._id),
  message: { message: 'Espera un minuto antes de intentar vincular WhatsApp otra vez.' },
})

function withConnection(operation) {
  return async (req, res) => {
    res.set('Cache-Control', 'no-store')
    if (!isOpenWAConfigured()) return res.status(503).json({ message: 'La vinculación de WhatsApp aún no está habilitada.' })
    try {
      res.json(await operation(req.user._id))
    } catch (error) {
      if (error instanceof WhatsAppLinkError) return res.status(error.status).json({ message: error.message })
      console.error('[whatsapp] no se pudo gestionar la conexión:', error.httpStatus || error.name)
      res.status(502).json({ message: 'No pudimos conectar con WhatsApp. Intenta de nuevo en unos segundos.' })
    }
  }
}

router.get('/connection', withConnection(readWhatsAppConnection))
router.post('/connection', mutationLimit, withConnection(startWhatsAppConnection))
router.post('/connection/code', mutationLimit, withConnection(getWhatsAppPairingCode))
router.delete('/connection', mutationLimit, withConnection(disconnectWhatsApp))

export default router
