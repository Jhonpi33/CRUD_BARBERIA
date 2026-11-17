/*
  Área del cliente (rol `client`).

  Un cliente es una persona normal: no tiene agenda, ni servicios, ni panel de
  negocio. Solo puede ver LAS CITAS QUE RESERVÓ, buscadas por su teléfono
  (las reservas públicas se hacen sin cuenta).

  Requiere MongoDB local (mongodb://127.0.0.1:27017) y usa `elysia_test`.
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

/** Semana laboral mínima: lunes 08:00-12:00, el resto cerrado. */
const WEEK = {
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

/** Crea un barbero listo para recibir reservas públicas. */
async function createOwner({ slug, professionalName }) {
  const email = `dueno${Date.now()}${Math.random().toString(36).slice(2, 8)}@test.com`
  const r = await req('POST', '/api/auth/register', {
    body: { name: professionalName, email, password: 'secreto123' },
  })
  assert.equal(r.status, 201, JSON.stringify(r.data))
  const token = r.data.token

  assert.equal((await req('PATCH', '/api/auth/role', { token, body: { role: 'barber' } })).status, 200)
  await req('PUT', '/api/profile/me', {
    token,
    body: {
      professionalName,
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
  assert.equal(svc.status, 201, JSON.stringify(svc.data))

  const sch = await req('PUT', '/api/schedule/me', { token, body: WEEK })
  assert.equal(sch.status, 200, JSON.stringify(sch.data))

  return { token, serviceId: svc.data.service._id }
}

/** Cuenta de tipo `client` (con teléfono opcional). */
async function createClient({ phone } = {}) {
  const email = `cliente${Date.now()}${Math.random().toString(36).slice(2, 8)}@test.com`
  const r = await req('POST', '/api/auth/register', {
    body: { name: 'Cliente Cuenta', email, password: 'secreto123' },
  })
  assert.equal(r.status, 201, JSON.stringify(r.data))
  const token = r.data.token

  const role = await req('PATCH', '/api/auth/role', { token, body: { role: 'client' } })
  assert.equal(role.status, 200, JSON.stringify(role.data))
  assert.equal(role.data.user.role, 'client')

  if (phone !== undefined) {
    const me = await req('PATCH', '/api/auth/me', { token, body: { phone } })
    assert.equal(me.status, 200, JSON.stringify(me.data))
  }
  return { token }
}

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

describe('Funciones fuera del piloto', () => {
  test('el área de cuenta del cliente no está publicada', async () => {
    const r = await req('GET', '/api/client/appointments')
    assert.equal(r.status, 404)
  })

  test('no se puede crear una cuenta de cliente desde la selección de rol', async () => {
    const email = `cliente${Date.now()}@test.com`
    const created = await req('POST', '/api/auth/register', {
      body: { name: 'Cliente Cuenta', email, password: 'secreto123' },
    })
    assert.equal(created.status, 201, JSON.stringify(created.data))

    const selected = await req('PATCH', '/api/auth/role', {
      token: created.data.token,
      body: { role: 'client' },
    })
    assert.equal(selected.status, 403)
  })
})
