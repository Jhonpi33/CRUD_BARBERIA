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
  isSlotInPast,
  filterPastSlots,
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

/*
  Validación de PASADO: la API de reservas es pública, así que sin esto un
  POST directo podría agendar para el mes pasado aunque la interfaz no lo
  ofrezca. Todo se compara en la zona del DUEÑO; `now` se inyecta para que
  el test no dependa del reloj real.
*/
describe('booking — isSlotInPast', () => {
  // "Ahora" = 2026-10-22 10:30 en Bogotá (UTC-5) => 15:30 UTC.
  const NOW = new Date('2026-10-22T15:30:00Z')

  test('fecha anterior a hoy => en el pasado', () => {
    assert.equal(
      isSlotInPast({ date: '2026-10-21', start: '18:00', timezone: TZ, now: NOW }),
      true
    )
  })

  test('mes pasado => en el pasado', () => {
    assert.equal(
      isSlotInPast({ date: '2026-09-01', start: '08:00', timezone: TZ, now: NOW }),
      true
    )
  })

  test('hoy, hora ya pasada => en el pasado', () => {
    assert.equal(
      isSlotInPast({ date: '2026-10-22', start: '08:00', timezone: TZ, now: NOW }),
      true
    )
  })

  test('hoy, hora exactamente AHORA => ya no se puede atender', () => {
    assert.equal(
      isSlotInPast({ date: '2026-10-22', start: '10:30', timezone: TZ, now: NOW }),
      true
    )
  })

  test('hoy, hora futura => SÍ se puede reservar', () => {
    assert.equal(
      isSlotInPast({ date: '2026-10-22', start: '11:00', timezone: TZ, now: NOW }),
      false
    )
  })

  test('fecha futura => SÍ se puede reservar aunque sea temprano', () => {
    assert.equal(
      isSlotInPast({ date: '2026-10-23', start: '07:00', timezone: TZ, now: NOW }),
      false
    )
  })

  test('se compara en la zona del DUEÑO, no en la del servidor', () => {
    // Instante 2026-10-23T04:00Z => en Bogotá (UTC-5) son 22/10 23:00,
    // pero en Tokio (UTC+9) ya son 23/10 13:00. El "hoy" cambia de zona.
    const NOW = new Date('2026-10-23T04:00:00Z')

    // Dueño en Bogotá: para él todavía es 22/10 y son las 23:00,
    // así que una cita el 22/10 a las 23:30 es FUTURA.
    assert.equal(
      isSlotInPast({
        date: '2026-10-22',
        start: '23:30',
        timezone: 'America/Bogota',
        now: NOW,
      }),
      false
    )

    // Mismo instante y misma cita, pero el dueño está en Tokio: allí ya es
    // 23/10, por lo que esa fecha quedó ATRÁS. El servidor no decide: decide
    // la zona del dueño.
    assert.equal(
      isSlotInPast({
        date: '2026-10-22',
        start: '23:30',
        timezone: 'Asia/Tokyo',
        now: NOW,
      }),
      true
    )
  })

  test('formato de hora inválido => tratado como no reservable', () => {
    assert.equal(
      isSlotInPast({ date: '2026-10-25', start: '25:99', timezone: TZ, now: NOW }),
      true
    )
  })
})

describe('booking — filterPastSlots', () => {
  const NOW = new Date('2026-10-22T15:30:00Z') // 10:30 en Bogotá

  test('quita solo los de hoy que ya pasaron', () => {
    const slots = [
      { start: '08:00', end: '08:30' },
      { start: '10:30', end: '11:00' },
      { start: '11:00', end: '11:30' },
    ]
    const out = filterPastSlots(slots, '2026-10-22', TZ, NOW)
    assert.deepEqual(out.map((s) => s.start), ['11:00'])
  })

  test('en una fecha futura no descarta nada', () => {
    const slots = [
      { start: '08:00', end: '08:30' },
      { start: '09:00', end: '09:30' },
    ]
    const out = filterPastSlots(slots, '2026-10-25', TZ, NOW)
    assert.equal(out.length, 2)
  })

  test('entradas no-array devuelven lista vacía', () => {
    assert.deepEqual(filterPastSlots(null, '2026-10-25', TZ, NOW), [])
  })
})
