/*
  Validación pura de la configuración semanal.
  Sin MongoDB ni Express: testeable con node:test.
*/

/** Claves de los días de la semana (lunes a domingo). */
export const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

/** Mapea el día de la semana de Date (0=domingo) a nuestras claves. */
export const DATE_DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

/** '08:30' -> 510. Devuelve null si el formato es inválido. */
export function timeToMinutes(value) {
  if (typeof value !== 'string' || !TIME_RE.test(value)) return null
  const [h, m] = value.split(':').map(Number)
  return h * 60 + m
}

/** ¿Existe una zona horaria IANA válida en este entorno? */
export function isValidTimezone(tz) {
  if (typeof tz !== 'string' || !tz) return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
    return true
  } catch {
    return false
  }
}

/** Solapan dos intervalos [a,b) y [c,d)? */
function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd
}

/**
 * Valida un día de la semana.
 * @param {object} day  { isWorkingDay, blocks: [{start,end}], breaks: [{start,end}] }
 * @returns {string[]} lista de mensajes de error (vacía si es válido)
 */
export function validateDay(day) {
  const errors = []

  if (typeof day !== 'object' || day === null) {
    return ['El día debe ser un objeto']
  }

  const blocks = Array.isArray(day.blocks) ? day.blocks : []
  const breaks = Array.isArray(day.breaks) ? day.breaks : []

  if (typeof day.isWorkingDay !== 'boolean') {
    errors.push('"isWorkingDay" debe ser true o false')
    return errors
  }

  if (!day.isWorkingDay) {
    // Día de descanso: no debe arrastrar bloques ni descansos (evita datos ambiguos).
    if (blocks.length > 0) errors.push('Un día no laborable no puede tener bloques')
    if (breaks.length > 0) errors.push('Un día no laborable no puede tener descansos')
    return errors
  }

  if (blocks.length === 0) {
    errors.push('Un día laborable necesita al menos un bloque')
    return errors
  }

  // --- Bloques ---
  const blockRanges = []
  for (const [i, block] of blocks.entries()) {
    const label = `Bloque ${i + 1}`
    if (typeof block !== 'object' || block === null) {
      errors.push(`${label}: formato inválido`)
      continue
    }
    const start = timeToMinutes(block.start)
    const end = timeToMinutes(block.end)
    if (start === null) errors.push(`${label}: hora de inicio inválida (usa HH:MM)`)
    if (end === null) errors.push(`${label}: hora de fin inválida (usa HH:MM)`)
    if (start !== null && end !== null) {
      if (start >= end) errors.push(`${label}: la hora de inicio debe ser anterior a la de fin`)
      else blockRanges.push({ start, end, index: i })
    }
  }

  for (let i = 0; i < blockRanges.length; i += 1) {
    for (let j = i + 1; j < blockRanges.length; j += 1) {
      if (overlaps(blockRanges[i].start, blockRanges[i].end, blockRanges[j].start, blockRanges[j].end)) {
        errors.push(
          `Los bloques ${blockRanges[i].index + 1} y ${blockRanges[j].index + 1} se solapan`
        )
      }
    }
  }

  // --- Descansos ---
  const breakRanges = []
  for (const [i, brk] of breaks.entries()) {
    const label = `Descanso ${i + 1}`
    if (typeof brk !== 'object' || brk === null) {
      errors.push(`${label}: formato inválido`)
      continue
    }
    const start = timeToMinutes(brk.start)
    const end = timeToMinutes(brk.end)
    if (start === null) errors.push(`${label}: hora de inicio inválida (usa HH:MM)`)
    if (end === null) errors.push(`${label}: hora de fin inválida (usa HH:MM)`)
    if (start === null || end === null) continue
    if (start >= end) {
      errors.push(`${label}: la hora de inicio debe ser anterior a la de fin`)
      continue
    }
    // Debe estar contenido en al menos un bloque laboral.
    const insideBlock = blockRanges.some((b) => b.start <= start && end <= b.end)
    if (!insideBlock) {
      errors.push(`${label}: debe estar dentro de un bloque laboral`)
    }
    breakRanges.push({ start, end, index: i })
  }

  for (let i = 0; i < breakRanges.length; i += 1) {
    for (let j = i + 1; j < breakRanges.length; j += 1) {
      if (overlaps(breakRanges[i].start, breakRanges[i].end, breakRanges[j].start, breakRanges[j].end)) {
        errors.push(
          `Los descansos ${breakRanges[i].index + 1} y ${breakRanges[j].index + 1} se solapan`
        )
      }
    }
  }

  return errors
}

/**
 * Valida los días enviados en un PUT.
 * @param {object} days objeto con claves DAY_KEYS
 * @returns {object} { ok, errors: [{ path, message }] }
 */
export function validateWeekInput(days) {
  const errors = []

  if (typeof days !== 'object' || days === null || Array.isArray(days)) {
    return { ok: false, errors: [{ path: 'days', message: '"days" debe ser un objeto' }] }
  }

  const keys = Object.keys(days)
  if (keys.length === 0) {
    return { ok: false, errors: [{ path: 'days', message: 'No se envió ningún día' }] }
  }

  for (const key of keys) {
    if (!DAY_KEYS.includes(key)) {
      errors.push({ path: `days.${key}`, message: `Día desconocido: ${key}` })
      continue
    }
    const dayErrors = validateDay(days[key])
    for (const message of dayErrors) {
      errors.push({ path: `days.${key}`, message })
    }
  }

  return { ok: errors.length === 0, errors }
}
