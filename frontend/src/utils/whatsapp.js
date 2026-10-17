/*
  Utilidades de WhatsApp para enlaces wa.me.

  Alcance (importante): SOLO abrimos un chat con `wa.me/…` cuando la persona
  pulsa el botón. No hay WhatsApp Business API, ni envío automático, ni
  lectura de mensajes: el enlace lo abre el navegador de quien hace clic.

  El número se reduce a dígitos en formato internacional:
  - "00573001234567" → "573001234567" (se limpia el prefijo 00).
  - Un móvil colombiano local de 10 cifras (empieza por 3) se completa con
    57, porque la app es de Colombia (es-CO, COP) y wa.me exige el formato
    internacional para que el chat realmente abra.
*/

const CO_COUNTRY_CODE = '57'

/** Deja solo dígitos de cualquier texto de teléfono. */
function digitsOf(phone) {
  return String(phone ?? '').replace(/\D+/g, '')
}

/**
 * Convierte un teléfono al formato internacional sin símbolos que espera
 * wa.me ("+57 300 123 4567" → "573001234567").
 *
 * @param {string} phone Número tal como está guardado en el perfil.
 * @returns {string} Dígitos internacionales, o '' si no hay número.
 */
export function phoneToWaDigits(phone) {
  let d = digitsOf(phone)
  if (!d) return ''

  // Prefijo internacional "00…" → solo el número.
  if (d.startsWith('00')) d = d.slice(2)

  // Móvil colombiano local (10 dígitos que empiezan por 3) → añade 57.
  if (d.length === 10 && d.startsWith('3')) d = CO_COUNTRY_CODE + d

  return d
}

/**
 * Enlace wa.me al teléfono indicado.
 *
 * @param {string} phone
 * @returns {string|null} `https://wa.me/…` o null si no hay teléfono.
 */
export function waLink(phone) {
  const d = phoneToWaDigits(phone)
  return d ? `https://wa.me/${d}` : null
}

/**
 * Enlace wa.me con un mensaje precargado en el chat (parámetro `text`).
 *
 * @param {string} phone
 * @param {string} [message] Mensaje que aparecerá listo para enviar.
 * @returns {string|null} `https://wa.me/…?text=…` o null si no hay teléfono.
 */
export function waMessageLink(phone, message) {
  const base = waLink(phone)
  if (!base) return null

  const text = String(message ?? '').trim()
  return text ? `${base}?text=${encodeURIComponent(text)}` : base
}

/**
 * Enlace para COMPARTIR un texto (por ejemplo el enlace público de la
 * agenda) sin destinatario fijo: WhatsApp abre su selector de chats y la
 * persona elige con quién enviarlo.
 *
 * @param {string} message Texto a compartir.
 * @returns {string|null} `https://wa.me/?text=…` o null si no hay texto.
 */
export function waShareLink(message) {
  const text = String(message ?? '').trim()
  return text ? `https://wa.me/?text=${encodeURIComponent(text)}` : null
}
