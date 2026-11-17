/*
  Lógica PURA de reservas (Fase 5).
  Sin MongoDB ni Express: testeable con node:test.

  REUTILIZA el cálculo de disponibilidad de la Fase 4
  (`computeAvailability`) y le añade la capa de bloqueo por citas ya
  existentes. No se reimplementa la generación de bloques ni de descansos.
*/

import { computeAvailability } from './availability.js'
import { timeToMinutes } from './scheduleValidation.js'
import { utcToWallClock } from './timezone.js'

/** Granularidad de agenda (inicio de los intervalos). Distinta de la duración. */
export const STEP_MINUTES = 15

/** Margen por defecto de cambio de turno cuando el servicio no lo define. */
export const DEFAULT_BUFFER_MINUTES = 10

/**
 * Expande cada rango ocupado `bufferMinutes` minutos hacia ambos lados.
 *
 * Así, entre dos citas (y entre una cita y cualquier inicio propuesto) queda
 * SIEMPRE ese aire: cambio de turno, limpieza, espera del siguiente cliente.
 * No es parte de la duración que ve el cliente: la cita termina a su hora
 * real, solo se protege el hueco de alrededor.
 *
 * `bufferMinutes` ausente o no entero => 10 por defecto; 0 => sin margen.
 *
 * @param {Array<{startMinutes:number,endMinutes:number}>} busyRanges
 * @param {number} [bufferMinutes] minutos de margen (0..120)
 * @returns los mismos rangos expandidos (nueva lista, sin mutar la original)
 */
export function expandBusyRanges(busyRanges, bufferMinutes = DEFAULT_BUFFER_MINUTES) {
  if (!Array.isArray(busyRanges) || busyRanges.length === 0) return []
  const buffer =
    Number.isInteger(bufferMinutes) && bufferMinutes >= 0 ? bufferMinutes : DEFAULT_BUFFER_MINUTES
  if (buffer === 0) return busyRanges

  return busyRanges.map((b) => ({
    ...b,
    startMinutes: Math.max(0, b.startMinutes - buffer),
    endMinutes: b.endMinutes + buffer,
  }))
}

/** Clave de slot discreto para el índice único: 'YYYY-MM-DDTHH:MM'. */
export function slotKey(date, startMinutes) {
  return `${date}T${minutesToTime(startMinutes)}`
}

function minutesToTime(minutes) {
  const h = String(Math.floor(minutes / 60)).padStart(2, '0')
  const m = String(minutes % 60).padStart(2, '0')
  return `${h}:${m}`
}

function pad2(n) {
  return String(n).padStart(2, '0')
}

/** Fecha de calendario 'YYYY-MM-DD' de un instante, en una zona IANA. */
function calendarDateOf(ms, timeZone) {
  const w = utcToWallClock(ms, timeZone)
  return `${w.year}-${pad2(w.month)}-${pad2(w.day)}`
}

/**
 * ¿El inicio solicitado ya quedó en el pasado?
 *
 * Se compara SIEMPRE en la zona horaria del DUEÑO, no en la del servidor
 * ni la del cliente: "las 08:00" significan las 08:00 del dueño.
 * Fecha anterior a hoy => pasado. Mismo día => se compara la hora.
 *
 * Pura: `now` se inyecta para poder testear sin depender del reloj.
 *
 * @param {object} params
 * @param {string} params.date      'YYYY-MM-DD' (fecha de calendario)
 * @param {string} params.start     'HH:MM' (hora de pared del dueño)
 * @param {string} params.timezone  zona IANA del dueño
 * @param {Date}   [params.now]     instante de referencia (por defecto, ahora)
 * @returns {boolean}
 */
export function isSlotInPast({ date, start, timezone, now = new Date() }) {
  // 1) Formato de hora: si no es 'HH:MM' válido, no es reservable de todos modos.
  const startMinutes = timeToMinutes(start)
  if (startMinutes === null) return true

  // 2) Fecha de calendario de HOY en la zona del dueño. Las fechas 'YYYY-MM-DD'
  //    se pueden comparar como texto: el orden lexicográfico coincide con el
  //    orden de calendario.
  const today = calendarDateOf(now.getTime(), timezone)
  if (date < today) return true
  if (date > today) return false

  // 3) Mismo día: se compara la hora.
  const w = utcToWallClock(now.getTime(), timezone)
  const nowMinutes = w.hour * 60 + w.minute

  // Un slot que empieza en este mismo minuto ya no alcanza a atenderse.
  return startMinutes <= nowMinutes
}

/**
 * De una lista de intervalos libres teóricos quita los que ya quedaron en el
 * pasado respecto de `now` (solo afecta al día de hoy).
 *
 * @param {Array<{start:string}>} slots
 * @param {string} date    'YYYY-MM-DD'
 * @param {string} timezone zona IANA del dueño
 * @param {Date} [now]
 * @returns los slots todavía reservables
 */
export function filterPastSlots(slots, date, timezone, now = new Date()) {
  return (Array.isArray(slots) ? slots : []).filter(
    (s) => !isSlotInPast({ date, start: s.start, timezone, now })
  )
}

/**
 * ¿Se solapan dos intervalos [aStart,aEnd) y [bStart,bEnd)?
 * Usamos semántica media-abierta: un servicio que termina exactamente cuando
 * empieza otro NO se solapa (permitido).
 */
export function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd
}

/**
 * Genera las claves de slot (a la granularidad STEP_MINUTES) que ocupa una
 * cita que empieza en `startMinutes` y dura `durationMinutes`.
 *
 * Esas claves son las que alimentan el índice único parcial de MongoDB:
 * dos citas solapadas comparten al menos una clave => el motor las rechaza.
 *
 * @param {string} date 'YYYY-MM-DD'
 * @param {number} startMinutes inicio en minutos locales
 * @param {number} durationMinutes duración del servicio
 * @param {number} [step] granularidad
 * @returns {string[]}
 */
export function occupiedSlotKeys(date, startMinutes, durationMinutes, step = STEP_MINUTES) {
  const keys = []
  // La cita ocupa todos los inicios que caen DENTRO de su intervalo
  // [start, start+dur). El inicio final (start+dur) es el de la siguiente
  // cita: no se bloquea.
  for (let m = startMinutes; m < startMinutes + durationMinutes; m += step) {
    keys.push(slotKey(date, m))
  }
  return keys
}

/**
 * De una lista de intervalos "libres" teóricos (ya ajustados a bloques y
 * descansos) quita los que se solapan con cualquier intervalo ocupado.
 *
 * @param {Array<{startMinutes:number,endMinutes:number,start:string,end:string}>} slots
 * @param {Array<{startMinutes:number,endMinutes:number}>} busyRanges
 * @returns los slots que no tocan ningún rango ocupado
 */
export function filterBusySlots(slots, busyRanges) {
  if (!Array.isArray(busyRanges) || busyRanges.length === 0) return slots
  return slots.filter(
    (slot) =>
      !busyRanges.some((b) => overlaps(slot.startMinutes, slot.endMinutes, b.startMinutes, b.endMinutes))
  )
}

/**
 * Disponibilidad de un día TENIENDO EN CUENTA las citas ya reservadas.
 *
 * @param {object} params
 * @param {string} params.date
 * @param {string} params.timezone
 * @param {object} params.day configuración del día
 * @param {number} params.durationMinutes
 * @param {number} [params.stepMinutes]
 * @param {Array<{startMinutes:number,endMinutes:number}>} [params.busyRanges] citas existentes
 * @returns slots libres
 * @throws {AvailabilityError} si fecha/zona/duración inválidas (heredado de Fase 4)
 */
export function computeFreeSlots({
  date,
  timezone,
  day,
  durationMinutes,
  stepMinutes = STEP_MINUTES,
  busyRanges = [],
}) {
  const theoretical = computeAvailability({ date, timezone, day, durationMinutes, stepMinutes })
  return filterBusySlots(theoretical, busyRanges)
}

/**
 * Convierte una cita guardada en el rango ocupado [startMinutes, endMinutes).
 * Acepta tanto documentos de Mongo (con .toObject) como objetos planos.
 */
export function busyRangeFromAppointment(appointment) {
  const a = typeof appointment?.toObject === 'function' ? appointment.toObject() : appointment
  if (!a) return null
  const start = Number.isInteger(a.startMinutes)
    ? a.startMinutes
    : timeToMinutes(a.localStart)
  const end = Number.isInteger(a.endMinutes) ? a.endMinutes : timeToMinutes(a.localEnd)
  if (start === null || end === null || !Number.isInteger(start) || !Number.isInteger(end)) return null
  return { startMinutes: start, endMinutes: end }
}

/** Extrae los rangos ocupados de una lista de citas, descartando nulos. */
export function busyRangesFromAppointments(appointments) {
  return (Array.isArray(appointments) ? appointments : [])
    .map(busyRangeFromAppointment)
    .filter(Boolean)
}
