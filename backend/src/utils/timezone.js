/*
  Utilidades PURO de zona horaria (Fase 5).
  Sin MongoDB ni Express: testeable con node:test.

  Las citas se guardan como instantes UTC (`startUtc`/`endUtc`) para poder
  compararlas, ordenarlas y detectar solapes sin ambigüedad. A la vez se
  guarda la fecha de calendario y las horas "wall-clock" en la zona del
  dueño, que es como piensan los humanos y los horarios de atención.

  Toda conversión es explícita: nunca se usa el reloj del servidor.
*/

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

/**
 * Descompone un instante UTC en las "piezas" de reloj de pared de una zona.
 * @param {number} ms milisegundos UTC
 * @param {string} timeZone zona IANA
 * @returns {{ year:number, month:number, day:number, hour:number, minute:number, second:number }}
 */
export function utcToWallClock(ms, timeZone) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const parts = {}
  for (const p of dtf.formatToParts(new Date(ms))) {
    parts[p.type] = p.value
  }
  // Intl puede devolver hour=24 en someLocale/hour12:false; normalizamos.
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
    second: Number(parts.second),
  }
}

/**
 * Convierte una fecha de calendario + hora "wall-clock" de una zona IANA
 * al instante UTC correspondiente.
 *
 * Algoritmo: se parte de una aproximación (la misma hora en UTC) y se
 * corrige restando el desfase observado. Se itera dos veces para resolver
 * correctamente los cambios de horario de verano (DST), donde el desfase
 * cambia justo en esa fecha.
 *
 * @param {string} date  'YYYY-MM-DD' (fecha de calendario en `timeZone`)
 * @param {string} time  'HH:MM'      (hora de pared en `timeZone`)
 * @param {string} timeZone zona IANA
 * @returns {Date} instante UTC
 * @throws {Error} si la zona no es válida
 */
export function wallClockToUtc(date, time, timeZone) {
  if (!isValidTimezone(timeZone)) {
    throw new Error(`Zona horaria inválida: ${timeZone}`)
  }
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)
  if ([y, m, d, hh, mm].some((n) => !Number.isInteger(n))) {
    throw new Error('Fecha u hora mal formadas')
  }

  // Aproximación inicial: la misma hora tratada como si fuera UTC.
  const guess = Date.UTC(y, m - 1, d, hh, mm, 0, 0)

  // ¿Qué hora de pared ve esa zona en ese instante?
  const seen = utcToWallClock(guess, timeZone)
  const seenAsUtc = Date.UTC(seen.year, seen.month - 1, seen.day, seen.hour, seen.minute, 0, 0)
  const offset = seenAsUtc - guess // desfase de la zona en ese instante

  let result = new Date(guess - offset)

  // Refinamiento para DST: si al mirar el resultado el desfase observado
  // difiere (el cambio de horario ocurrió dentro del intervalo estimado),
  // se recalcula con el desfase correcto.
  const seen2 = utcToWallClock(result.getTime(), timeZone)
  const seen2AsUtc = Date.UTC(seen2.year, seen2.month - 1, seen2.day, seen2.hour, seen2.minute, 0, 0)
  const offset2 = seen2AsUtc - result.getTime()
  if (offset2 !== offset) {
    result = new Date(guess - offset2)
  }

  return result
}

/** Fecha de calendario (YYYY-MM-DD) de un instante UTC en una zona. */
export function calendarDateIn(ms, timeZone) {
  const w = utcToWallClock(ms, timeZone)
  const y = String(w.year).padStart(4, '0')
  const m = String(w.month).padStart(2, '0')
  const d = String(w.day).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Hora 'HH:MM' (wall-clock) de un instante UTC en una zona. */
export function timeIn(ms, timeZone) {
  const w = utcToWallClock(ms, timeZone)
  const hh = String(w.hour).padStart(2, '0')
  const mm = String(w.minute).padStart(2, '0')
  return `${hh}:${mm}`
}
