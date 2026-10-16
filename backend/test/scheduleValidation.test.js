import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import {
  validateDay,
  validateWeekInput,
  timeToMinutes,
  isValidTimezone,
} from '../src/utils/scheduleValidation.js'

describe('validateDay', () => {
  test('acepta un día válido con jornada partida y descanso', () => {
    const errors = validateDay({
      isWorkingDay: true,
      blocks: [
        { start: '08:00', end: '12:00' },
        { start: '13:00', end: '18:00' },
      ],
      breaks: [{ start: '10:00', end: '10:30' }],
    })
    assert.deepEqual(errors, [])
  })

  test('rechaza 25:99', () => {
    const errors = validateDay({
      isWorkingDay: true,
      blocks: [{ start: '25:99', end: '18:00' }],
      breaks: [],
    })
    assert.ok(errors.some((e) => e.includes('inicio inválida')), errors.join(' | '))
  })

  test('rechaza inicio igual al fin', () => {
    const errors = validateDay({
      isWorkingDay: true,
      blocks: [{ start: '09:00', end: '09:00' }],
      breaks: [],
    })
    assert.ok(errors.some((e) => e.includes('anterior')), errors.join(' | '))
  })

  test('rechaza inicio posterior al fin', () => {
    const errors = validateDay({
      isWorkingDay: true,
      blocks: [{ start: '18:00', end: '09:00' }],
      breaks: [],
    })
    assert.ok(errors.some((e) => e.includes('anterior')), errors.join(' | '))
  })

  test('rechaza bloques solapados', () => {
    const errors = validateDay({
      isWorkingDay: true,
      blocks: [
        { start: '08:00', end: '13:00' },
        { start: '12:00', end: '18:00' },
      ],
      breaks: [],
    })
    assert.ok(errors.some((e) => e.includes('solapan')), errors.join(' | '))
  })

  test('rechaza bloques contiguos? NO: 08-12 y 12-18 son válidos', () => {
    const errors = validateDay({
      isWorkingDay: true,
      blocks: [
        { start: '08:00', end: '12:00' },
        { start: '12:00', end: '18:00' },
      ],
      breaks: [],
    })
    assert.deepEqual(errors, [])
  })

  test('rechaza descanso fuera del horario laboral', () => {
    const errors = validateDay({
      isWorkingDay: true,
      blocks: [{ start: '09:00', end: '18:00' }],
      breaks: [{ start: '07:00', end: '08:00' }],
    })
    assert.ok(errors.some((e) => e.includes('dentro de un bloque')), errors.join(' | '))
  })

  test('rechaza descanso que cruza el final de un bloque', () => {
    const errors = validateDay({
      isWorkingDay: true,
      blocks: [{ start: '09:00', end: '18:00' }],
      breaks: [{ start: '17:00', end: '19:00' }],
    })
    assert.ok(errors.some((e) => e.includes('dentro de un bloque')), errors.join(' | '))
  })

  test('rechaza descansos solapados entre sí', () => {
    const errors = validateDay({
      isWorkingDay: true,
      blocks: [{ start: '08:00', end: '18:00' }],
      breaks: [
        { start: '12:00', end: '13:00' },
        { start: '12:30', end: '13:30' },
      ],
    })
    assert.ok(errors.some((e) => e.includes('solapan')), errors.join(' | '))
  })

  test('acepta día no laborable vacío', () => {
    const errors = validateDay({ isWorkingDay: false, blocks: [], breaks: [] })
    assert.deepEqual(errors, [])
  })

  test('rechaza día no laborable con bloques (datos ambiguos)', () => {
    const errors = validateDay({
      isWorkingDay: false,
      blocks: [{ start: '08:00', end: '12:00' }],
      breaks: [],
    })
    assert.ok(errors.length > 0)
  })

  test('rechaza día laborable sin bloques (intervalo vacío)', () => {
    const errors = validateDay({ isWorkingDay: true, blocks: [], breaks: [] })
    assert.ok(errors.some((e) => e.includes('al menos un bloque')))
  })
})

describe('validateWeekInput', () => {
  test('rechaza un objeto vacío', () => {
    const r = validateWeekInput({})
    assert.equal(r.ok, false)
  })

  test('rechaza claves de día desconocidas', () => {
    const r = validateWeekInput({ lunes: { isWorkingDay: false, blocks: [], breaks: [] } })
    assert.equal(r.ok, false)
    assert.ok(r.errors.some((e) => e.path === 'days.lunes'))
  })

  test('rechaza días inválidos con su ruta', () => {
    const r = validateWeekInput({
      mon: { isWorkingDay: true, blocks: [{ start: '09:00', end: '09:00' }], breaks: [] },
    })
    assert.equal(r.ok, false)
    assert.ok(r.errors.every((e) => e.path === 'days.mon'))
  })

  test('acepta una semana válida', () => {
    const r = validateWeekInput({
      mon: { isWorkingDay: true, blocks: [{ start: '08:00', end: '18:00' }], breaks: [] },
      sun: { isWorkingDay: false, blocks: [], breaks: [] },
    })
    assert.equal(r.ok, true)
    assert.deepEqual(r.errors, [])
  })
})

describe('utilidades de tiempo', () => {
  test('timeToMinutes convierte y valida formato', () => {
    assert.equal(timeToMinutes('08:30'), 510)
    assert.equal(timeToMinutes('00:00'), 0)
    assert.equal(timeToMinutes('23:59'), 1439)
    assert.equal(timeToMinutes('24:00'), null)
    assert.equal(timeToMinutes('7:00'), null) // requiere dos dígitos
    assert.equal(timeToMinutes('08:60'), null)
    assert.equal(timeToMinutes(undefined), null)
  })

  test('isValidTimezone valida zonas IANA', () => {
    assert.equal(isValidTimezone('America/Bogota'), true)
    assert.equal(isValidTimezone('Europe/Madrid'), true)
    assert.equal(isValidTimezone('Marte/Crater'), false)
    assert.equal(isValidTimezone(''), false)
    assert.equal(isValidTimezone(undefined), false)
  })
})
