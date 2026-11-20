/*
  Validación de correo al crear la cuenta: código de 6 dígitos.

  Reglas del diseño:
  - El código NUNCA se guarda en claro: solo su HMAC con `JWT_SECRET`, así
    que una fuga de la base de datos no revela los códigos vigentes.
  - `REQUIRE_EMAIL_VERIFICATION` decide si es obligatoria:
      'true'  => obligatoria en cualquier entorno.
      'false' => desactivada (por defecto: la versión estable no cambia).
      sin definir => obligatoria solo si hay correo configurado; exigirla sin
      correo sería bloquear cuentas sin que nadie pueda verificarlas.
  - "Sin código vigente" = la cuenta ya es válida. Las cuentas creadas antes
    de esta función no tienen `emailVerifiedAt` y siguen entrando igual.
*/
import crypto from 'node:crypto'
import { isMailConfigured } from '../config/mailer.js'

/** Longitud del código que recibe el usuario. */
export const CODE_LENGTH = 6

/** Validez del código (minutos que se prometen en la respuesta: 15). */
export const CODE_TTL_MS = 15 * 60 * 1000

/** Intentos fallidos permitidos antes de invalidar el código. */
export const MAX_ATTEMPTS = 5

/**
 * ¿La validación de correo está obligada en este entorno?
 * Se lee en cada petición (no al importar) para poder cambiarla en pruebas.
 *
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {boolean}
 */
export function verificationEnabled(env = process.env) {
  const flag = env.REQUIRE_EMAIL_VERIFICATION
  if (flag === 'true') return true
  if (flag === 'false') return false
  // Sin decisión explícita: solo si el correo puede llegar de verdad.
  return isMailConfigured(env)
}

/** Genera el código de 6 dígitos ('000000'..'999999'), con ceros a la izquierda. */
export function generateCode() {
  return String(crypto.randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, '0')
}

/**
 * HMAC del código ligado al correo: igual para el mismo par, distinto si
 * cambia el código o la dirección (un código no sirve en otra cuenta).
 *
 * @param {string} email correo del usuario (en minúsculas)
 * @param {string} code   código de 6 dígitos
 * @throws {Error} si falta JWT_SECRET (misma dependencia que los tokens).
 */
export function hashCode(email, code) {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET no está configurado: no se puede firmar el código')
  }
  return crypto
    .createHmac('sha256', process.env.JWT_SECRET)
    .update(`${String(email).toLowerCase()}:${code}`)
    .digest('hex')
}

/**
 * Comparación en tiempo constante de dos hashes (no filtra por dónde
 * empiezan a diferir).
 */
export function codesMatch(storedHash, computedHash) {
  if (typeof storedHash !== 'string' || typeof computedHash !== 'string') return false
  const a = Buffer.from(storedHash)
  const b = Buffer.from(computedHash)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}
