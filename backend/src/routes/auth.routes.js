import { Router } from 'express'
import { body } from 'express-validator'
import rateLimit from 'express-rate-limit'

import { validate } from '../middleware/validate.js'
import { requireAuth } from '../middleware/auth.js'
import {
  register,
  login,
  verifyEmail,
  resendVerification,
  me,
  updateMe,
  setOwnRole,
  forgotPassword,
  resetPassword,
  googleConfig,
  googleLogin,
  verifyLoginCode,
} from '../controllers/auth.controller.js'
import { CODE_LENGTH } from '../utils/emailVerification.js'

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

/**
 * Rate limit aparte para el reenvío del código: es la operación que más se
 * repite (y la que más correo dispara), así no consume los intentos de login.
 */
const verificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: process.env.NODE_ENV === 'test' ? 10000 : 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Demasiados envíos. Espera unos minutos antes de pedir otro código.' },
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

router.get('/google/config', googleConfig)
router.post('/google', authLimiter, validate([
  body('credential').isString().isLength({ min: 20, max: 10000 }),
]), googleLogin)

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
router.post('/login/verify-code', authLimiter, validate([
  body('challengeToken').isString().matches(/^[a-f0-9]{64}$/),
  body('code').isString().matches(/^\d{6}$/),
]), verifyLoginCode)

/**
 * POST /verify-email — { email, code }
 * El :id de formato no aplica aquí; el controlador responde 400 genérico
 * para no revelar si la cuenta existe o si el código está cerca.
 */
router.post(
  '/verify-email',
  authLimiter,
  validate([
    emailRules,
    body('code')
      .isString()
      .withMessage('El código es obligatorio')
      .matches(new RegExp(`^\\d{${CODE_LENGTH}}$`))
      .withMessage(`El código tiene ${CODE_LENGTH} dígitos`),
  ]),
  verifyEmail
)

/** POST /resend-verification — { email } (respuesta genérica por diseño) */
router.post(
  '/resend-verification',
  verificationLimiter,
  validate([emailRules]),
  resendVerification
)

router.patch(
  '/role',
  requireAuth,
  validate([body('role').isString().withMessage('El rol es obligatorio')]),
  setOwnRole
)

/**
 * PATCH /api/auth/me — datos básicos de la propia cuenta (nombre y teléfono).
 * El teléfono es lo que permite a una cuenta `client` ver sus citas.
 */
router.patch(
  '/me',
  requireAuth,
  validate([
    body('name')
      .optional()
      .isString()
      .withMessage('El nombre debe ser texto')
      .trim()
      .isLength({ min: 2, max: 60 })
      .withMessage('El nombre debe tener entre 2 y 60 caracteres'),
    body('phone')
      .optional({ nullable: true, checkFalsy: true })
      .isString()
      .withMessage('El teléfono debe ser texto')
      .trim()
      .isLength({ min: 7, max: 40 })
      .withMessage('El teléfono debe tener entre 7 y 40 caracteres')
      .custom((value) => String(value).replace(/\D+/g, '').length >= 7)
      .withMessage('El teléfono debe tener al menos 7 dígitos'),
  ]),
  updateMe
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
