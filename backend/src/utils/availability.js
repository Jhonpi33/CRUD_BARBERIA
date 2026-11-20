/*
  Cálculo PURO de disponibilidad (Fase 4).
  Sin MongoDB ni Express: testeable con node:test.

  Semántica de tiempo:
  - `date` es una fecha de CALENDARIO (YYYY-MM-DD) interpretada en la zona
    horaria configurada del horario; el día de la semana se deriva de esa
    fecha de calendario (no del reloj del servidor).
  - Los bloques y descansos son "wall-clock" (HH:MM) en esa misma zona.
  - Esta fase NO convierte a instantes UTC ni bloquea por citas: esa
    conversión y el control de concurrencia llegan con la Fase 5.
  - Cambios de horario: cada consulta recalcula con la configuración
    vigente; los horarios no se precalculan ni se cachean.
*/
import { DATE_DAY_KEYS, timeToMinutes, isValidTimezone } from './scheduleValidation.js'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** Error de dominio con código para traducirlo a HTTP 422. */
export class AvailabilityError extends Error {
  constructor(message) {
    super(message)
    this.name = 'AvailabilityError'
    this.code = 'AVAILABILITY_VALIDATION'
  }
}

/** Valida el formato y que sea una fecha real de calendario. */
export function isValidDate(value) {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  )
}

/** Clave de día ('mon'...'sun') de una fecha de calendario. */
export function dayKeyFromDate(date) {
  const [y, m, d] = date.split('-').map(Number)
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay() // 0=domingo
  return DATE_DAY_KEYS[weekday]
}

/**
 * Calcula los intervalos disponibles de un día.
 *
 * @param {object} params
 * @param {string} params.date            YYYY-MM-DD (fecha de calendario)
 * @param {string} params.timezone        Zona IANA del horario
 * @param {object} params.day             Configuración del día (isWorkingDay/blocks/breaks)
 * @param {number} params.durationMinutes Duración REAL del servicio (10..240)
 * @param {number} [params.stepMinutes]   Intervalo entre inicios (granularidad de agenda)
 * @returns {Array<{start: string, end: string, startMinutes: number, endMinutes: number}>}
 * @throws {AvailabilityError} si fecha, zona o duración son inválidas.
 */
export function computeAvailability({
  date,
  timezone,
  day,
  durationMinutes,
  stepMinutes = 15,
}) {
  // 6) Fechas inválidas rechazadas.
  if (!isValidDate(date)) {
    throw new AvailabilityError('La fecha debe ser un día real en formato YYYY-MM-DD')
  }
  // 7) Zona horaria explícita y validada (no se depende del reloj del servidor).
  if (!isValidTimezone(timezone)) {
    throw new AvailabilityError('La zona horaria configurada no es válida')
  }
  // 4/6) Duración: entero dentro de los límites; no confundirla con la granularidad.
  if (!Number.isInteger(durationMinutes) || durationMinutes < 10 || durationMinutes > 240) {
    throw new AvailabilityError('La duración del servicio debe ser un entero entre 10 y 240 minutos')
  }
  if (!Number.isInteger(stepMinutes) || stepMinutes < 1 || stepMinutes > 240) {
    throw new AvailabilityError('La granularidad de agenda no es válida')
  }

  // 1) Día no laborable: lista vacía.
  if (!day || day.isWorkingDay !== true) return []

  const blocks = Array.isArray(day.blocks) ? day.blocks : []
  const breaks = Array.isArray(day.breaks) ? day.breaks : []
  const breakRanges = breaks
    .map((b) => ({ start: timeToMinutes(b.start), end: timeToMinutes(b.end) }))
    .filter((b) => b.start !== null && b.end !== null && b.start < b.end)

  const slots = []

  for (const block of blocks) {
    const blockStart = timeToMinutes(block.start)
    const blockEnd = timeToMinutes(block.end)
    if (blockStart === null || blockEnd === null || blockStart >= blockEnd) continue

    // 5) Granularidad: los inicios avanzan en stepMinutes; la duración del
    // servicio solo decide hasta cuándo puede empezar cada intervalo.
    for (let start = blockStart; start + durationMinutes <= blockEnd; start += stepMinutes) {
      const end = start + durationMinutes

      // 2) Excluye descansos (el intervalo no puede tocarlos).
      const hitsBreak = breakRanges.some((b) => start < b.end && b.start < end)
      // 3) El intervalo siempre termina dentro del bloque (garantizado por la
      // condición del for) y los bloques validados no se solapan entre sí.
      if (hitsBreak) continue

      slots.push({ start: toTime(start), end: toTime(end), startMinutes: start, endMinutes: end })
    }
  }

  // 10) No se simulan bloqueos por citas: aún no existen.
  return slots
}

/** minutos -> 'HH:MM' */
function toTime(minutes) {
  const h = String(Math.floor(minutes / 60)).padStart(2, '0')
  const m = String(minutes % 60).padStart(2, '0')
  return `${h}:${m}`
}

export { isValidTimezone }
