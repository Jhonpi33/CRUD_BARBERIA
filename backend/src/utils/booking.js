/*
  Lógica PURA de reservas (Fase 5).
  Sin MongoDB ni Express: testeable con node:test.

  REUTILIZA el cálculo de disponibilidad de la Fase 4
  (`computeAvailability`) y le añade la capa de bloqueo por citas ya
  existentes. No se reimplementa la generación de bloques ni de descansos.
*/

import { computeAvailability } from './availability.js'
import { timeToMinutes } from './scheduleValidation.js'

/** Granularidad de agenda (inicio de los intervalos). Distinta de la duración. */
export const STEP_MINUTES = 15

/** Clave de slot discreto para el índice único: 'YYYY-MM-DDTHH:MM'. */
export function slotKey(date, startMinutes) {
  return `${date}T${minutesToTime(startMinutes)}`
}

function minutesToTime(minutes) {
  const h = String(Math.floor(minutes / 60)).padStart(2, '0')
  const m = String(minutes % 60).padStart(2, '0')
  return `${h}:${m}`
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
