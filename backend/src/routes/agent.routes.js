/*
  Rutas del agente de IA.

  `/chat` es público porque lo usará WhatsApp (cualquiera puede escribirle al
  número del negocio) y porque el modo prueba se abre desde el panel sin
  sesión de cliente. Por eso lleva rate limit propio y solo permite:
  - leer servicios y disponibilidad del negocio del slug,
  - crear citas pendientes (lo mismo que ya permite la reserva pública),
  - listar las citas del teléfono que escribe.
*/
import { Router } from 'express'
import { body } from 'express-validator'
import rateLimit from 'express-rate-limit'

import { validate } from '../middleware/validate.js'
import { chat, agentStatus } from '../controllers/agent.controller.js'

const router = Router()

const agentLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  // En tests se amplía para poder recorrer el flujo completo.
  limit: process.env.NODE_ENV === 'test' ? 10000 : 40,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Demasiados mensajes seguidos. Espera un momento.' },
})

router.get('/status', agentStatus)

router.post(
  '/chat',
  agentLimiter,
  validate([
    body('slug')
      .isString()
      .withMessage('Enlace del negocio inválido')
      .trim()
      .matches(/^[a-z0-9-]{1,80}$/)
      .withMessage('Enlace del negocio inválido'),
    body('message')
      .isString()
      .withMessage('Escribe un mensaje')
      .trim()
      .isLength({ min: 1, max: 1000 })
      .withMessage('El mensaje debe tener entre 1 y 1000 caracteres'),
    body('phone')
      .optional({ nullable: true, checkFalsy: true })
      .isString()
      .withMessage('El teléfono debe ser texto')
      .trim()
      .isLength({ max: 40 })
      .withMessage('El teléfono es demasiado largo'),
    body('name')
      .optional({ nullable: true, checkFalsy: true })
      .isString()
      .withMessage('El nombre debe ser texto')
      .trim()
      .isLength({ max: 120 })
      .withMessage('El nombre es demasiado largo'),
    body('history')
      .optional()
      .isArray({ max: 12 })
      .withMessage('El historial debe ser una lista de hasta 12 mensajes'),
  ]),
  chat
)

export default router
