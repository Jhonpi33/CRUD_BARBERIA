/*
  Pruebas de integración de la Fase 5 (citas, reservas públicas, clientes).

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
import { Appointment } from '../src/models/Appointment.js'
import { Client } from '../src/models/Client.js'
import { Service } from '../src/models/Service.js'
import { Schedule } from '../src/models/Schedule.js'
import { Profile } from '../src/models/Profile.js'

let server
let base

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

/** Crea cuenta, le asigna rol, completa el perfil (con slug) y devuelve todo lo necesario. */
async function createOwner({ slug }) {
  const email = `dueño${Date.now()}${Math.random().toString(36).slice(2, 8)}@test.com`
  const r = await req('POST', '/api/auth/register', {
    body: { name: 'Dueño Agenda', email, password: 'secreto123' },
  })
  assert.equal(r.status, 201)
  const token = r.data.token

  const rr = await req('PATCH', '/api/auth/role', { token, body: { role: 'barber' } })
  assert.equal(rr.status, 200)

  // Borrador + completar (misma secuencia que el frontend del onboarding).
  await req('PUT', '/api/profile/me', {
    token,
    body: {
      professionalName: 'Dueño Agenda',
      phone: '+57 300 111 2233',
      location: 'Bogotá, Colombia',
      description: 'Barbero de pruebas',
    },
  })
  const done = await req('PATCH', '/api/profile/me/complete', { token, body: { yearsOfExperience: 3 } })
  assert.equal(done.status, 200, JSON.stringify(done.data))

  // Ajusta el slug al deseado para las pruebas públicas.
  await Profile.updateOne({ owner: r.data.user._id }, { $set: { slug } })

  // Un servicio activo por defecto.
  const svc = await req('POST', '/api/services', {
    token,
    body: { name: 'Corte', price: 15000, durationMinutes: 30 },
  })
  assert.equal(svc.status, 201)

  // Horario: lunes 08:00-12:00, resto no laborable (para fechas fijas).
  const week = {
    timezone: 'America/Bogota',
    days: {
      mon: { isWorkingDay: true, blocks: [{ start: '08:00', end: '12:00' }], breaks: [] },
      tue: { isWorkingDay: false, blocks: [], breaks: [] },
      wed: { isWorkingDay: false, blocks: [], breaks: [] },
      thu: { isWorkingDay: false, blocks: [], breaks: [] },
      fri: { isWorkingDay: false, blocks: [], breaks: [] },
      sat: { isWorkingDay: false, blocks: [], breaks: [] },
      sun: { isWorkingDay: false, blocks: [], breaks: [] },
    },
  }
  const sch = await req('PUT', '/api/schedule/me', { token, body: week })
  assert.equal(sch.status, 200, JSON.stringify(sch.data))

  return { token, userId: r.data.user._id, serviceId: svc.data.service._id }
}

/** Espera a que los índices (incluido el único parcial) estén listos. */
async function ensureIndexes() {
  await Appointment.init()
  await Client.init()
  await Service.init()
}

before(async () => {
  await mongoose.connect(process.env.MONGODB_URI)
  await mongoose.connection.dropDatabase()
  await new Promise((resolve) => {
    server = app.listen(0, resolve)
  })
  base = `http://127.0.0.1:${server.address().port}`
  await ensureIndexes()
})

after(async () => {
  await new Promise((resolve) => server.close(resolve))
  await mongoose.disconnect()
})

/* ======================= RESERVAS PÚBLICAS ======================= */

describe('Reserva pública (POST /api/public/booking/:slug)', () => {
  let owner
  const MON = futureWeekday(1) // lunes futuro

  before(async () => {
    owner = await createOwner({ slug: 'dueno-agenda' })
  })

  test('GET /api/public/booking/:slug devuelve perfil y servicios activos', async () => {
    const r = await req('GET', '/api/public/booking/dueno-agenda')
    assert.equal(r.status, 200)
    assert.equal(r.data.profile.name, 'Dueño Agenda')
    assert.equal(r.data.services.length, 1)
    assert.equal(r.data.services[0].name, 'Corte')
  })

  test('GET availability devuelve huecos libres reales', async () => {
    const r = await req(
      'GET',
      `/api/public/booking/dueno-agenda/availability?serviceId=${owner.serviceId}&date=${MON}`
    )
    assert.equal(r.status, 200)
    assert.ok(r.data.slots.length > 0)
    assert.equal(r.data.slots[0].start, '08:00')
    assert.equal(r.data.timezone, 'America/Bogota')
  })

  test('crear una reserva pública válida => 201 con datos del servicio copiados', async () => {
    const r = await req('POST', '/api/public/booking/dueno-agenda', {
      body: {
        serviceId: owner.serviceId,
        date: MON,
        start: '08:00',
        name: 'Cliente Uno',
        phone: '+57 311 222 3344',
      },
    })
    assert.equal(r.status, 201, JSON.stringify(r.data))
    assert.equal(r.data.appointment.status, 'pending')
    assert.equal(r.data.appointment.service.name, 'Corte')
    assert.equal(r.data.appointment.service.price, 15000)
    assert.equal(r.data.appointment.service.durationMinutes, 30)
    assert.equal(r.data.appointment.start, '08:00')
    assert.equal(r.data.appointment.end, '08:30')
  })

  test('la reserva ocupa el hueco: availability lo descuenta', async () => {
    const r = await req(
      'GET',
      `/api/public/booking/dueno-agenda/availability?serviceId=${owner.serviceId}&date=${MON}`
    )
    // 08:00 ya no está; el primero libre empieza a las 08:30 o después.
    const starts = r.data.slots.map((s) => s.start)
    assert.ok(!starts.includes('08:00'), '08:00 debe estar ocupado')
  })

  test('reservar un hueco ya ocupado => 409', async () => {
    const r = await req('POST', '/api/public/booking/dueno-agenda', {
      body: {
        serviceId: owner.serviceId,
        date: MON,
        start: '08:00',
        name: 'Cliente Dos',
        phone: '+57 311 999 8877',
      },
    })
    assert.equal(r.status, 409)
    assert.ok(['SLOT_UNAVAILABLE', 'SLOT_TAKEN'].includes(r.data.code))
  })

  test('reservar un hueco solapado (no idéntico) => 409', async () => {
    // La cita existente es 08:00-08:30. Un inicio a las 08:15 solaparía.
    const r = await req('POST', '/api/public/booking/dueno-agenda', {
      body: {
        serviceId: owner.serviceId,
        date: MON,
        start: '08:15',
        name: 'Cliente Tres',
        phone: '+57 311 555 4433',
      },
    })
    assert.equal(r.status, 409)
  })

  test('el propietario se deduce del slug, nunca del body', async () => {
    const otro = await createOwner({ slug: 'otro-dueno' })
    const r = await req('POST', '/api/public/booking/dueno-agenda', {
      body: {
        serviceId: otro.serviceId, // servicio de OTRO dueño
        date: MON,
        start: '09:00',
        name: 'Cliente Cuatro',
        phone: '+57 311 111 0000',
      },
    })
    // El servicio no pertenece a dueno-agenda => 404.
    assert.equal(r.status, 404)
  })

  test('servicio inactivo => 404 (no se puede reservar)', async () => {
    const off = await req('PATCH', `/api/services/${owner.serviceId}/status`, {
      token: owner.token,
      body: { isActive: false },
    })
    assert.equal(off.status, 200)

    const r = await req('POST', '/api/public/booking/dueno-agenda', {
      body: {
        serviceId: owner.serviceId,
        date: MON,
        start: '10:00',
        name: 'Cliente Cinco',
        phone: '+57 311 222 0000',
      },
    })
    assert.equal(r.status, 404)

    // Lo reactiva para el resto de pruebas.
    await req('PATCH', `/api/services/${owner.serviceId}/status`, {
      token: owner.token,
      body: { isActive: true },
    })
  })

  test('día no laborable => ningún hueco', async () => {
    const r = await req(
      'GET',
      `/api/public/booking/dueno-agenda/availability?serviceId=${owner.serviceId}&date=${futureWeekday(2)}`
    ) // martes
    assert.equal(r.status, 200)
    assert.deepEqual(r.data.slots, [])
  })

  test('nombre o teléfono inválidos => 422', async () => {
    const sinNombre = await req('POST', '/api/public/booking/dueno-agenda', {
      body: { serviceId: owner.serviceId, date: MON, start: '11:00', name: ' ', phone: '+57 311 222 3344' },
    })
    assert.equal(sinNombre.status, 422)

    const sinTelefono = await req('POST', '/api/public/booking/dueno-agenda', {
      body: { serviceId: owner.serviceId, date: MON, start: '11:00', name: 'Cliente', phone: '12' },
    })
    assert.equal(sinTelefono.status, 422)
  })

  test('fecha inválida => 422', async () => {
    const r = await req('POST', '/api/public/booking/dueno-agenda', {
      body: { serviceId: owner.serviceId, date: '2026-02-30', start: '09:00', name: 'Cliente', phone: '+57 311 222 3344' },
    })
    assert.equal(r.status, 422)
  })

  test('hora fuera de horario => 409', async () => {
    const r = await req('POST', '/api/public/booking/dueno-agenda', {
      body: { serviceId: owner.serviceId, date: MON, start: '05:00', name: 'Cliente', phone: '+57 311 222 3344' },
    })
    assert.equal(r.status, 409)
  })

  test('el cliente se deduplica por teléfono (no se duplica)', async () => {
    const count = await Client.countDocuments({
      owner: owner.userId,
      phoneNormalized: '573112223344',
    })
    // Cliente Uno (+57 311 222 3344) y Cliente Cinco usaron otros números,
    // pero el mismo número con distinto formato debe dar UN solo cliente.
    const otroFormato = await req('POST', '/api/public/booking/dueno-agenda', {
      body: {
        serviceId: owner.serviceId,
        date: MON,
        start: '10:30',
        name: 'Cliente Uno (formato raro)',
        phone: '57 311 222 3344',
      },
    })
    assert.equal(otroFormato.status, 201)
    const count2 = await Client.countDocuments({
      owner: owner.userId,
      phoneNormalized: '573112223344',
    })
    assert.equal(count2, count, 'el mismo teléfono no debe crear otro cliente')
  })
})

/* ======================= CONCURRENCIA ======================= */

describe('Control de concurrencia (el corazón de la Fase 5)', () => {
  let owner
  const MON = futureWeekday(1)

  before(async () => {
    owner = await createOwner({ slug: 'concurrencia' })
  })

  test('N peticiones simultáneas para el MISMO hueco: exactamente 1 gana', async () => {
    const N = 8
    const bodies = Array.from({ length: N }, (_, i) => ({
      serviceId: owner.serviceId,
      date: MON,
      start: '08:00',
      name: `Corredor ${i}`,
      phone: `+57 320 000 000${i}`,
    }))

    const results = await Promise.all(
      bodies.map((b) => req('POST', '/api/public/booking/concurrencia', { body: b }))
    )

    const creadas = results.filter((r) => r.status === 201)
    const conflictos = results.filter((r) => r.status === 409)

    assert.equal(creadas.length, 1, `debe crearse exactamente 1 cita, no ${creadas.length}`)
    assert.equal(conflictos.length, N - 1, `las ${N - 1} restantes deben recibir 409`)

    // Y en la BD debe haber UNA sola cita para ese hueco.
    const enBd = await Appointment.countDocuments({
      owner: owner.userId,
      date: MON,
      startMinutes: 480,
      status: { $in: ['pending', 'confirmed'] },
    })
    assert.equal(enBd, 1)
  })

  test('N peticiones simultáneas para huecos DISTINTOS: todas crean', async () => {
    // 08:30, 09:00, 09:30, 10:00 (libres tras la prueba anterior).
    const horas = ['08:30', '09:00', '09:30', '10:00']
    const results = await Promise.all(
      horas.map((h, i) =>
        req('POST', '/api/public/booking/concurrencia', {
          body: {
            serviceId: owner.serviceId,
            date: MON,
            start: h,
            name: `Paralelo ${i}`,
            phone: `+57 321 111 000${i}`,
          },
        })
      )
    )
    const creadas = results.filter((r) => r.status === 201)
    assert.equal(creadas.length, horas.length, 'huecos distintos no deben chocar')
  })

  test('cancelar una cita LIBERA su hueco para reservar de nuevo', async () => {
    // Toma el hueco 11:00.
    const creada = await req('POST', '/api/public/booking/concurrencia', {
      body: {
        serviceId: owner.serviceId,
        date: MON,
        start: '11:00',
        name: 'Se Cancela',
        phone: '+57 322 222 0000',
      },
    })
    assert.equal(creada.status, 201)
    const apptId = creada.data.appointment.id

    // Mientras está pendiente, el hueco está ocupado.
    const ocupado = await req('POST', '/api/public/booking/concurrencia', {
      body: { serviceId: owner.serviceId, date: MON, start: '11:00', name: 'Ximena', phone: '+57 322 333 0000' },
    })
    assert.equal(ocupado.status, 409)

    // El dueño la cancela.
    const cancel = await req('PATCH', `/api/appointments/${apptId}/status`, {
      token: owner.token,
      body: { status: 'cancelled' },
    })
    assert.equal(cancel.status, 200)

    // Ahora el hueco vuelve a estar libre (índice parcial).
    const libre = await req('POST', '/api/public/booking/concurrencia', {
      body: { serviceId: owner.serviceId, date: MON, start: '11:00', name: 'Yolanda', phone: '+57 322 444 0000' },
    })
    assert.equal(libre.status, 201, 'cancelar debe liberar el hueco')
  })
})

/* ======================= AGENDA PRIVADA ======================= */

describe('Agenda privada (GET /api/appointments)', () => {
  let owner
  const MON = futureWeekday(1)

  before(async () => {
    owner = await createOwner({ slug: 'agenda-privada' })
    await req('POST', '/api/public/booking/agenda-privada', {
      body: { serviceId: owner.serviceId, date: MON, start: '08:00', name: 'Ana', phone: '+57 330 111 2222' },
    })
    await req('POST', '/api/public/booking/agenda-privada', {
      body: { serviceId: owner.serviceId, date: MON, start: '09:00', name: 'Beto', phone: '+57 330 333 4444' },
    })
  })

  test('lista las citas del dueño en un rango', async () => {
    const r = await req('GET', `/api/appointments?from=${MON}&to=${MON}`, { token: owner.token })
    assert.equal(r.status, 200)
    assert.equal(r.data.appointments.length, 2)
    // Ordenadas por hora de inicio.
    assert.equal(r.data.appointments[0].localStart, '08:00')
    assert.equal(r.data.appointments[1].localStart, '09:00')
  })

  test('sin autenticación => 401', async () => {
    const r = await req('GET', `/api/appointments?from=${MON}&to=${MON}`)
    assert.equal(r.status, 401)
  })

  test('un dueño NO ve las citas de otro dueño', async () => {
    const otro = await createOwner({ slug: 'otro-agenda' })
    const r = await req('GET', `/api/appointments?from=${MON}&to=${MON}`, { token: otro.token })
    assert.equal(r.status, 200)
    assert.equal(r.data.appointments.length, 0)
  })

  test('cambiar estado: pending -> confirmed => 200', async () => {
    const list = await req('GET', `/api/appointments?from=${MON}&to=${MON}`, { token: owner.token })
    const id = list.data.appointments[0]._id
    const r = await req('PATCH', `/api/appointments/${id}/status`, {
      token: owner.token,
      body: { status: 'confirmed' },
    })
    assert.equal(r.status, 200)
    assert.equal(r.data.appointment.status, 'confirmed')
  })

  test('transición inválida: confirmed -> pending => 409', async () => {
    const list = await req('GET', `/api/appointments?from=${MON}&to=${MON}`, { token: owner.token })
    const id = list.data.appointments[0]._id
    const r = await req('PATCH', `/api/appointments/${id}/status`, {
      token: owner.token,
      body: { status: 'pending' },
    })
    assert.equal(r.status, 409)
  })

  test('transición inválida: pending -> completed => 409 (debe confirmarse antes)', async () => {
    const list = await req('GET', `/api/appointments?from=${MON}&to=${MON}`, { token: owner.token })
    const id = list.data.appointments[1]._id // Beto sigue pending
    const r = await req('PATCH', `/api/appointments/${id}/status`, {
      token: owner.token,
      body: { status: 'completed' },
    })
    assert.equal(r.status, 409)
  })

  test('flujo completo: pending -> confirmed -> completed', async () => {
    const list = await req('GET', `/api/appointments?from=${MON}&to=${MON}`, { token: owner.token })
    const beto = list.data.appointments.find((a) => a.clientSnapshot.name === 'Beto')

    const conf = await req('PATCH', `/api/appointments/${beto._id}/status`, {
      token: owner.token,
      body: { status: 'confirmed' },
    })
    assert.equal(conf.status, 200)

    const comp = await req('PATCH', `/api/appointments/${beto._id}/status`, {
      token: owner.token,
      body: { status: 'completed' },
    })
    assert.equal(comp.status, 200)
    assert.equal(comp.data.appointment.status, 'completed')

    // El historial registra los cambios.
    const historial = comp.data.appointment.statusHistory.map((h) => h.status)
    assert.ok(historial.includes('pending'))
    assert.ok(historial.includes('confirmed'))
    assert.ok(historial.includes('completed'))
  })

  test('no se puede modificar la cita de otro dueño => 404', async () => {
    const list = await req('GET', `/api/appointments?from=${MON}&to=${MON}`, { token: owner.token })
    const id = list.data.appointments[0]._id
    const otro = await createOwner({ slug: 'intruso-agenda' })
    const r = await req('PATCH', `/api/appointments/${id}/status`, {
      token: otro.token,
      body: { status: 'cancelled' },
    })
    assert.equal(r.status, 404)
  })
})

/* ======================= CLIENTES ======================= */

describe('Clientes', () => {
  let owner
  const MON = futureWeekday(1)

  before(async () => {
    owner = await createOwner({ slug: 'clientes-agenda' })
    const booking = await req('POST', '/api/public/booking/clientes-agenda', {
      body: { serviceId: owner.serviceId, date: MON, start: '08:00', name: 'Carla', phone: '+57 340 111 2222' },
    })
    assert.equal(booking.status, 201, `booking before() falló: ${JSON.stringify(booking.data)}`)
  })

  test('lista los clientes y permite buscar por teléfono', async () => {
    const todos = await req('GET', '/api/clients', { token: owner.token })
    assert.equal(todos.status, 200)
    assert.equal(todos.data.clients.length, 1)

    const porTel = await req('GET', '/api/clients?phone=340111', { token: owner.token })
    assert.equal(porTel.data.clients.length, 1)

    const sinCoincidencia = await req('GET', '/api/clients?phone=999999', { token: owner.token })
    assert.equal(sinCoincidencia.data.clients.length, 0)
  })

  test('detalle de cliente con su historial de citas', async () => {
    const todos = await req('GET', '/api/clients', { token: owner.token })
    const id = todos.data.clients[0]._id
    const r = await req('GET', `/api/clients/${id}`, { token: owner.token })
    assert.equal(r.status, 200)
    assert.equal(r.data.client.name, 'Carla')
    assert.equal(r.data.appointments.length, 1)
  })

  test('no se pueden ver clientes de otro dueño => 404', async () => {
    const todos = await req('GET', '/api/clients', { token: owner.token })
    const id = todos.data.clients[0]._id
    const otro = await createOwner({ slug: 'otro-clientes' })
    const r = await req('GET', `/api/clients/${id}`, { token: otro.token })
    assert.equal(r.status, 404)
  })
})
