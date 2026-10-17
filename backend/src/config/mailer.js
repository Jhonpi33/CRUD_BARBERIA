import nodemailer from 'nodemailer'

/**
 * Cliente de correo saliente (SMTP) para avisos al barbero.
 *
 * Diseño:
 * - Desactivado por defecto: si faltan variables de entorno (SMTP_HOST,
 *   SMTP_USER y SMTP_PASS), `isEnabled()` devuelve false y `sendMail()` no
 *   hace nada. Así el sistema sigue funcionando sin correo configurado.
 * - Best-effort: `sendMail()` nunca lanza; devuelve un objeto con `sent`,
 *   `skipped` o `error` para que el llamador decida qué registrar.
 * - Transporte inyectable con `setTransport()` para las pruebas (no hace
 *   falta un servidor SMTP real).
 */

let transporter = null

/** Variables mínimas para considerar el correo configurado. */
function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
}

function buildTransporter() {
  const port = Number(process.env.SMTP_PORT) || 587
  const secure = process.env.SMTP_SECURE === 'true' || port === 465

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

/** ¿Hay correo configurado en este entorno? */
export function isEnabled() {
  return smtpConfigured() || transporter !== null
}

/**
 * Permite inyectar un transporte (falso) en pruebas. Pasa `null` para
 * restaurar el comportamiento normal.
 */
export function setTransport(t) {
  transporter = t
}

/**
 * Envía un correo. Nunca lanza.
 *
 * @param {{to: string, subject: string, text?: string, html?: string}} mail
 * @returns {Promise<{sent: boolean, skipped?: boolean, error?: Error, reason?: string}>}
 */
export async function sendMail({ to, subject, text, html }) {
  if (!to) {
    return { sent: false, skipped: true, reason: 'sin destinatario' }
  }

  if (!smtpConfigured() && transporter === null) {
    return { sent: false, skipped: true, reason: 'correo no configurado (faltan SMTP_* en el entorno)' }
  }

  try {
    const tx = transporter ?? (transporter = buildTransporter())
    const from = process.env.SMTP_FROM || process.env.SMTP_USER
    await tx.sendMail({ from, to, subject, text, html })
    return { sent: true }
  } catch (err) {
    return { sent: false, error: err }
  }
}
