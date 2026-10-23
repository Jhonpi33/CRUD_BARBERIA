/*
  Pruebas de integración de la Fase 6.1 (notificaciones internas del panel).

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
import { Notification } from '../src/models/Notification.js'
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

/** Cuenta, rol barber, perfil completo (slug), servicio activo y horario fijo. */
async function createOwner({ slug }) {
  const email = `notif${Date.now()}${Math.random().toString(36).slice(2, 8)}@test.com`
  const r = await req('POST', '/api/auth/register', {
    body: { name: 'Dueño Notif', email, password: 'secreto123' },
  })
  assert.equal(r.status, 201)
  const token = r.data.token

  const rr = await req('PATCH', '/api/auth/role', { token, body: { role: 'barber' } })
  assert.equal(rr.status, 200)

  await req('PUT', '/api/profile/me', {
    token,
    body: {
      professionalName: 'Dueño Notif',
      phone: '+57 300 111 2233',
      location: 'Bogotá, Colombia',
      description: 'Barbero de pruebas',
    },
  })
  const done = await req('PATCH', '/api/profile/me/complete', { token, body: { yearsOfExperience: 3 } })
  assert.equal(done.status, 200, JSON.stringify(done.data))

  await Profile.updateOne({ owner: r.data.user._id }, { $set: { slug } })

  const svc = await req('POST', '/api/services', {
    token,
    body: { name: 'Corte', price: 15000, durationMinutes: 30 },
  })
  assert.equal(svc.status, 201)

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

/** Reserva pública ( devuelve la respuesta cruda ). */
function book(slug, serviceId, { start, name, phone, date = futureWeekday(1) }) {
  return req('POST', `/api/public/booking/${slug}`, {
    body: { serviceId, date, start, name, phone },
  })
}

before(async () => {
  await mongoose.connect(process.env.MONGODB_URI)
  await mongoose.connection.dropDatabase()
  await new Promise((resolve) => {
    server = app.listen(0, resolve)
  })
  base = `http://127.0.0.1:${server.address().port}`
  await Notification.init() // espera al índice único { owner, dedupeKey }
})

after(async () => {
  await new Promise((resolve) => server.close(resolve))
  await mongoose.disconnect()
})

/* ======================= CREACIÓN POR RESERVA ======================= */

describe('Notificación creada por una reserva pública', () => {
  let owner
  const MON = futureWeekday(1)

  before(async () => {
    owner = await createOwner({ slug: 'notif-creacion' })
  })

  test('una reserva crea EXACTAMENTE una notificación para el owner', async () => {
    const r = await book('notif-creacion', owner.serviceId, {
      start: '08:00',
      name: 'Cliente Notif',
      phone: '+57 350 111 2222',
    })
    assert.equal(r.status, 201, JSON.stringify(r.data))

    const creadas = await Notification.find({ owner: owner.userId })
    assert.equal(creadas.length, 1, 'debe crearse exactamente una notificación')

    const n = creadas[0]
    assert.equal(n.type, 'booking_created')
    assert.equal(n.title, 'Nueva reserva')
    assert.equal(String(n.appointment), String(r.data.appointment.id))
    assert.equal(n.readAt, null, 'nace sin leer')
    assert.equal(n.dedupeKey, `booking_created:${r.data.appointment.id}`)
    assert.ok(n.message.includes('Cliente Notif'), 'el mensaje incluye al cliente')
    assert.ok(n.message.includes('Corte'), 'el mensaje incluye el servicio')
    assert.ok(n.message.includes(MON), 'el mensaje incluye la fecha en la zona del dueño')
    assert.ok(n.message.includes('08:00'), 'el mensaje incluye la hora en la zona del dueño')
    assert.ok(n.message.includes('America/Bogota'))
  })

  test('el conteo de no leídas refleja la reserva', async () => {
    const r = await req('GET', '/api/notifications/unread-count', { token: owner.token })
    assert.equal(r.status, 200)
    assert.equal(r.data.count, 1)
  })

  test('dos creaciones con la misma dedupeKey NO duplican (índice único)', async () => {
    const original = await Notification.findOne({ owner: owner.userId })
    assert.ok(original)

    let dupError = null
    try {
      await Notification.create({
        owner: original.owner,
        type: original.type,
        appointment: original.appointment,
        title: original.title,
        message: original.message,
        dedupeKey: original.dedupeKey, // misma clave => debe rechazarse
      })
    } catch (err) {
      dupError = err
    }

    assert.ok(dupError, 'el segundo INSERT debe fallar')
    assert.equal(dupError.code, 11000, 'debe ser un DuplicateKeyError de Mongo')

    const total = await Notification.countDocuments({ owner: owner.userId })
    assert.equal(total, 1, 'no debe haber duplicados')
  })

  test('GET /api/notifications pagina y limita (limit tope a 50)', async () => {
    const r = await req('GET', '/api/notifications?limit=999&page=1', { token: owner.token })
    assert.equal(r.status, 200)
    assert.equal(r.data.limit, 50, 'el tope de limit es 50')
    assert.equal(r.data.total, 1)
    assert.equal(r.data.notifications.length, 1)
    assert.equal(r.data.unreadCount, 1)
  })

  test('limit inválido => 422', async () => {
    const r = await req('GET', '/api/notifications?limit=abc', { token: owner.token })
    assert.equal(r.status, 422)
  })

  test('unread=true devuelve solo las no leídas', async () => {
    const r = await req('GET', '/api/notifications?unread=true', { token: owner.token })
    assert.equal(r.status, 200)
    assert.equal(r.data.notifications.length, 1)

    const falso = await req('GET', '/api/notifications?unread=maybe', { token: owner.token })
    assert.equal(falso.status, 422)
  })

  test('sin token => 401; con rol no permitido => 403', async () => {
    const sinToken = await req('GET', '/api/notifications')
    assert.equal(sinToken.status, 401)

    // Usuario sin rol asignado.
    const r = await req('POST', '/api/auth/register', {
      body: { name: 'Sin Rol', email: `sinrol${Date.now()}@test.com`, password: 'secreto123' },
    })
    assert.equal(r.status, 201)
    const sinRol = await req('GET', '/api/notifications', { token: r.data.token })
    assert.equal(sinRol.status, 403)
  })
})

/* ======================= AISLAMIENTO ENTRE DUEÑOS ======================= */

describe('Aislamiento entre dos propietarios', () => {
  let ownerA
  let ownerB
  const MON = futureWeekday(1)
  let idDeA

  before(async () => {
    ownerA = await createOwner({ slug: 'notif-dueno-a' })
    ownerB = await createOwner({ slug: 'notif-dueno-b' })

    const a = await book('notif-dueno-a', ownerA.serviceId, {
      start: '08:00',
      name: 'Cliente De A',
      phone: '+57 360 111 2222',
    })
    assert.equal(a.status, 201)
    const b = await book('notif-dueno-b', ownerB.serviceId, {
      start: '08:00',
      name: 'Cliente De B',
      phone: '+57 360 333 4444',
    })
    assert.equal(b.status, 201)

    const listaA = await req('GET', '/api/notifications', { token: ownerA.token })
    idDeA = listaA.data.notifications[0]._id
  })

  test('cada dueño ve solo sus notificaciones', async () => {
    const rA = await req('GET', '/api/notifications', { token: ownerA.token })
    assert.equal(rA.data.total, 1)
    assert.ok(rA.data.notifications[0].message.includes('Cliente De A'))

    const rB = await req('GET', '/api/notifications', { token: ownerB.token })
    assert.equal(rB.data.total, 1)
    assert.ok(rB.data.notifications[0].message.includes('Cliente De B'))
  })

  test('el usuario B NO puede marcar como leída una de A => 404', async () => {
    const r = await req('PATCH', `/api/notifications/${idDeA}/read`, { token: ownerB.token })
    assert.equal(r.status, 404)

    // Y la de A sigue sin leer.
    const a = await Notification.findById(idDeA)
    assert.equal(a.readAt, null)
  })

  test('un id inválido => 400', async () => {
    const r = await req('PATCH', '/api/notifications/no-es-id/read', { token: ownerA.token })
    assert.equal(r.status, 400)
  })

  test('read-all solo afecta las notificaciones propias', async () => {
    // A marca todas; B no debe verse afectado.
    const r = await req('PATCH', '/api/notifications/read-all', { token: ownerA.token })
    assert.equal(r.status, 200)
    assert.equal(r.data.modified, 1)

    const a = await Notification.findById(idDeA)
    assert.ok(a.readAt, 'la de A queda leída')

    const deB = await Notification.find({ owner: ownerB.userId })
    for (const n of deB) {
      assert.equal(n.readAt, null, 'las de B siguen sin leer')
    }

    const countB = await req('GET', '/api/notifications/unread-count', { token: ownerB.token })
    assert.equal(countB.data.count, 1)
    const countA = await req('GET', '/api/notifications/unread-count', { token: ownerA.token })
    assert.equal(countA.data.count, 0)
  })

  test('marcar la misma dos veces es idempotente', async () => {
    const primero = await req('PATCH', `/api/notifications/${idDeA}/read`, { token: ownerA.token })
    assert.equal(primero.status, 200)
    const leida1 = new Date(primero.data.notification.readAt).getTime()

    const segundo = await req('PATCH', `/api/notifications/${idDeA}/read`, { token: ownerA.token })
    assert.equal(segundo.status, 200)
    const leida2 = new Date(segundo.data.notification.readAt).getTime()

    assert.equal(leida1, leida2, 'readAt no debe cambiar al releer')
  })
})

/* ======================= ROBUSTEZ DEL FLUJO DE RESERVA ======================= */

describe('La reserva no depende de la notificación', () => {
  let owner
  const MON = futureWeekday(1)

  before(async () => {
    owner = await createOwner({ slug: 'notif-robusto' })
  })

  test('si Notification.create falla, la reserva igual responde 201', async () => {
    // Simula el fallo spiaeando el modelo y lo restaura al terminar.
    const original = Notification.create.bind(Notification)
    Notification.create = async () => {
      throw new Error('fallo simulado de la BD de notificaciones')
    }
    try {
      const r = await book('notif-robusto', owner.serviceId, {
        start: '08:00',
        name: 'Cliente Robusto',
        phone: '+57 370 111 2222',
      })
      assert.equal(r.status, 201, 'la reserva debe seguir funcionando')
      assert.equal(r.data.appointment.status, 'pending')
    } finally {
      Notification.create = original
    }

    // La cita existió en la BD pese al fallo de la notificación.
    const creadas = await Notification.countDocuments({ owner: owner.userId })
    assert.equal(creadas, 0, 'no se creó la notificación (fue spianeada)')
  })

  test('el flujo se recupera: la siguiente reserva sí notifica', async () => {
    const r = await book('notif-robusto', owner.serviceId, {
      start: '09:00',
      name: 'Cliente Sano',
      phone: '+57 370 333 4444',
    })
    assert.equal(r.status, 201)

    const creadas = await Notification.find({ owner: owner.userId })
    assert.equal(creadas.length, 1)
  })
})
