/*
  Fechas y horas de toda la interfaz con dayjs (locale español).

  Regla: NUNCA armar meses/días a mano ni usar toISOString() para fechas de
  calendario (corre en UTC y descuadra el día). Todo pasa por aquí.

  Ojo con las fechas 'YYYY-MM-DD' que vienen del backend: dayjs las lee en
  HORA LOCAL (a diferencia de `new Date('2026-10-24')`, que es UTC).
*/
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.locale('es')
dayjs.extend(localizedFormat)
dayjs.extend(relativeTime)

export { dayjs }

/**
 * Fecha larga para confirmaciones y mensajes:
 *   'sábado, 24 de octubre de 2026'
 */
export function longDate(date) {
  return dayjs(date).format('dddd D [de] MMMM [de] YYYY')
}

/**
 * Fecha corta para tarjetas y listas: 'mié 28 oct 2026'
 * (el locale 'es' ya trae el punto en 'ddd', por eso no se añade otro).
 */
export function shortDate(date) {
  return dayjs(date).format('ddd D MMM YYYY')
}

/**
 * Día y mes útiles para agendas: '24 oct'
 */
export function dayMonth(date) {
  return dayjs(date).format('D MMM')
}

/**
 * Relativo legible: 'hace 18 días', 'hace 2 horas', 'en 3 días'.
 * Ideal para "última visita" y "próxima cita".
 */
export function relativeDate(date) {
  if (!date) return ''
  return dayjs(date).fromNow()
}

/**
 * 'YYYY-MM-DD' LOCAL del navegador (no usar toISOString: viene en UTC).
 */
export function toISODate(date = new Date()) {
  return dayjs(date).format('YYYY-MM-DD')
}

/**
 * Hora 'HH:mm' de un instante ISO.
 */
export function timeOf(date) {
  return dayjs(date).format('HH:mm')
}

/**
 * Duración en minutos -> '45 min' | '1 h' | '1 h 30 min'.
 */
export function durationLabel(minutes) {
  const m = Math.max(0, Math.round(Number(minutes) || 0))
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const rest = m % 60
  return rest ? `${h} h ${rest} min` : `${h} h`
}

/**
 * Pesos colombianos sin decimales: '$15.000'
 */
export function moneyLabel(value) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)
}
