/*
  Agente de IA: herramientas y bucle de conversación.

  No se llama a Gemini de verdad: `runAgent` acepta un `transport` inyectable,
  así que aquí se simulan las respuestas del modelo (pedir una herramienta y
  luego contestar texto). Las herramientas sí se ejecutan contra MongoDB real.

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
import { Profile } from '../src/models/Profile.js'
import { executeTool } from '../src/services/agent/tools.js'
import { runAgent, buildSystemPrompt } from '../src/services/agent/gemini.js'

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

/** Crea un barbero listo para recibir reservas y devuelve su slug + servicio. */
async function createOwner({ slug, professionalName }) {
  const email = `dueno${Date.now()}${Math.random().toString(36).slice(2, 8)}@test.com`
  const r = await req('POST', '/api/auth/register', {
    body: { name: professionalName, email, password: 'secreto123' },
  })
  assert.equal(r.status, 201, JSON.stringify(r.data))
  const token = r.data.token

  assert.equal((await req('PATCH', '/api/auth/role', { body: { role: 'barber' } })).status, 401)

  // Con token: el rol se asigna una sola vez.
  assert.equal(
    (await req('PATCH', '/api/auth/role', { token, body: { role: 'barber' } })).status,
    200
  )

  const profile = await req('PUT', '/api/profile/me', {
    token,
    body: {
      professionalName,
      phone: '+57 300 111 2233',
      location: 'Bogotá, Colombia',
      description: 'Barbero de pruebas',
    },
  })
  assert.equal(profile.status, 200, JSON.stringify(profile.data))

  const done = await req('PATCH', '/api/profile/me/complete', {
    token,
    body: { yearsOfExperience: 3 },
  })
  assert.equal(done.status, 200, JSON.stringify(done.data))

  const ownerId = r.data.user._id
  await Profile.updateOne({ owner: ownerId }, { $set: { slug } })

  const svc = await req('POST', '/api/services', {
    token,
    body: { name: 'Corte', price: 15000, durationMinutes: 30 },
  })
  assert.equal(svc.status, 201, JSON.stringify(svc.data))

  const sch = await req('PUT', '/api/schedule/me', { token, body: WEEK })
  assert.equal(sch.status, 200, JSON.stringify(sch.data))

  return { token, ownerId, serviceId: svc.data.service._id }
}

/** Transporte falso: devuelve respuestas en orden y registra lo que recibió. */
function scriptedTransport(responses) {
  const calls = []
  const transport = async (body) => {
    calls.push(body)
    const next = responses[Math.min(calls.length - 1, responses.length - 1)]
    return next
  }
  transport.calls = calls
  return transport
}

const functionCall = (name, args) => ({
  candidates: [{ content: { parts: [{ functionCall: { name, args } }] } }],
})

const textReply = (text) => ({
  candidates: [{ content: { parts: [{ text }] } }],
})

before(async () => {
  await mongoose.connect(process.env.MONGODB_URI)
  await mongoose.connection.dropDatabase()
  await new Promise((resolve) => {
    server = app.listen(0, resolve)
  })
  base = `http://127.0.0.1:${server.address().port}`
  await Appointment.init()
})

after(async () => {
  await new Promise((resolve) => server.close(resolve))
  await mongoose.disconnect()
})

describe('Herramientas del agente', () => {
  const MON = futureWeekday(1)

  test('list_services devuelve el catálogo del negocio del slug', async () => {
    const owner = await createOwner({ slug: 'agente-barbero', professionalName: 'Agente Barbero' })
    const r = await executeTool('list_services', {}, { slug: 'agente-barbero' })
    assert.equal(r.business, 'Agente Barbero')
    assert.equal(r.services.length, 1)
    assert.equal(r.services[0].id, owner.serviceId)
    assert.equal(r.services[0].price, 15000)
  })

  test('check_availability devuelve huecos reales', async () => {
    const owner = await createOwner({ slug: 'agente-horario', professionalName: 'Agente Horario' })
    const r = await executeTool(
      'check_availability',
      { serviceId: owner.serviceId, date: MON },
      { slug: 'agente-horario' }
    )
    assert.equal(r.date, MON)
    assert.ok(r.slots.includes('08:00'))
    assert.ok(r.totalFreeSlots > 0)
  })

  test('no puede consultar el servicio de otro negocio', async () => {
    const a = await createOwner({ slug: 'agente-uno', professionalName: 'Agente Uno' })
    await createOwner({ slug: 'agente-dos', professionalName: 'Agente Dos' })
    const r = await executeTool(
      'check_availability',
      { serviceId: a.serviceId, date: MON },
      { slug: 'agente-dos' }
    )
    assert.equal(r.code, 'SERVICE_NOT_AVAILABLE')
  })

  test('sin teléfono verificado no agenda', async () => {
    const owner = await createOwner({ slug: 'agente-sin-tel', professionalName: 'Agente Sin Tel' })
    const r = await executeTool(
      'book_appointment',
      { serviceId: owner.serviceId, date: MON, start: '08:00', name: 'Ana' },
      { slug: 'agente-sin-tel', phone: '' }
    )
    assert.equal(r.code, 'NO_PHONE')
  })

  test('sin nombre no agenda', async () => {
    const owner = await createOwner({ slug: 'agente-sin-nombre', professionalName: 'Agente Sin Nombre' })
    const r = await executeTool(
      'book_appointment',
      { serviceId: owner.serviceId, date: MON, start: '08:00' },
      { slug: 'agente-sin-nombre', phone: '3112223344' }
    )
    assert.equal(r.code, 'MISSING_NAME')
  })

  test('agenda una cita pendiente marcada como origen "agent"', async () => {
    const owner = await createOwner({ slug: 'agente-agenda', professionalName: 'Agente Agenda' })
    const r = await executeTool(
      'book_appointment',
      { serviceId: owner.serviceId, date: MON, start: '08:00', name: 'Ana Bot' },
      { slug: 'agente-agenda', phone: '+57 311 222 3344' }
    )

    assert.equal(r.ok, true, JSON.stringify(r))
    assert.equal(r.status, 'pending')
    assert.equal(r.start, '08:00')
    assert.equal(r.end, '08:30')

    const saved = await Appointment.findById(r.appointmentId).lean()
    assert.equal(saved.source, 'agent')
    assert.equal(saved.clientSnapshot.name, 'Ana Bot')
  })

  test('no agenda dos veces el mismo hueco', async () => {
    const owner = await createOwner({ slug: 'agente-doble', professionalName: 'Agente Doble' })
    const ctx = { slug: 'agente-doble', phone: '3112223344' }
    const first = await executeTool(
      'book_appointment',
      { serviceId: owner.serviceId, date: MON, start: '08:00', name: 'Ana' },
      ctx
    )
    assert.equal(first.ok, true, JSON.stringify(first))

    const second = await executeTool(
      'book_appointment',
      { serviceId: owner.serviceId, date: MON, start: '08:15', name: 'Otra' },
      ctx
    )
    assert.equal(second.code, 'SLOT_UNAVAILABLE')
  })

  test('list_my_appointments encuentra la cita por los últimos 10 dígitos', async () => {
    const owner = await createOwner({ slug: 'agente-mis-citas', professionalName: 'Agente Mis Citas' })
    await executeTool(
      'book_appointment',
      { serviceId: owner.serviceId, date: MON, start: '08:00', name: 'Luis' },
      { slug: 'agente-mis-citas', phone: '+57 320 555 7788' }
    )

    const r = await executeTool('list_my_appointments', {}, {
      slug: 'agente-mis-citas',
      phone: '3205557788',
    })
    assert.equal(r.appointments.length, 1)
    assert.equal(r.appointments[0].start, '08:00')
    assert.equal(r.appointments[0].service, 'Corte')
  })
})

describe('Bucle de conversación (runAgent)', () => {
  const MON = futureWeekday(1)

  test('agenda siguiendo la decisión del modelo y responde texto', async () => {
    const owner = await createOwner({ slug: 'agente-chat', professionalName: 'Agente Chat' })

    const transport = scriptedTransport([
      functionCall('book_appointment', {
        serviceId: owner.serviceId,
        date: MON,
        start: '09:00',
        name: 'Camila',
      }),
      textReply('Listo, Camila: corte el lunes a las 09:00. Queda pendiente de confirmación.'),
    ])

    const result = await runAgent({
      message: 'quiero corte el lunes a las 9',
      context: { slug: 'agente-chat', phone: '573205557788', name: 'Camila' },
      transport,
    })

    assert.equal(result.toolCalls.length, 1)
    assert.equal(result.toolCalls[0].name, 'book_appointment')
    assert.ok(result.booking, 'debe devolver la cita creada')
    assert.equal(result.booking.start, '09:00')
    assert.match(result.reply, /Listo, Camila/)

    // La segunda llamada al modelo ya lleva el resultado de la herramienta.
    const second = transport.calls[1]
    const functionResponse = second.contents.at(-1).parts[0].functionResponse
    assert.equal(functionResponse.name, 'book_appointment')
    assert.equal(functionResponse.response.ok, true)
  })

  test('responde sin herramientas cuando el modelo solo contesta', async () => {
    await createOwner({ slug: 'agente-platica', professionalName: 'Agente Plática' })
    const transport = scriptedTransport([textReply('Hola, ¿qué corte te gustaría?')])

    const result = await runAgent({
      message: 'hola',
      context: { slug: 'agente-platica', phone: '3001112233' },
      transport,
    })
    assert.equal(result.reply, 'Hola, ¿qué corte te gustaría?')
    assert.deepEqual(result.toolCalls, [])
    assert.equal(result.booking, null)
  })

  test('rechaza un slug que no existe', async () => {
    await assert.rejects(
      () => runAgent({ message: 'hola', context: { slug: 'no-existe' }, transport: async () => textReply('x') }),
      (err) => err.status === 404
    )
  })

  test('rechaza un mensaje vacío', async () => {
    await assert.rejects(
      () => runAgent({ message: '   ', context: { slug: 'agente-chat' }, transport: async () => textReply('x') }),
      (err) => err.status === 422
    )
  })

  test('el prompt incluye la fecha de hoy y la zona del negocio', () => {
    const prompt = buildSystemPrompt({
      business: 'Barbería Demo',
      timezone: 'America/Bogota',
      context: { name: 'Ana', phone: '3001112233' },
      now: new Date('2026-10-27T15:00:00Z'),
    })
    assert.match(prompt, /Barbería Demo/)
    assert.match(prompt, /2026-10-27/)
    assert.match(prompt, /America\/Bogota/)
    assert.match(prompt, /Ana/)
  })
})

describe('API del agente fuera del piloto', () => {
  test('GET /api/agent/status no está publicado', async () => {
    const r = await req('GET', '/api/agent/status')
    assert.equal(r.status, 404)
  })

  test('POST /api/agent/chat no permite llamadas anónimas', async () => {
    const r = await req('POST', '/api/agent/chat', { body: { slug: 'agente-chat' } })
    assert.equal(r.status, 404)
  })

  test('POST /api/agent/chat no está publicado aunque el slug sea inválido', async () => {
    const r = await req('POST', '/api/agent/chat', {
      body: { slug: 'NO VALE', message: 'hola' },
    })
    assert.equal(r.status, 404)
  })
})
