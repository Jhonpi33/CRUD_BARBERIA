import assert from 'node:assert/strict'
import { test } from 'node:test'
import api from '../src/services/api.js'
import { getBookingData } from '../src/services/bookingConnection.js'

test('reintenta lecturas temporales y conserva los parámetros', async t => {
  const calls = []
  let waiting = 0
  t.mock.method(api, 'get', async (url, config) => {
    calls.push({ url, config })
    if (calls.length === 1) throw { response: { status: 503 } }
    return { data: { slots: [{ start: '09:00' }] } }
  })
  const params = { serviceId: 'service', date: '2026-12-01' }
  const result = await getBookingData('/availability', {
    params, onWaiting: () => { waiting++ },
  })
  assert.equal(calls.length, 2)
  assert.equal(waiting, 1)
  assert.deepEqual(calls[1].config.params, params)
  assert.equal(result.data.slots[0].start, '09:00')
})

test('un rechazo definitivo no se repite', async t => {
  let calls = 0
  const failure = { response: { status: 404 } }
  t.mock.method(api, 'get', async () => { calls++; throw failure })
  await assert.rejects(getBookingData('/missing'), error => error === failure)
  assert.equal(calls, 1)
})

test('cambiar de selección cancela los reintentos pendientes', async t => {
  const controller = new AbortController()
  let calls = 0
  t.mock.method(api, 'get', async () => {
    calls++
    throw { code: 'ECONNABORTED' }
  })
  await assert.rejects(getBookingData('/availability', {
    signal: controller.signal,
    onWaiting: () => controller.abort(),
  }))
  assert.equal(calls, 1)
})

test('la espera termina al agotar el plazo', async t => {
  let clock = 0
  let calls = 0
  t.mock.method(Date, 'now', () => clock)
  const failure = { code: 'ETIMEDOUT' }
  t.mock.method(api, 'get', async () => {
    calls++
    clock = 90000
    throw failure
  })
  await assert.rejects(getBookingData('/availability'), error => error === failure)
  assert.equal(calls, 1)
})
