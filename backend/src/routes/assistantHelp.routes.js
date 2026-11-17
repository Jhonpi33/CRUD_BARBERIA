import { Router } from 'express'
import { body } from 'express-validator'
import rateLimit from 'express-rate-limit'
import { validate } from '../middleware/validate.js'
import { helpChat } from '../controllers/assistantHelp.controller.js'

const router = Router()

const helpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: process.env.NODE_ENV === 'test' ? 10000 : 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Has enviado varias preguntas. Espera un momento e intenta de nuevo.' },
})

router.post(
  '/chat',
  helpLimiter,
  validate([
    body('message')
      .isString()
      .withMessage('Escribe una pregunta')
      .trim()
      .isLength({ min: 1, max: 1000 })
      .withMessage('La pregunta debe tener entre 1 y 1000 caracteres'),
    body('history')
      .optional()
      .isArray({ max: 8 })
      .withMessage('El historial debe tener hasta 8 mensajes'),
    body('history.*.role')
      .optional()
      .isIn(['user', 'model'])
      .withMessage('Rol de mensaje inválido'),
    body('history.*.text')
      .optional()
      .isString()
      .isLength({ max: 1000 })
      .withMessage('Mensaje de historial inválido'),
  ]),
  helpChat
)

export default router
