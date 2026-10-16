import { Router } from 'express'
import { body } from 'express-validator'
import rateLimit from 'express-rate-limit'

import { validate } from '../middleware/validate.js'
import { requireAuth } from '../middleware/auth.js'
import {
  register,
  login,
  me,
  setOwnRole,
  forgotPassword,
  resetPassword,
} from '../controllers/auth.controller.js'

const router = Router()

/** Rate limit para login y registro (fuerza bruta / registros masivos). */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  // En tests se amplía para poder crear las cuentas de prueba.
  limit: process.env.NODE_ENV === 'test' ? 10000 : 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Demasiados intentos. Intenta de nuevo en unos minutos.' },
})

const passwordRules = body('password')
  .isString()
  .withMessage('La contraseña es obligatoria')
  .isLength({ min: 8, max: 72 })
  .withMessage('La contraseña debe tener entre 8 y 72 caracteres')

const emailRules = body('email')
  .isEmail()
  .withMessage('El correo no es válido')
  .normalizeEmail()

router.post(
  '/register',
  authLimiter,
  validate([
    body('name')
      .isString()
      .withMessage('El nombre es obligatorio')
      .trim()
      .isLength({ min: 2, max: 60 })
      .withMessage('El nombre debe tener entre 2 y 60 caracteres'),
    emailRules,
    passwordRules,
  ]),
  register
)

router.post(
  '/login',
  authLimiter,
  validate([emailRules, passwordRules]),
  login
)

router.get('/me', requireAuth, me)

router.patch(
  '/role',
  requireAuth,
  validate([body('role').isString().withMessage('El rol es obligatorio')]),
  setOwnRole
)

router.post(
  '/forgot-password',
  authLimiter,
  validate([emailRules]),
  forgotPassword
)

router.post(
  '/reset-password',
  authLimiter,
  validate([
    body('token')
      .isString()
      .withMessage('El token es obligatorio')
      .isLength({ min: 32, max: 128 })
      .withMessage('Token inválido'),
    passwordRules,
  ]),
  resetPassword
)

export default router
