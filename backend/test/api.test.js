/*
  Pruebas de integración de la Fase 4 (servicios, horarios, disponibilidad).

  Requiere MongoDB local (mongodb://127.0.0.1:27017) y usa la BD de test
  `elysia_test` (se vacía al inicio de cada ejecución).
  Ejecutar con: npm test
*/
import './env.js' // DEBE ir primero: fija NODE_ENV antes de cargar la app
import { futureWeekday } from './env.js'

import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'

import app from '../src/app.js'

let server
let base

/** Petición JSON simple contra el servidor de prueba. */
async function req(method, path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
  let data = null
  try {
    data = await res.json()
  } catch {
    /* sin cuerpo */
  }
  return { status: res.status, data }
}

/** Crea una cuenta y (opcionalmente) le asigna rol. */
async function registerUser(role) {
  const email = `t${Date.now()}${Math.random().toString(36).slice(2, 8)}@test.com`
  const r = await req('POST', '/api/auth/register', {
    body: { name: 'Tester Fase 4', email, password: 'secreto123' },
  })
  assert.equal(r.status, 201, `registro falló: ${JSON.stringify(r.data)}`)
  if (role) {
    const rr = await req('PATCH', '/api/auth/role', { token: r.data.token, body: { role } })
    assert.equal(rr.status, 200, `asignar rol falló: ${JSON.stringify(rr.data)}`)
  }
  return { token: r.data.token, userId: r.data.user._id }
}

before(async () => {
  await mongoose.connect(process.env.MONGODB_URI)
  await mongoose.connection.dropDatabase()
  await new Promise((resolve) => {
    server = app.listen(0, resolve)
  })
  base = `http://127.0.0.1:${server.address().port}`
})

after(async () => {
  await new Promise((resolve) => server.close(resolve))
  await mongoose.disconnect()
})

/* ============================== SERVICIOS ============================== */

describe('API de servicios', () => {
  let token
  let foreignToken

  before(async () => {
    ;({ token } = await registerUser('barber'))
    ;({ token: foreignToken } = await registerUser('barber'))
  })

  test('crear un servicio válido => 201', async () => {
    const r = await req('POST', '/api/services', {
      token,
      body: { name: 'Corte clásico', description: 'Tijera y máquina', price: 15000, durationMinutes: 30 },
    })
    assert.equal(r.status, 201)
    assert.equal(r.data.service.name, 'Corte clásico')
    assert.equal(r.data.service.price, 15000)
    assert.equal(r.data.service.durationMinutes, 30)
    assert.equal(r.data.service.isActive, true)
  })

  test('rechazar nombre vacío => 422', async () => {
    const r = await req('POST', '/api/services', {
      token,
      body: { name: '  ', price: 10000, durationMinutes: 30 },
    })
    assert.equal(r.status, 422)
  })

  test('rechazar precio negativo => 422', async () => {
    const r = await req('POST', '/api/services', {
      token,
      body: { name: 'Servicio negativo', price: -1000, durationMinutes: 30 },
    })
    assert.equal(r.status, 422)
  })

  test('rechazar precio no numérico => 422', async () => {
    const r = await req('POST', '/api/services', {
      token,
      body: { name: 'Servicio texto', price: 'mil pesos', durationMinutes: 30 },
    })
    assert.equal(r.status, 422)
  })

  test('rechazar precio infinito => 422', async () => {
    // JSON.parse('1e999') => Infinity (se envía en crudo).
    const res = await fetch(`${base}/api/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: '{"name":"Servicio infinito","price":1e999,"durationMinutes":30}',
    })
    assert.equal(res.status, 422)
  })

  test('rechazar duración < 10 y > 240 => 422', async () => {
    const short = await req('POST', '/api/services', {
      token,
      body: { name: 'Corta duración', price: 5000, durationMinutes: 5 },
    })
    assert.equal(short.status, 422)

    const long = await req('POST', '/api/services', {
      token,
      body: { name: 'Larga duración', price: 5000, durationMinutes: 300 },
    })
    assert.equal(long.status, 422)
  })

  test('ignorar `owner` enviado desde el cliente', async () => {
    const r = await req('POST', '/api/services', {
      token,
      body: {
        name: 'Servicio con owner ajeno',
        price: 12000,
        durationMinutes: 25,
        owner: new mongoose.Types.ObjectId(), // intento de suplantación
      },
    })
    assert.equal(r.status, 201)
    // El owner real es el del token, NO el del body.
    const me = await req('GET', '/api/auth/me', { token })
    assert.equal(String(r.data.service.owner), me.data.user._id)
  })

  test('listar servicios propios (incluye inactivos)', async () => {
    const r = await req('GET', '/api/services', { token })
    assert.equal(r.status, 200)
    assert.ok(Array.isArray(r.data.services))
    // Hasta aquí se crearon: 'Corte clásico' y 'Servicio con owner ajeno'.
    assert.ok(r.data.services.length >= 2)
    assert.ok(r.data.services.some((s) => s.name === 'Corte clásico'))
  })

  test('identificador inválido => 400', async () => {
    const r = await req('GET', '/api/services/no-es-id', { token })
    assert.equal(r.status, 400)
  })

  test('actualizar un servicio propio => 200', async () => {
    const created = await req('POST', '/api/services', {
      token,
      body: { name: 'Barba', price: 10000, durationMinutes: 20 },
    })
    const id = created.data.service._id
    const r = await req('PUT', `/api/services/${id}`, {
      token,
      body: { name: 'Barba completa', description: 'Con toalla caliente', price: 13000, durationMinutes: 25 },
    })
    assert.equal(r.status, 200)
    assert.equal(r.data.service.name, 'Barba completa')
    assert.equal(r.data.service.price, 13000)
  })

  test('consultar y modificar un servicio AJENO => 404', async () => {
    const created = await req('POST', '/api/services', {
      token: foreignToken,
      body: { name: 'Servicio ajeno', price: 9000, durationMinutes: 30 },
    })
    assert.equal(created.status, 201)
    const id = created.data.service._id

    const getR = await req('GET', `/api/services/${id}`, { token })
    assert.equal(getR.status, 404)

    const putR = await req('PUT', `/api/services/${id}`, {
      token,
      body: { name: 'Hackeado', price: 1, durationMinutes: 10 },
    })
    assert.equal(putR.status, 404)

    const patchR = await req('PATCH', `/api/services/${id}/status`, {
      token,
      body: { isActive: false },
    })
    assert.equal(patchR.status, 404)

    const delR = await req('DELETE', `/api/services/${id}`, { token })
    assert.equal(delR.status, 404)

    // El servicio ajeno sigue intacto.
    const own = await req('GET', `/api/services/${id}`, { token: foreignToken })
    assert.equal(own.data.service.name, 'Servicio ajeno')
  })

  test('activar y desactivar un servicio => 200 con estado reflejado', async () => {
    const created = await req('POST', '/api/services', {
      token,
      body: { name: 'Diseño', price: 20000, durationMinutes: 45 },
    })
    const id = created.data.service._id

    const off = await req('PATCH', `/api/services/${id}/status`, {
      token,
      body: { isActive: false },
    })
    assert.equal(off.status, 200)
    assert.equal(off.data.service.isActive, false)

    const on = await req('PATCH', `/api/services/${id}/status`, {
      token,
      body: { isActive: true },
    })
    assert.equal(on.status, 200)
    assert.equal(on.data.service.isActive, true)
  })

  test('isActive no booleano => 422', async () => {
    const created = await req('POST', '/api/services', {
      token,
      body: { name: 'Corte x', price: 8000, durationMinutes: 30 },
    })
    const r = await req('PATCH', `/api/services/${created.data.service._id}/status`, {
      token,
      body: { isActive: 'yes' },
    })
    assert.equal(r.status, 422)
  })

  test('roles sin permiso (admin) => 403', async () => {
    // admin solo se asigna por la ruta controlada del panel interno.
    const { token: adminToken } = await registerUser()
    const { User } = await import('../src/models/User.js')
    const email = (await req('GET', '/api/auth/me', { token: adminToken })).data.user.email
    await User.findOneAndUpdate({ email }, { role: 'admin' })

    const r = await req('GET', '/api/services', { token: adminToken })
    assert.equal(r.status, 403)
  })

  test('sin autenticación => 401', async () => {
    const r = await req('GET', '/api/services')
    assert.equal(r.status, 401)
  })
})

/* ============================== HORARIOS ============================== */

describe('API de horarios', () => {
  const validWeek = {
    timezone: 'America/Bogota',
    days: {
      mon: {
        isWorkingDay: true,
        blocks: [
          { start: '08:00', end: '12:00' },
          { start: '13:00', end: '18:00' },
        ],
        breaks: [{ start: '10:00', end: '10:30' }],
      },
      tue: { isWorkingDay: true, blocks: [{ start: '09:00', end: '18:00' }], breaks: [] },
      wed: { isWorkingDay: true, blocks: [{ start: '09:00', end: '18:00' }], breaks: [] },
      thu: { isWorkingDay: true, blocks: [{ start: '09:00', end: '18:00' }], breaks: [] },
      fri: { isWorkingDay: true, blocks: [{ start: '09:00', end: '20:00' }], breaks: [] },
      sat: { isWorkingDay: true, blocks: [{ start: '09:00', end: '15:00' }], breaks: [] },
      sun: { isWorkingDay: false, blocks: [], breaks: [] },
    },
  }

  let token
  let userId
  let otherToken

  before(async () => {
    ;({ token, userId } = await registerUser('barber'))
    ;({ token: otherToken } = await registerUser('barber'))
  })

  test('GET sin configuración => defaults sin crear datos', async () => {
    const r1 = await req('GET', '/api/schedule/me', { token })
    assert.equal(r1.status, 200)
    assert.equal(r1.data.schedule, null)
    assert.ok(r1.data.defaults)
    assert.equal(r1.data.defaults.timezone, 'America/Bogota')

    // Segunda llamada: sigue sin crear documento.
    const r2 = await req('GET', '/api/schedule/me', { token })
    assert.equal(r2.data.schedule, null)

    const count = await mongoose.connection
      .collection('schedules')
      .countDocuments({ owner: new mongoose.Types.ObjectId(userId) })
    assert.equal(count, 0)
  })

  test('PUT de una semana válida => 200 y persistencia real', async () => {
    const r = await req('PUT', '/api/schedule/me', { token, body: validWeek })
    assert.equal(r.status, 200, JSON.stringify(r.data))
    assert.equal(r.data.schedule.timezone, 'America/Bogota')
    assert.equal(r.data.schedule.days.mon.blocks.length, 2)
    assert.equal(r.data.schedule.days.mon.breaks.length, 1)
    assert.equal(r.data.schedule.days.sun.isWorkingDay, false)

    // Recuperar (lo que queda tras "recargar la página").
    const g = await req('GET', '/api/schedule/me', { token })
    assert.equal(g.status, 200)
    assert.equal(g.data.schedule.days.fri.blocks[0].end, '20:00')
  })

  test('rechazar 25:99 => 422', async () => {
    const r = await req('PUT', '/api/schedule/me', {
      token,
      body: {
        days: {
          mon: { isWorkingDay: true, blocks: [{ start: '25:99', end: '18:00' }], breaks: [] },
        },
      },
    })
    assert.equal(r.status, 422)
  })

  test('rechazar inicio igual o posterior al fin => 422', async () => {
    const igual = await req('PUT', '/api/schedule/me', {
      token,
      body: { days: { mon: { isWorkingDay: true, blocks: [{ start: '09:00', end: '09:00' }], breaks: [] } } },
    })
    assert.equal(igual.status, 422)

    const posterior = await req('PUT', '/api/schedule/me', {
      token,
      body: { days: { tue: { isWorkingDay: true, blocks: [{ start: '18:00', end: '09:00' }], breaks: [] } } },
    })
    assert.equal(posterior.status, 422)
  })

  test('rechazar bloques solapados => 422', async () => {
    const r = await req('PUT', '/api/schedule/me', {
      token,
      body: {
        days: {
          wed: {
            isWorkingDay: true,
            blocks: [
              { start: '08:00', end: '13:00' },
              { start: '12:00', end: '18:00' },
            ],
            breaks: [],
          },
        },
      },
    })
    assert.equal(r.status, 422)
  })

  test('rechazar descanso fuera del horario laboral => 422', async () => {
    const r = await req('PUT', '/api/schedule/me', {
      token,
      body: {
        days: {
          thu: {
            isWorkingDay: true,
            blocks: [{ start: '09:00', end: '18:00' }],
            breaks: [{ start: '07:00', end: '08:00' }],
          },
        },
      },
    })
    assert.equal(r.status, 422)
  })

  test('aceptar día no laborable => 200', async () => {
    const r = await req('PUT', '/api/schedule/me', {
      token,
      body: { days: { sun: { isWorkingDay: false, blocks: [], breaks: [] } } },
    })
    assert.equal(r.status, 200)
    assert.equal(r.data.schedule.days.sun.isWorkingDay, false)
  })

  test('merge por día: un PUT parcial no borra los demás días', async () => {
    const r = await req('PUT', '/api/schedule/me', {
      token,
      body: { days: { sat: { isWorkingDay: true, blocks: [{ start: '10:00', end: '14:00' }], breaks: [] } } },
    })
    assert.equal(r.status, 200)
    assert.equal(r.data.schedule.days.sat.blocks[0].start, '10:00')
    // Los días previos siguen intactos.
    assert.equal(r.data.schedule.days.mon.blocks.length, 2)
    assert.equal(r.data.schedule.days.fri.blocks[0].end, '20:00')
  })

  test('el propietario no puede modificarse desde el body', async () => {
    const r = await req('PUT', '/api/schedule/me', {
      token,
      body: { owner: new mongoose.Types.ObjectId(), timezone: 'America/Bogota' },
    })
    assert.equal(r.status, 200)
    assert.equal(String(r.data.schedule.owner), userId)
  })

  test('no se puede leer ni cambiar el horario de otro usuario', async () => {
    // otherToken no tiene configuración propia...
    const mine = await req('GET', '/api/schedule/me', { token: otherToken })
    assert.equal(mine.data.schedule, null)

    // ...y su PUT no afecta la de `token`.
    await req('PUT', '/api/schedule/me', {
      token: otherToken,
      body: { days: { mon: { isWorkingDay: false, blocks: [], breaks: [] } } },
    })
    const still = await req('GET', '/api/schedule/me', { token })
    assert.equal(still.data.schedule.days.mon.isWorkingDay, true)
    assert.equal(still.data.schedule.days.mon.blocks.length, 2)
  })

  test('solo existe una configuración por dueño (unicidad)', async () => {
    const count = await mongoose.connection
      .collection('schedules')
      .countDocuments({ owner: new mongoose.Types.ObjectId(userId) })
    assert.equal(count, 1)
  })

  test('zona horaria inválida => 422', async () => {
    const r = await req('PUT', '/api/schedule/me', {
      token,
      body: { timezone: 'Marte/Crater' },
    })
    assert.equal(r.status, 422)
  })
})

/* ============================ DISPONIBILIDAD ============================ */

describe('API de disponibilidad', () => {
  let token
  let serviceId
  let inactiveId
  let foreignServiceId
  let foreignToken
  let userId

  const week = {
    timezone: 'America/Bogota',
    days: {
      mon: {
        isWorkingDay: true,
        blocks: [
          { start: '08:00', end: '12:00' },
          { start: '13:00', end: '18:00' },
        ],
        breaks: [{ start: '10:00', end: '10:30' }],
      },
      sun: { isWorkingDay: false, blocks: [], breaks: [] },
    },
  }

  before(async () => {
    ;({ token, userId } = await registerUser('barber'))
    ;({ token: foreignToken } = await registerUser('barber'))

    await req('PUT', '/api/schedule/me', { token, body: week })

    const s = await req('POST', '/api/services', {
      token,
      body: { name: 'Corte 30', price: 15000, durationMinutes: 30 },
    })
    serviceId = s.data.service._id

    const inactive = await req('POST', '/api/services', {
      token,
      body: { name: 'Corte inactivo', price: 15000, durationMinutes: 30, isActive: false },
    })
    inactiveId = inactive.data.service._id

    const f = await req('POST', '/api/services', {
      token: foreignToken,
      body: { name: 'Servicio de otro', price: 10000, durationMinutes: 30 },
    })
    foreignServiceId = f.data.service._id
  })

  const mon = futureWeekday(1) // lunes futuro
  const sun = futureWeekday(0) // domingo futuro

  test('día no laborable => cero intervalos', async () => {
    const r = await req('GET', `/api/availability?date=${sun}&serviceId=${serviceId}`, { token })
    assert.equal(r.status, 200)
    assert.deepEqual(r.data.slots, [])
    assert.equal(r.data.timezone, 'America/Bogota') // usa la zona configurada
  })

  test('jornada partida: ningún intervalo toca el descanso', async () => {
    const r = await req('GET', `/api/availability?date=${mon}&serviceId=${serviceId}`, { token })
    assert.equal(r.status, 200)
    assert.ok(r.data.slots.length > 0)

    const toMin = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3))
    for (const slot of r.data.slots) {
      const inBreak = toMin(slot.start) < 630 && 600 < toMin(slot.end) // 10:00–10:30
      assert.equal(inBreak, false, `slot ${slot.start}-${slot.end} toca el descanso`)
      // Nunca dentro de la pausa entre bloques (12:00–13:00).
      const inGap = toMin(slot.start) >= 720 && toMin(slot.start) < 780
      assert.equal(inGap, false)
    }
  })

  test('servicio que cabe exactamente hasta el cierre: aceptado (11:30–12:00)', async () => {
    const r = await req('GET', `/api/availability?date=${mon}&serviceId=${serviceId}`, { token })
    const exact = r.data.slots.find((s) => s.start === '11:30' && s.end === '12:00')
    assert.ok(exact, 'debe existir el intervalo 11:30–12:00')
  })

  test('servicio que excede el cierre: no se ofrece', async () => {
    const r = await req('GET', `/api/availability?date=${mon}&serviceId=${serviceId}`, { token })
    // Ningún slot debe empezar a las 11:45 (11:45+30 = 12:15 > 12:00).
    assert.ok(!r.data.slots.some((s) => s.start === '11:45'))
    // Ni terminar después del cierre de su bloque.
    for (const slot of r.data.slots) {
      const end = Number(slot.end.slice(0, 2)) * 60 + Number(slot.end.slice(3))
      const inMorning = Number(slot.start.slice(0, 2)) < 12
      assert.ok(end <= (inMorning ? 720 : 1080), `slot ${slot.start}-${slot.end} excede el cierre`)
    }
  })

  test('servicio inactivo => 404', async () => {
    const r = await req('GET', `/api/availability?date=${mon}&serviceId=${inactiveId}`, { token })
    assert.equal(r.status, 404)
  })

  test('fecha inválida => 422', async () => {
    const r = await req('GET', `/api/availability?date=2026-02-30&serviceId=${serviceId}`, { token })
    assert.equal(r.status, 422)

    const r2 = await req('GET', `/api/availability?date=hola&serviceId=${serviceId}`, { token })
    assert.equal(r2.status, 422)
  })

  test('identificador de servicio inválido => 400', async () => {
    const r = await req('GET', `/api/availability?date=${mon}&serviceId=no-id`, { token })
    assert.equal(r.status, 400)
  })

  test('servicio de OTRO usuario => 404 (política privada)', async () => {
    const r = await req('GET', `/api/availability?date=${mon}&serviceId=${foreignServiceId}`, { token })
    assert.equal(r.status, 404)
  })

  test('sin autenticación => 401', async () => {
    const r = await req('GET', `/api/availability?date=${mon}&serviceId=${serviceId}`)
    assert.equal(r.status, 401)
  })
})
