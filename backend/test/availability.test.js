import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import {
  computeAvailability,
  AvailabilityError,
  isValidDate,
  dayKeyFromDate,
} from '../src/utils/availability.js'

const TZ = 'America/Bogota'

function day(blocks, breaks = [], isWorkingDay = true) {
  return { isWorkingDay, blocks, breaks }
}

describe('computeAvailability — reglas básicas', () => {
  test('día no laborable => cero intervalos', () => {
    const slots = computeAvailability({
      date: '2026-10-19', // lunes
      timezone: TZ,
      day: day([], [], false),
      durationMinutes: 30,
    })
    assert.deepEqual(slots, [])
  })

  test('día sin configuración => cero intervalos', () => {
    const slots = computeAvailability({
      date: '2026-10-19',
      timezone: TZ,
      day: undefined,
      durationMinutes: 30,
    })
    assert.deepEqual(slots, [])
  })

  test('jornada partida: no ofrece intervalos durante el descanso', () => {
    const slots = computeAvailability({
      date: '2026-10-19',
      timezone: TZ,
      day: day(
        [{ start: '08:00', end: '12:00' }, { start: '13:00', end: '18:00' }],
        [{ start: '10:00', end: '10:30' }] // descanso dentro del bloque 1
      ),
      durationMinutes: 30,
      stepMinutes: 30,
    })

    const starts = slots.map((s) => s.start)
    // No hay ningún inicio que se solape con el descanso 10:00–10:30.
    assert.ok(!starts.includes('10:00'))
    // Terminar exactamente cuando empieza el descanso (09:30–10:00) y
    // empezar exactamente cuando termina (10:30–11:00) SÍ son válidos.
    assert.ok(starts.includes('09:30'), 'debe permitirse 09:30–10:00 (colindante)')
    assert.ok(starts.includes('10:30'), 'debe permitirse 10:30–11:00 (colindante)')
    // Sí hay en el bloque 2.
    assert.ok(starts.includes('13:00'))
    // Ningún intervalo toca el descanso.
    for (const s of slots) {
      const touchesBreak = s.startMinutes < 630 && 600 < s.endMinutes // 10:00=600, 10:30=630
      assert.equal(touchesBreak, false, `slot ${s.start}-${s.end} toca el descanso`)
    }
  })

  test('servicio que cabe exactamente hasta el cierre: aceptado', () => {
    const slots = computeAvailability({
      date: '2026-10-19',
      timezone: TZ,
      day: day([{ start: '08:00', end: '08:30' }]),
      durationMinutes: 30,
      stepMinutes: 15,
    })
    assert.equal(slots.length, 1)
    assert.deepEqual({ start: slots[0].start, end: slots[0].end }, { start: '08:00', end: '08:30' })
  })

  test('servicio que excede el cierre: no se ofrece', () => {
    const slots = computeAvailability({
      date: '2026-10-19',
      timezone: TZ,
      day: day([{ start: '08:00', end: '08:30' }]),
      durationMinutes: 40,
    })
    assert.deepEqual(slots, [])
  })

  test('la granularidad NO es la duración del servicio (inicios cada stepMinutes)', () => {
    const slots = computeAvailability({
      date: '2026-10-19',
      timezone: TZ,
      day: day([{ start: '08:00', end: '09:00' }]),
      durationMinutes: 30,
      stepMinutes: 15,
    })
    // Inicios: 08:00, 08:15, 08:30 (08:45 + 30 > 09:00 => no)
    assert.deepEqual(
      slots.map((s) => s.start),
      ['08:00', '08:15', '08:30']
    )
  })

  test('bloques del día generan intervalos dentro de cada bloque', () => {
    const slots = computeAvailability({
      date: '2026-10-19',
      timezone: TZ,
      day: day([{ start: '08:00', end: '12:00' }, { start: '13:00', end: '18:00' }]),
      durationMinutes: 60,
      stepMinutes: 60,
    })
    const starts = slots.map((s) => s.start)
    assert.deepEqual(starts, ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00'])
  })
})

describe('computeAvailability — validación de entradas', () => {
  const base = { timezone: TZ, day: day([{ start: '08:00', end: '18:00' }]), durationMinutes: 30 }

  test('fecha inválida (formato) => AvailabilityError', () => {
    assert.throws(() => computeAvailability({ ...base, date: 'hola' }), AvailabilityError)
    assert.throws(() => computeAvailability({ ...base, date: '19/10/2026' }), AvailabilityError)
  })

  test('fecha inexistente (2026-02-30) => AvailabilityError', () => {
    assert.throws(() => computeAvailability({ ...base, date: '2026-02-30' }), AvailabilityError)
  })

  test('duración fuera de límites => AvailabilityError', () => {
    assert.throws(() => computeAvailability({ ...base, date: '2026-10-19', durationMinutes: 5 }), AvailabilityError)
    assert.throws(() => computeAvailability({ ...base, date: '2026-10-19', durationMinutes: 300 }), AvailabilityError)
    assert.throws(() => computeAvailability({ ...base, date: '2026-10-19', durationMinutes: 12.5 }), AvailabilityError)
  })

  test('zona horaria inválida => AvailabilityError', () => {
    assert.throws(
      () => computeAvailability({ ...base, date: '2026-10-19', timezone: 'Marte/Crater' }),
      AvailabilityError
    )
  })

  test('usa la zona horaria configurada (válida IANA) y no lanza', () => {
    const slots = computeAvailability({
      ...base,
      date: '2026-10-19',
      timezone: 'America/Mexico_City',
    })
    assert.ok(Array.isArray(slots))
    assert.ok(slots.length > 0)
  })
})

describe('utilidades de fecha', () => {
  test('isValidDate acepta fechas reales y rechaza las inventadas', () => {
    assert.equal(isValidDate('2026-10-19'), true)
    assert.equal(isValidDate('2026-02-29'), false) // 2026 no es bisiesto
    assert.equal(isValidDate('2026-13-01'), false)
    assert.equal(isValidDate('2026-1-1'), false)
    assert.equal(isValidDate(undefined), false)
  })

  test('dayKeyFromDate mapea correctamente (sin depender del reloj del servidor)', () => {
    assert.equal(dayKeyFromDate('2026-10-19'), 'mon')
    assert.equal(dayKeyFromDate('2026-10-25'), 'sun')
    assert.equal(dayKeyFromDate('2026-10-20'), 'tue')
  })
})
