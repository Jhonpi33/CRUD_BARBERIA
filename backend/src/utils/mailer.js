import { sendMail } from '../config/mailer.js'
import { utcToWallClock } from './timezone.js'

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
