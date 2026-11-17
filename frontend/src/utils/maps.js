/*
  Enlaces de ubicación (Google Maps) para los mensajes al cliente.

  Solo construimos la URL: el enlace se abre desde la app o se pega en el
  mensaje de WhatsApp, donde el cliente puede tocarlo y llegar al local.
  No llamamos a ninguna API de Google.
*/

/**
 * Enlace de Google Maps para buscar una dirección en texto.
 *
 * @param {string} location Dirección tal como está guardada en el perfil
 *                          (ej. "Bogotá, Chapinero" o "Cra 7 #14-45, Bogotá").
 * @returns {string|null} URL de Google Maps, o null si no hay dirección.
 */
export function mapsLink(location) {
  const query = String(location ?? '').trim()
  if (!query) return null
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}
