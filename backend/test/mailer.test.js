/*
  Pruebas de la Fase 6.2 (correo de aviso al barbero).

  Requiere MongoDB local (mongodb://127.0.0.1:27017) y usa la BD de test
  `elysia_test` (se vacía al inicio de cada ejecución).
  Ejecutar con: npm test
*/
import './env.js' // DEBE ir primero: fija NODE_ENV antes de cargar la app
import { futureWeekday } from './env.js'

import { test, describe, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'

import app from '../src/app.js'
import { Profile } from '../src/models/Profile.js'
import { Notification } from '../src/models/Notification.js'
import { isEnabled, setTransport, sendMail } from '../src/config/mailer.js'
import { sendBookingEmail } from '../src/utils/mailer.js'

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
  const email = `mail${Date.now()}${Math.random().toString(36).slice(2, 8)}@test.com`
  const r = await req('POST', '/api/auth/register', {
    body: { name: 'Dueño Mail', email, password: 'secreto123' },
  })
  assert.equal(r.status, 201)
  const token = r.data.token

  const rr = await req('PATCH', '/api/auth/role', { token, body: { role: 'barber' } })
  assert.equal(rr.status, 200)

  await req('PUT', '/api/profile/me', {
    token,
    body: {
      professionalName: 'Dueño Mail',
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

function book(slug, serviceId, { start, name, phone, date = futureWeekday(1) }) {
  return req('POST', `/api/public/booking/${slug}`, {
    body: { serviceId, date, start, name, phone },
  })
}

/** Transporte falso que graba los correos enviados. */
function fakeTransport(sent) {
  return {
    async sendMail(message) {
      sent.push(message)
      return { messageId: 'fake' }
    },
  }
}

before(async () => {
  await mongoose.connect(process.env.MONGODB_URI)
  await mongoose.connection.dropDatabase()
  await new Promise((resolve) => {
    server = app.listen(0, resolve)
  })
  base = `http://127.0.0.1:${server.address().port}`
  await Notification.init()
})

after(async () => {
  setTransport(null)
  await new Promise((resolve) => server.close(resolve))
  await mongoose.disconnect()
})

beforeEach(() => {
  // Por defecto, sin variables SMTP_* el correo queda desactivado.
  delete process.env.SMTP_HOST
  delete process.env.SMTP_USER
  delete process.env.SMTP_PASS
  setTransport(null)
})

/* ======================= DESACTIVADO SIN SMTP ======================= */

describe('Correo desactivado cuando faltan las variables SMTP', () => {
  test('isEnabled() es false sin SMTP_HOST/USER/PASS', () => {
    assert.equal(isEnabled(), false)
  })

  test('sendMail() hace skip y no lanza sin configurar', async () => {
    const r = await sendMail({ to: 'a@b.co', subject: 'hola', text: 'x' })
    assert.equal(r.sent, false)
    assert.equal(r.skipped, true)
    assert.ok(r.reason)
  })

  test('sendBookingEmail() hace skip si el dueño no tiene correo', async () => {
    const r = await sendBookingEmail({
      ownerEmail: '',
      clientName: 'Cliente',
      service: { name: 'Corte', price: 15000, durationMinutes: 30 },
      startUtc: new Date('2026-10-19T13:00:00Z'),
      timezone: 'America/Bogota',
    })
    assert.equal(r.sent, false)
    assert.equal(r.skipped, true)
  })

  test('una reserva sigue devolviendo 201 aunque el correo esté desactivado', async () => {
    const owner = await createOwner({ slug: 'mail-desactivado' })
    const r = await book('mail-desactivado', owner.serviceId, {
      start: '08:00',
      name: 'Cliente Sin Mail',
      phone: '+57 350 111 2222',
    })
    assert.equal(r.status, 201, JSON.stringify(r.data))
    // además se creó la notificación interna
    const creadas = await Notification.find({ owner: owner.userId })
    assert.equal(creadas.length, 1)
  })
})

/* ======================= ENVÍO CON TRANSPORTE ======================= */

describe('sendBookingEmail con transporte inyectado', () => {
  test('compone asunto y cuerpo con cliente, servicio, fecha y precio COP', async () => {
    const sent = []
    setTransport(fakeTransport(sent))

    const r = await sendBookingEmail({
      ownerEmail: 'dueño@test.com',
      ownerName: 'Don Barbero',
      clientName: 'Cliente Prueba',
      service: { name: 'Corte', price: 15000, durationMinutes: 30 },
      startUtc: new Date('2026-10-19T13:00:00Z'), // 08:00 en Bogotá (UTC-5)
      timezone: 'America/Bogota',
    })

    assert.equal(r.sent, true, JSON.stringify(r))
    assert.equal(sent.length, 1)

    const m = sent[0]
    assert.equal(m.to, 'dueño@test.com')
    assert.match(m.subject, /Cliente Prueba/)
    assert.ok(m.text.includes('Don Barbero'), 'saluda al dueño por su nombre')
    assert.ok(m.text.includes('Cliente Prueba'), 'incluye al cliente')
    assert.ok(m.text.includes('Corte'), 'incluye el servicio')
    assert.ok(m.text.includes('2026-10-19'), 'incluye la fecha en la zona del dueño')
    assert.ok(m.text.includes('08:00'), 'incluye la hora en la zona del dueño')
    assert.ok(m.text.includes('America/Bogota'), 'incluye la zona horaria')
    assert.ok(/\$\s?15\.000|15\.000/.test(m.text), 'incluye el precio en COP con formato es-CO')
  })

  test('un fallo de envío devuelve error pero NO lanza', async () => {
    setTransport({
      async sendMail() {
        throw new Error('SMTP caído')
      },
    })

    const r = await sendBookingEmail({
      ownerEmail: 'dueño@test.com',
      clientName: 'Cliente',
      service: { name: 'Corte' },
      startUtc: new Date('2026-10-19T13:00:00Z'),
      timezone: 'America/Bogota',
    })

    assert.equal(r.sent, false)
    assert.ok(r.error)
    assert.equal(r.error.message, 'SMTP caído')
  })
})

/* ======================= ENVÍO EN LA RESERVA ======================= */

describe('La reserva pública intenta enviar el correo al dueño', () => {
  test('con transporte inyectado, la reserva dispara UN correo al dueño', async () => {
    const owner = await createOwner({ slug: 'mail-reserva' })
    const sent = []
    setTransport(fakeTransport(sent))

    // Se fija la fecha UNA sola vez y se usa tanto para reservar como para
    // verificar el correo: dos llamadas a futureWeekday() podrían caer en
    // semanas distintas justo en el cambio de semana.
    const date = futureWeekday(1)
    const r = await book('mail-reserva', owner.serviceId, {
      start: '08:00',
      name: 'Cliente Correo',
      phone: '+57 350 999 8888',
      date,
    })
    assert.equal(r.status, 201, JSON.stringify(r.data))

    assert.equal(sent.length, 1, 'debe enviarse exactamente un correo')
    assert.match(sent[0].subject, /Cliente Correo/)
    assert.ok(sent[0].text.includes('Corte'))
    assert.ok(
      sent[0].text.includes(date),
      `el correo debe incluir la fecha ${date}; texto: ${sent[0].text}`
    )
    setTransport(null)
  })

  test('si el transporte falla, la reserva AÚN devuelve 201', async () => {
    const owner = await createOwner({ slug: 'mail-falla' })
    setTransport({
      async sendMail() {
        throw new Error('SMTP caído')
      },
    })

    const r = await book('mail-falla', owner.serviceId, {
      start: '08:00',
      name: 'Cliente Falla',
      phone: '+57 350 777 6666',
    })
    assert.equal(r.status, 201, 'el fallo de correo no debe romper la reserva')
    setTransport(null)
  })
})
