import { Router } from 'express'
import { body, param } from 'express-validator'

import { validate } from '../middleware/validate.js'
import { requireAuth } from '../middleware/auth.js'
import {
  getMyProfile,
  upsertMyProfile,
  completeMyProfile,
  getPublicProfile,
} from '../controllers/profile.controller.js'

const router = Router()

/** Reglas reutilizables (opcionales: el onboarding se guarda parcial). */
const phoneRule = body('phone')
  .optional()
  .isString()
  .withMessage('El teléfono debe ser texto')
  .trim()
  .isLength({ min: 7, max: 30 })
  .withMessage('El teléfono debe tener entre 7 y 30 caracteres')

const locationRule = body('location')
  .optional()
  .isString()
  .withMessage('La ubicación debe ser texto')
  .trim()
  .isLength({ min: 3, max: 160 })
  .withMessage('La ubicación debe tener entre 3 y 160 caracteres')

const urlRule = (field, label) =>
  body(field)
    // Opcional de verdad: el frontend siempre manda el campo (aunque sea ""),
    // así que sin checkFalsy un perfil sin foto/logo quedaba bloqueado con
    // "debe ser un enlace válido" y no se podía completar el onboarding.
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage(`${label} debe ser texto`)
    .trim()
    .isLength({ max: 300 })
    .withMessage(`${label} es demasiado largo`)
    .isURL({ protocols: ['http', 'https'], require_tld: false })
    .withMessage(`${label} debe ser un enlace válido (http/https)`)

const settingsRule = body('settings')
  .optional({ nullable: true })
  .isObject()
  .withMessage('La configuración del negocio es inválida')

const updateValidators = [
  phoneRule,
  locationRule,
  // ---- barbero ----
  body('professionalName')
    .optional()
    .isString()
    .withMessage('El nombre profesional debe ser texto')
    .trim()
    .isLength({ min: 2, max: 80 })
    .withMessage('El nombre profesional debe tener entre 2 y 80 caracteres'),
  body('description')
    .optional()
    .isString()
    .withMessage('La descripción debe ser texto')
    .trim()
    .isLength({ max: 600 })
    .withMessage('La descripción no puede superar 600 caracteres'),
  body('whatsappNotificationsEnabled')
    .optional()
    .isBoolean()
    .withMessage('La preferencia de WhatsApp debe ser verdadera o falsa')
    .toBoolean(),
  urlRule('photoUrl', 'La foto'),
  // ---- barbería ----
  body('businessName')
    .optional()
    .isString()
    .withMessage('El nombre comercial debe ser texto')
    .trim()
    .isLength({ min: 2, max: 80 })
    .withMessage('El nombre comercial debe tener entre 2 y 80 caracteres'),
  urlRule('logoUrl', 'El logo'),
  settingsRule,
  body('settings.currency')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 3, max: 8 })
    .withMessage('Moneda inválida'),
  body('settings.openingTime')
    .optional()
    .matches(/^([01]\d|2[0-3]):[0-5]\d$/)
    .withMessage('Hora de apertura inválida (formato HH:MM)'),
  body('settings.closingTime')
    .optional()
    .matches(/^([01]\d|2[0-3]):[0-5]\d$/)
    .withMessage('Hora de cierre inválida (formato HH:MM)'),
  body('settings.appointmentDuration')
    .optional()
    .isInt({ min: 10, max: 240 })
    .withMessage('La duración debe estar entre 10 y 240 minutos'),
]

/** Mi perfil (GET). */
router.get('/me', requireAuth, getMyProfile)

/** Crear/actualizar mi perfil (PUT), con guardado parcial permitido. */
router.put('/me', requireAuth, validate(updateValidators), upsertMyProfile)

/** Marcar onboarding como completado (PATCH). Valida campos obligatorios. */
router.patch('/me/complete', requireAuth, completeMyProfile)

/** Perfil público por enlace (slug). Solo perfiles completados. */
router.get(
  '/u/:slug',
  validate([
    param('slug')
      .isString()
      .trim()
      .isLength({ min: 1, max: 80 })
      .matches(/^[a-z0-9-]+$/)
      .withMessage('Enlace inválido'),
  ]),
  getPublicProfile
)

export default router
