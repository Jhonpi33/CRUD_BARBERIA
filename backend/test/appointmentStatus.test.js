import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import {
  APPOINTMENT_STATUSES,
  VALID_TRANSITIONS,
  canTransition,
  transition,
  AppointmentError,
} from '../src/utils/appointmentStatus.js'

describe('máquina de estados de citas', () => {
  test('define los cinco estados', () => {
    assert.deepEqual(APPOINTMENT_STATUSES, ['pending', 'confirmed', 'completed', 'cancelled', 'no_show'])
  })

  test('pending puede confirmarse o cancelarse', () => {
    assert.equal(canTransition('pending', 'confirmed'), true)
    assert.equal(canTransition('pending', 'cancelled'), true)
    // Pero no completarse ni marcar inasistencia sin confirmar antes.
    assert.equal(canTransition('pending', 'completed'), false)
    assert.equal(canTransition('pending', 'no_show'), false)
  })

  test('confirmed puede completarse, cancelarse o marcarse inasistencia', () => {
    assert.equal(canTransition('confirmed', 'completed'), true)
    assert.equal(canTransition('confirmed', 'cancelled'), true)
    assert.equal(canTransition('confirmed', 'no_show'), true)
    // No vuelve a pending.
    assert.equal(canTransition('confirmed', 'pending'), false)
  })

  test('los estados terminales no permiten salir', () => {
    for (const terminal of ['completed', 'cancelled', 'no_show']) {
      assert.deepEqual(VALID_TRANSITIONS[terminal], [])
      for (const other of APPOINTMENT_STATUSES) {
        assert.equal(canTransition(terminal, other), false)
      }
    }
  })

  test('transiciones a estados desconocidos siempre son inválidas', () => {
    assert.equal(canTransition('pending', 'unknown'), false)
    assert.equal(canTransition('unknown', 'confirmed'), false)
    assert.equal(canTransition(undefined, 'confirmed'), false)
  })

  test('transition devuelve el nuevo estado y la fecha', () => {
    const r = transition({ status: 'pending' }, 'confirmed')
    assert.equal(r.status, 'confirmed')
    assert.ok(r.changedAt instanceof Date)
  })

  test('transition lanza AppointmentError con status 409 en transición inválida', () => {
    assert.throws(
      () => transition({ status: 'completed' }, 'confirmed'),
      (err) => {
        assert.ok(err instanceof AppointmentError)
        assert.equal(err.status, 409)
        assert.equal(err.code, 'INVALID_TRANSITION')
        return true
      }
    )
  })

  test('transition a estado desconocido lanza 422', () => {
    assert.throws(
      () => transition({ status: 'pending' }, 'volando'),
      (err) => {
        assert.ok(err instanceof AppointmentError)
        assert.equal(err.status, 422)
        return true
      }
    )
  })

  test('repetir el mismo estado es idempotente (no lanza)', () => {
    const r = transition({ status: 'confirmed' }, 'confirmed')
    assert.equal(r.status, 'confirmed')
  })
})
