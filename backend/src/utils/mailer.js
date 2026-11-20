import { sendMail } from '../config/mailer.js'
import { utcToWallClock } from './timezone.js'

export function sendLoginCodeEmail({ to, name, code }) {
  return sendMail({
    to,
    subject: 'Tu código para iniciar sesión en Elysia',
    text: `Hola ${name},\n\nTu código de acceso es ${code}.\nCaduca en 10 minutos y solo se puede usar una vez.\nSi no intentaste entrar a Elysia, cambia tu contraseña.`,
  })
}

/**
 * Correo de aviso al dueño cuando entra una reserva pública.
 *
 * Best-effort: no lanza y no debe romper la reserva. Si el correo no está
 * configurado o falla el envío, se devuelve `{ sent: false }` para que el
 * llamador solo registre un mensaje.
 *
 * @param {{ownerEmail: string, ownerName?: string, clientName: string,
 *          service: {name: string, price?: number, durationMinutes?: number},
 *          startUtc: Date, timezone: string, locale?: string}} input
 * @returns {Promise<{sent: boolean, skipped?: boolean, error?: Error, reason?: string}>}
 */
export async function sendBookingEmail({
  ownerEmail,
  ownerName,
  clientName,
  service,
  startUtc,
  timezone,
  locale = 'es-CO',
}) {
  if (!ownerEmail) {
    return { sent: false, skipped: true, reason: 'el dueño no tiene correo' }
  }

  const w = utcToWallClock(startUtc.getTime(), timezone)
  const fecha = `${w.year}-${String(w.month).padStart(2, '0')}-${String(w.day).padStart(2, '0')}`
  const hora = `${String(w.hour).padStart(2, '0')}:${String(w.minute).padStart(2, '0')}`

  const precio =
    typeof service?.price === 'number'
      ? new Intl.NumberFormat(locale, {
          style: 'currency',
          currency: 'COP',
          maximumFractionDigits: 0,
        }).format(service.price)
      : null

  const subject = `Nueva reserva de ${clientName}`
  const lines = [
    `Hola${ownerName ? ` ${ownerName}` : ''},`,
    '',
    `${clientName} reservó "${service?.name ?? 'un servicio'}".`,
    `Fecha: ${fecha} a las ${hora} (${timezone}).`,
    service?.durationMinutes ? `Duración: ${service.durationMinutes} min.` : null,
    precio ? `Precio: ${precio}.` : null,
    '',
    'Ya está en la agenda de tu panel.',
  ].filter(Boolean)

  return sendMail({ to: ownerEmail, subject, text: lines.join('\n') })
}

/**
 * Correo con el CÓDIGO de 6 dígitos para validar la cuenta nueva.
 *
 * Best-effort igual que el resto: no lanza y devuelve `{ sent }` para que el
 * controlador decida (en producción, si el correo cae, la cuenta no se queda
 * bloqueada).
 *
 * @param {{to: string, name?: string, code: string, minutes: number}} input
 * @returns {Promise<{sent: boolean, skipped?: boolean, error?: Error, reason?: string}>}
 */
export async function sendVerificationEmail({ to, name, code, minutes }) {
  if (!to) {
    return { sent: false, skipped: true, reason: 'sin destinatario' }
  }

  const subject = 'Tu código de verificación de Elysia'
  const lines = [
    `Hola${name ? ` ${name}` : ''},`,
    '',
    'Tu código de verificación es:',
    '',
    `   ${code}`,
    '',
    `Caduca en ${minutes} minutos. Si no creaste esta cuenta, ignora este correo.`,
  ]

  return sendMail({ to, subject, text: lines.join('\n') })
}

/** Confirma al nuevo usuario que su cuenta ya fue creada. */
export async function sendAccountCreatedEmail({ to, name, requiresVerification }) {
  if (!to) return { sent: false, skipped: true, reason: 'sin destinatario' }

  const subject = 'Tu cuenta de Elysia fue creada'
  const nextStep = requiresVerification
    ? 'Para continuar, verifica tu correo con el código que te enviamos en otro mensaje.'
    : 'Ya puedes iniciar sesión y completar tu perfil de barbero.'
  const lines = [
    `Hola${name ? ` ${name}` : ''},`,
    '',
    'Tu cuenta de Elysia fue creada correctamente.',
    nextStep,
    '',
    'Si no solicitaste esta cuenta, puedes ignorar este mensaje.',
  ]

  return sendMail({ to, subject, text: lines.join('\n') })
}

/** Avisa al correo administrativo de una cuenta nueva, sin bloquear el registro. */
export async function sendAdminNewAccountEmail({ to, accountName, accountEmail, requiresVerification }) {
  if (!to) return { sent: false, skipped: true, reason: 'ADMIN_EMAIL no configurado' }

  const createdAt = new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Bogota',
  }).format(new Date())
  const lines = [
    'Se creó una cuenta nueva en Elysia.',
    '',
    `Nombre: ${accountName}`,
    `Correo: ${accountEmail}`,
    `Verificación: ${requiresVerification ? 'pendiente' : 'no requerida'}`,
    `Fecha: ${createdAt} (America/Bogota)`,
  ]

  return sendMail({
    to,
    subject: 'Nueva cuenta registrada en Elysia',
    text: lines.join('\n'),
  })
}

/** Envía un enlace de recuperación sin exponer el token en respuestas de producción. */
export async function sendPasswordResetEmail({ to, name, resetUrl, minutes = 30 }) {
  if (!to) {
    return { sent: false, skipped: true, reason: 'sin destinatario' }
  }

  const subject = 'Restablece tu contraseña de Elysia'
  const lines = [
    `Hola${name ? ` ${name}` : ''},`,
    '',
    'Recibimos una solicitud para cambiar la contraseña de tu cuenta de Elysia.',
    `Abre este enlace dentro de los próximos ${minutes} minutos:`,
    '',
    resetUrl,
    '',
    'Si no solicitaste este cambio, ignora este correo. Tu contraseña seguirá igual.',
  ]

  return sendMail({ to, subject, text: lines.join('\n') })
}
