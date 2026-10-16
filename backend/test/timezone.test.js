import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import {
  isValidTimezone,
  wallClockToUtc,
  utcToWallClock,
  calendarDateIn,
  timeIn,
} from '../src/utils/timezone.js'

describe('timezone — validación', () => {
  test('acepta zonas IANA válidas', () => {
    assert.equal(isValidTimezone('America/Bogota'), true)
    assert.equal(isValidTimezone('America/Mexico_City'), true)
    assert.equal(isValidTimezone('Europe/Madrid'), true)
  })

  test('rechaza zonas inválidas o vacías', () => {
    assert.equal(isValidTimezone('Marte/Crater'), false)
    assert.equal(isValidTimezone(''), false)
    assert.equal(isValidTimezone(undefined), false)
  })
})

describe('wallClockToUtc', () => {
  test('convierte correctamente en una zona sin DST (Bogotá, UTC-5)', () => {
    // 2026-10-19 08:00 en Bogotá (UTC-5) = 13:00 UTC
    const d = wallClockToUtc('2026-10-19', '08:00', 'America/Bogota')
    assert.equal(d.toISOString(), '2026-10-19T13:00:00.000Z')
  })

  test('convierte correctamente en una zona con DST (Madrid, CET/CEST)', () => {
    // Invierno (CET = UTC+1): 2026-01-15 09:00 en Madrid = 08:00 UTC
    const winter = wallClockToUtc('2026-01-15', '09:00', 'Europe/Madrid')
    assert.equal(winter.toISOString(), '2026-01-15T08:00:00.000Z')

    // Verano (CEST = UTC+2): 2026-07-15 09:00 en Madrid = 07:00 UTC
    const summer = wallClockToUtc('2026-07-15', '09:00', 'Europe/Madrid')
    assert.equal(summer.toISOString(), '2026-07-15T07:00:00.000Z')
  })

  test('la ida y vuelta es consistente (wall -> utc -> wall)', () => {
    const tz = 'America/Mexico_City'
    const utc = wallClockToUtc('2026-11-05', '14:30', tz)
    assert.equal(timeIn(utc.getTime(), tz), '14:30')
    assert.equal(calendarDateIn(utc.getTime(), tz), '2026-11-05')
  })

  test('rechaza zona inválida', () => {
    assert.throws(() => wallClockToUtc('2026-10-19', '08:00', 'Marte/Crater'), /Zona horaria/)
  })
})

describe('utcToWallClock / calendarDateIn / timeIn', () => {
  test('devuelve la hora local correcta', () => {
    // 2026-10-19T13:00Z en Bogotá (UTC-5) = 08:00
    const ms = Date.UTC(2026, 9, 19, 13, 0, 0)
    assert.equal(timeIn(ms, 'America/Bogota'), '08:00')
    assert.equal(calendarDateIn(ms, 'America/Bogota'), '2026-10-19')
  })

  test('cruza la medianoche correctamente', () => {
    // 2026-10-20T02:00Z en Bogotá (UTC-5) = 2026-10-19 21:00
    const ms = Date.UTC(2026, 9, 20, 2, 0, 0)
    assert.equal(calendarDateIn(ms, 'America/Bogota'), '2026-10-19')
    assert.equal(timeIn(ms, 'America/Bogota'), '21:00')
  })
})
