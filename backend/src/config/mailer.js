import nodemailer from 'nodemailer'
import { isGmailConfigured, sendGmail } from './gmail.js'

/**
 * Cliente de correo saliente por SMTP o Gmail API.
 *
 * Diseño:
 * - Desactivado si faltan las variables del transporte seleccionado.
 * - Best-effort: `sendMail()` nunca lanza; devuelve un objeto con `sent`,
 *   `skipped` o `error` para que el llamador decida qué registrar.
 * - Transporte inyectable con `setTransport()` para las pruebas (no hace
 *   falta un servidor SMTP real).
 */

let transporter = null

/** Variables mínimas para considerar el correo configurado. */
export function isMailConfigured(env = process.env) {
  if (env.MAIL_TRANSPORT === 'gmail-api') return isGmailConfigured(env)
  return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS)
}

function buildTransporter() {
  const port = Number(process.env.SMTP_PORT) || 587
  const secure = process.env.SMTP_SECURE === 'true' || port === 465

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

/** ¿Hay correo configurado en este entorno? */
export function isEnabled() {
  return isMailConfigured() || transporter !== null
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

  if (!isEnabled()) {
    return { sent: false, skipped: true, reason: 'correo no configurado' }
  }

  try {
    if (process.env.MAIL_TRANSPORT === 'gmail-api' && transporter === null) {
      const from = process.env.GMAIL_FROM || process.env.GMAIL_USER
      await sendGmail({ from, to, subject, text, html })
    } else {
      const tx = transporter ?? buildTransporter()
      const from = process.env.SMTP_FROM || process.env.SMTP_USER
      await tx.sendMail({ from, to, subject, text, html })
    }
    return { sent: true }
  } catch (err) {
    return { sent: false, error: err }
  }
}
