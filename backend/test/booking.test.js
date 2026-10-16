import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import {
  STEP_MINUTES,
  slotKey,
  overlaps,
  occupiedSlotKeys,
  filterBusySlots,
  computeFreeSlots,
  busyRangeFromAppointment,
  busyRangesFromAppointments,
} from '../src/utils/booking.js'

const TZ = 'America/Bogota'

describe('booking — overlaps', () => {
  test('intervalos que se cruzan se solapan', () => {
    assert.equal(overlaps(480, 510, 500, 530), true)
  })

  test('adyacentes (fin = inicio) NO se solapan (semántica media-abierta)', () => {
    assert.equal(overlaps(480, 510, 510, 540), false)
  })

  test('intervalos separados no se solapan', () => {
    assert.equal(overlaps(480, 510, 540, 570), false)
  })

  test('contención sí se solapa', () => {
    assert.equal(overlaps(480, 600, 500, 520), true)
  })
})

describe('booking — occupiedSlotKeys', () => {
  test('una cita de 45 min con step 15 bloquea 3 claves', () => {
    // 08:00 = 480; bloquea 480, 495, 510 (el inicio 525 = 08:45 es el de la
    // siguiente cita y NO se bloquea).
    const keys = occupiedSlotKeys('2026-10-19', 480, 45, 15)
    assert.deepEqual(keys, [
      '2026-10-19T08:00',
      '2026-10-19T08:15',
      '2026-10-19T08:30',
    ])
  })

  test('una cita de 30 min bloquea 2 claves', () => {
    const keys = occupiedSlotKeys('2026-10-19', 480, 30, 15)
    assert.deepEqual(keys, ['2026-10-19T08:00', '2026-10-19T08:15'])
  })

  test('dos citas adyacentes NO comparten claves (pueden coexistir)', () => {
    // 08:00-08:30 y 08:30-09:00
    const a = occupiedSlotKeys('2026-10-19', 480, 30, 15)
    const b = occupiedSlotKeys('2026-10-19', 510, 30, 15)
    const compartidas = a.filter((k) => b.includes(k))
    assert.deepEqual(compartidas, [])
  })

  test('dos citas solapadas SÍ comparten claves (el índice único las rechazará)', () => {
    // 08:00-08:45 y 08:15-08:45
    const a = occupiedSlotKeys('2026-10-19', 480, 45, 15)
    const b = occupiedSlotKeys('2026-10-19', 495, 30, 15)
    const compartidas = a.filter((k) => b.includes(k))
    assert.ok(compartidas.length > 0, 'deben compartir al menos una clave')
  })

  test('slotKey formatea correctamente', () => {
    assert.equal(slotKey('2026-10-19', 480), '2026-10-19T08:00')
    assert.equal(slotKey('2026-10-19', 59), '2026-10-19T00:59')
    assert.equal(slotKey('2026-10-19', 1439), '2026-10-19T23:59')
  })
})

describe('booking — filterBusySlots', () => {
  const slots = [
    { start: '08:00', end: '08:30', startMinutes: 480, endMinutes: 510 },
    { start: '08:30', end: '09:00', startMinutes: 510, endMinutes: 540 },
    { start: '09:00', end: '09:30', startMinutes: 540, endMinutes: 570 },
  ]

  test('sin rangos ocupados devuelve todo', () => {
    assert.deepEqual(filterBusySlots(slots, []), slots)
  })

  test('quita los slots que se solapan con un rango ocupado', () => {
    const busy = [{ startMinutes: 480, endMinutes: 510 }] // 08:00-08:30 ocupada
    const free = filterBusySlots(slots, busy)
    assert.deepEqual(free.map((s) => s.start), ['08:30', '09:00'])
  })

  test('un rango adyacente NO elimina el slot contiguo', () => {
    const busy = [{ startMinutes: 450, endMinutes: 480 }] // termina 08:00
    const free = filterBusySlots(slots, busy)
    assert.equal(free.length, 3, 'ningún slot se toca con el rango adyacente')
  })
})

describe('booking — computeFreeSlots (reutiliza availability de la Fase 4)', () => {
  const day = {
    isWorkingDay: true,
    blocks: [{ start: '08:00', end: '12:00' }],
    breaks: [],
  }

  test('con la agenda vacía devuelve la disponibilidad teórica', () => {
    const free = computeFreeSlots({
      date: '2026-10-19',
      timezone: TZ,
      day,
      durationMinutes: 30,
      stepMinutes: 15,
      busyRanges: [],
    })
    assert.ok(free.length > 0)
    // Primer inicio 08:00, último que cabe: 11:30 (11:30+30=12:00).
    assert.equal(free[0].start, '08:00')
    assert.equal(free[free.length - 1].start, '11:30')
  })

  test('descuenta los intervalos ocupados por citas existentes', () => {
    const free = computeFreeSlots({
      date: '2026-10-19',
      timezone: TZ,
      day,
      durationMinutes: 30,
      stepMinutes: 15,
      busyRanges: [{ startMinutes: 480, endMinutes: 540 }], // 08:00-09:00
    })
    // Ningún inicio debe producir un intervalo que toque 08:00-09:00.
    for (const s of free) {
      const overlapsBusy = s.startMinutes < 540 && 480 < s.endMinutes
      assert.equal(overlapsBusy, false, `slot ${s.start}-${s.end} toca la cita`)
    }
    assert.equal(free[0].start, '09:00')
  })

  test('día no laborable devuelve vacío aunque haya citas', () => {
    const free = computeFreeSlots({
      date: '2026-10-25',
      timezone: TZ,
      day: { isWorkingDay: false, blocks: [], breaks: [] },
      durationMinutes: 30,
      busyRanges: [{ startMinutes: 480, endMinutes: 510 }],
    })
    assert.deepEqual(free, [])
  })
})

describe('booking — busyRangeFromAppointment', () => {
  test('convierte una cita con startMinutes/endMinutes', () => {
    const r = busyRangeFromAppointment({ startMinutes: 480, endMinutes: 510 })
    assert.deepEqual(r, { startMinutes: 480, endMinutes: 510 })
  })

  test('descarta citas mal formadas', () => {
    assert.equal(busyRangeFromAppointment(null), null)
    assert.equal(busyRangeFromAppointment({}), null)
  })

  test('busyRangesFromAppointments filtra nulos', () => {
    const ranges = busyRangesFromAppointments([
      { startMinutes: 480, endMinutes: 510 },
      null,
      { startMinutes: 600, endMinutes: 630 },
    ])
    assert.equal(ranges.length, 2)
  })
})
