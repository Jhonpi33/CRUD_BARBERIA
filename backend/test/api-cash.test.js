/*
  Pruebas de integración de Caja (sesión con apertura/cierre + movimientos)
  y de las notas privadas de clientes (ficha técnica).

  Requiere MongoDB local (mongodb://127.0.0.1:27017) y usa la BD de test
  `elysia_test` (se vacía al inicio de cada ejecución).
  Ejecutar con: npm test
*/
import './env.js' // DEBE ir primero: fija NODE_ENV antes de cargar la app

import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'

import app from '../src/app.js'
import { CashSession } from '../src/models/CashSession.js'
import { CashMovement } from '../src/models/CashMovement.js'
import { Appointment } from '../src/models/Appointment.js'
import { Client } from '../src/models/Client.js'

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

/** Cuenta barbero básica (registro + rol). El perfil no hace falta para caja. */
async function createBarber(name) {
  const email = `${name}${Date.now()}${Math.random().toString(36).slice(2, 8)}@test.com`
  const r = await req('POST', '/api/auth/register', {
    body: { name, email, password: 'secreto123' },
  })
  assert.equal(r.status, 201, JSON.stringify(r.data))

  const rr = await req('PATCH', '/api/auth/role', { token: r.data.token, body: { role: 'barber' } })
  assert.equal(rr.status, 200, JSON.stringify(rr.data))

  return { token: r.data.token, userId: r.data.user._id }
}

/** Crea un cliente del dueño indicado (sin pasar por la reserva pública). */
async function createClient(owner, { name = 'Cliente Prueba', phone = '3001112233' } = {}) {
  return Client.create({ owner, name, phone, phoneNormalized: phone.replace(/\D+/g, '') })
}

/** Cita mínima válida (misma forma que genera la reserva pública). */
async function createAppointment({ owner, client, price = 15000, date = '2027-01-04' }) {
  return Appointment.create({
    owner,
    client: client._id,
    service: new mongoose.Types.ObjectId(),
    serviceSnapshot: { name: 'Corte', price, durationMinutes: 30 },
    clientSnapshot: { name: client.name, phone: client.phone },
    date,
    timezone: 'America/Bogota',
    localStart: '10:00',
    localEnd: '10:30',
    startMinutes: 600,
    endMinutes: 630,
    startUtc: new Date(`${date}T15:00:00.000Z`),
    endUtc: new Date(`${date}T15:30:00.000Z`),
    occupiedSlots: [`slot-${date}-10:00`, `slot-${date}-10:15`],
    status: 'confirmed',
    source: 'owner',
  })
}

before(async () => {
  await mongoose.connect(process.env.MONGODB_URI)
  await mongoose.connection.dropDatabase()
  await new Promise((resolve) => {
    server = app.listen(0, resolve)
  })
  base = `http://127.0.0.1:${server.address().port}`
  await Promise.all([CashSession.init(), CashMovement.init(), Appointment.init(), Client.init()])
})

after(async () => {
  await new Promise((resolve) => server.close(resolve))
  await mongoose.disconnect()
})

/* =========================== CAJA =========================== */

describe('Caja: sesión con apertura y cierre', () => {
  const ctx = {}

  test('la caja inicia cerrada y current devuelve forma en cero', async () => {
    ctx.barber = await createBarber('Cajero')

    const r = await req('GET', '/api/cash/current', { token: ctx.barber.token })
    assert.equal(r.status, 200)
    assert.equal(r.data.session, null)
    assert.deepEqual(r.data.movements, [])
    assert.equal(r.data.totals.expected, 0)
  })

  test('abre la caja con fondo inicial', async () => {
    const r = await req('POST', '/api/cash/open', {
      token: ctx.barber.token,
      body: { openingBalance: 20000, note: 'Fondo para cambio' },
    })
    assert.equal(r.status, 201, JSON.stringify(r.data))
    assert.equal(r.data.session.status, 'open')
    assert.equal(r.data.session.openingBalance, 20000)
    assert.match(r.data.session.date, /^\d{4}-\d{2}-\d{2}$/)
    ctx.sessionId = r.data.session._id
  })

  test('no deja abrir una segunda caja mientras haya una abierta (409)', async () => {
    const r = await req('POST', '/api/cash/open', {
      token: ctx.barber.token,
      body: { openingBalance: 5000 },
    })
    assert.equal(r.status, 409)
  })

  test('current refleja el fondo inicial como saldo esperado', async () => {
    const r = await req('GET', '/api/cash/current', { token: ctx.barber.token })
    assert.equal(r.status, 200)
    assert.equal(r.data.session._id, ctx.sessionId)
    assert.equal(r.data.totals.expected, 20000)
    assert.equal(r.data.totals.income, 0)
    assert.equal(r.data.totals.expense, 0)
  })

  test('registra ingresos y egresos y recalcula los totales', async () => {
    const income = await req('POST', '/api/cash/movements', {
      token: ctx.barber.token,
      body: { type: 'income', amount: 15000, concept: 'Corte barba', method: 'cash' },
    })
    assert.equal(income.status, 201, JSON.stringify(income.data))

    const expense = await req('POST', '/api/cash/movements', {
      token: ctx.barber.token,
      body: { type: 'expense', amount: 3000, concept: 'Tijeras' },
    })
    assert.equal(expense.status, 201, JSON.stringify(expense.data))
    ctx.expenseId = expense.data.movement._id

    const r = await req('GET', '/api/cash/current', { token: ctx.barber.token })
    assert.equal(r.data.totals.income, 15000)
    assert.equal(r.data.totals.expense, 3000)
    // 20000 (fondo) + 15000 − 3000
    assert.equal(r.data.totals.expected, 32000)
    assert.equal(r.data.totals.count, 2)
  })

  test('valida los datos de un movimiento (422)', async () => {
    const zero = await req('POST', '/api/cash/movements', {
      token: ctx.barber.token,
      body: { type: 'income', amount: 0, concept: 'Valor cero' },
    })
    assert.equal(zero.status, 422)

    const badType = await req('POST', '/api/cash/movements', {
      token: ctx.barber.token,
      body: { type: 'magia', amount: 1000, concept: 'Tipo raro' },
    })
    assert.equal(badType.status, 422)

    const shortConcept = await req('POST', '/api/cash/movements', {
      token: ctx.barber.token,
      body: { type: 'income', amount: 1000, concept: 'x' },
    })
    assert.equal(shortConcept.status, 422)
  })

  test('otra cuenta sin caja abierta no registra nada en la ajena (409)', async () => {
    const intruder = await createBarber('Intruso')
    const r = await req('POST', '/api/cash/movements', {
      token: intruder.token,
      body: { type: 'income', amount: 99999, concept: 'Ajenos' },
    })
    // Cada barbero solo escribe en SU caja abierta: sin sesión propia => 409.
    assert.equal(r.status, 409)
  })

  test('cobra una cita una sola vez y la agenda queda marcada como cobrada', async () => {
    ctx.client = await createClient(ctx.barber.userId, { name: 'Andrés Cliente' })
    ctx.appointment = await createAppointment({
      owner: ctx.barber.userId,
      client: ctx.client,
      price: 25000,
    })

    const first = await req('POST', '/api/cash/movements', {
      token: ctx.barber.token,
      body: {
        type: 'income',
        amount: 25000,
        concept: 'Cobro: Corte · Andrés Cliente',
        appointmentId: ctx.appointment._id,
      },
    })
    assert.equal(first.status, 201, JSON.stringify(first.data))
    ctx.chargeId = first.data.movement._id

    // El mismo cobro otra vez => 409 (índice único del modelo).
    const again = await req('POST', '/api/cash/movements', {
      token: ctx.barber.token,
      body: {
        type: 'income',
        amount: 25000,
        concept: 'Cobro repetido',
        appointmentId: ctx.appointment._id,
      },
    })
    assert.equal(again.status, 409)

    // La agenda del dueño muestra `paid` y la ficha del cliente.
    const list = await req('GET', '/api/appointments?from=2027-01-04&to=2027-01-04', {
      token: ctx.barber.token,
    })
    assert.equal(list.status, 200)
    assert.equal(list.data.appointments.length, 1)
    assert.equal(list.data.appointments[0].paid, true)

    // Totales: 20000 + 15000 + 25000 − 3000 = 57000
    const current = await req('GET', '/api/cash/current', { token: ctx.barber.token })
    assert.equal(current.data.totals.income, 40000)
    assert.equal(current.data.totals.expected, 57000)
  })

  test('una cita de otro dueño no se puede cobrar (404)', async () => {
    const other = await createBarber('OtroBarbero')
    const otherClient = await createClient(other.userId, { name: 'Ajeno', phone: '3009998877' })
    const otherAppointment = await createAppointment({
      owner: other.userId,
      client: otherClient,
    })

    const r = await req('POST', '/api/cash/movements', {
      token: ctx.barber.token,
      body: {
        type: 'income',
        amount: 10000,
        concept: 'Cita ajena',
        appointmentId: otherAppointment._id,
      },
    })
    assert.equal(r.status, 404)
  })

  test('borra un registro equivocado mientras la caja está abierta', async () => {
    const del = await req('DELETE', `/api/cash/movements/${ctx.expenseId}`, {
      token: ctx.barber.token,
    })
    assert.equal(del.status, 200, JSON.stringify(del.data))

    const current = await req('GET', '/api/cash/current', { token: ctx.barber.token })
    assert.equal(current.data.totals.expense, 0)
    // 20000 + 40000 − 0
    assert.equal(current.data.totals.expected, 60000)
  })

  test('cierra la caja y guarda el cuadre (diferencia calculada)', async () => {
    const r = await req('POST', '/api/cash/close', {
      token: ctx.barber.token,
      body: { closingBalance: 59500, note: 'Conteo de cierre' },
    })
    assert.equal(r.status, 200, JSON.stringify(r.data))
    assert.equal(r.data.session.status, 'closed')
    assert.equal(r.data.session.expectedBalance, 60000)
    assert.equal(r.data.session.closingBalance, 59500)
    assert.equal(r.data.session.difference, -500) // faltaron $500
  })

  test('cerrada: no deja registrar movimientos ni borrar los del histórico', async () => {
    const move = await req('POST', '/api/cash/movements', {
      token: ctx.barber.token,
      body: { type: 'income', amount: 1000, concept: 'Ya cerró la caja' },
    })
    assert.equal(move.status, 409)

    const del = await req('DELETE', `/api/cash/movements/${ctx.chargeId}`, {
      token: ctx.barber.token,
    })
    assert.equal(del.status, 409)
  })

  test('abre una nueva caja SIN fondo inicial (fondo por defecto 0)', async () => {
    const r = await req('POST', '/api/cash/open', { token: ctx.barber.token, body: {} })
    assert.equal(r.status, 201, JSON.stringify(r.data))
    assert.equal(r.data.session.openingBalance, 0)
    assert.equal(r.data.session.status, 'open')
    // La deja cerrada para no afectar a otros tests.
    await req('POST', '/api/cash/close', {
      token: ctx.barber.token,
      body: { closingBalance: 0 },
    })
  })

  test('history devuelve las sesiones con totales y cuadre', async () => {
    const r = await req('GET', '/api/cash/history', { token: ctx.barber.token })
    assert.equal(r.status, 200)
    assert.ok(r.data.sessions.length >= 2, 'debería haber al menos 2 sesiones')

    const closed = r.data.sessions.find((s) => s._id === ctx.sessionId)
    assert.ok(closed, 'la sesión principal aparece en el historial')
    assert.equal(closed.status, 'closed')
    assert.equal(closed.totals.income, 40000)
    assert.equal(closed.totals.expected, 60000)
    assert.equal(closed.difference, -500)
    assert.ok(Array.isArray(closed.movements))
  })

  test('el historial de otro dueño está vacío (filtra por el token)', async () => {
    const other = await createBarber('Aislado')
    const r = await req('GET', '/api/cash/history', { token: other.token })
    assert.equal(r.status, 200)
    assert.equal(r.data.sessions.length, 0)
  })
})

/* =================== NOTAS PRIVADAS (FICHA) =================== */

describe('Ficha técnica: notas privadas del cliente', () => {
  const ctx = {}

  test('guarda y devuelve las notas del cliente propio', async () => {
    ctx.barber = await createBarber('Fichero')
    ctx.client = await createClient(ctx.barber.userId, { name: 'Laura', phone: '3005554433' })

    const r = await req('PATCH', `/api/clients/${ctx.client._id}/notes`, {
      token: ctx.barber.token,
      body: { notes: 'Fade con la 0.5, raya izquierda, piel sensible al afeitar.' },
    })
    assert.equal(r.status, 200, JSON.stringify(r.data))
    assert.match(r.data.client.notes, /Fade con la 0\.5/)

    const get = await req('GET', `/api/clients/${ctx.client._id}`, { token: ctx.barber.token })
    assert.equal(get.status, 200)
    assert.match(get.data.client.notes, /piel sensible/)
  })

  test('permite vaciar las notas', async () => {
    const r = await req('PATCH', `/api/clients/${ctx.client._id}/notes`, {
      token: ctx.barber.token,
      body: { notes: '' },
    })
    assert.equal(r.status, 200)
    assert.equal(r.data.client.notes, '')

    // Vuelve a dejarlas cargadas para el siguiente test.
    await req('PATCH', `/api/clients/${ctx.client._id}/notes`, {
      token: ctx.barber.token,
      body: { notes: 'Prefiere máquina 2 atrás.' },
    })
  })

  test('rechaza notas de más de 500 caracteres (422)', async () => {
    const r = await req('PATCH', `/api/clients/${ctx.client._id}/notes`, {
      token: ctx.barber.token,
      body: { notes: 'a'.repeat(501) },
    })
    assert.equal(r.status, 422)
  })

  test('no deja editar la ficha de un cliente ajeno (404)', async () => {
    const other = await createBarber('Ajeno')
    const r = await req('PATCH', `/api/clients/${ctx.client._id}/notes`, {
      token: other.token,
      body: { notes: 'Intento de edición ajena' },
    })
    assert.equal(r.status, 404)

    // La ficha original no cambió.
    const check = await Client.findById(ctx.client._id).lean()
    assert.equal(check.notes, 'Prefiere máquina 2 atrás.')
  })

  test('la agenda enriquecida expone clientNotes al dueño', async () => {
    const appointment = await createAppointment({
      owner: ctx.barber.userId,
      client: ctx.client,
      date: '2027-02-01',
    })

    const r = await req('GET', '/api/appointments?from=2027-02-01&to=2027-02-01', {
      token: ctx.barber.token,
    })
    assert.equal(r.status, 200)
    assert.equal(r.data.appointments.length, 1)
    assert.equal(r.data.appointments[0].clientNotes, 'Prefiere máquina 2 atrás.')
    assert.equal(r.data.appointments[0].paid, false)

    // La cita sigue existiendo (control para evitar warnings de lint por no usar).
    assert.ok(appointment._id)
  })
})

/* ===== Seguridad: el rol del dueño se fija solo con la token ===== */

describe('Seguridad de la caja', () => {
  test('un empleado o visitante no puede usar la caja (401/403)', async () => {
    const noToken = await req('GET', '/api/cash/current')
    assert.equal(noToken.status, 401)

    const visitor = await req('POST', '/api/auth/register', {
      body: {
        name: 'Visitante',
        email: `vis${Date.now()}@test.com`,
        password: 'secreto123',
      },
    })
    assert.equal(visitor.status, 201)

    // Sin rol asignado aún => 403 en las rutas de caja.
    const r = await req('GET', '/api/cash/current', { token: visitor.data.token })
    assert.equal(r.status, 403)
  })

  test('los movimientos de un dueño jamás aparecen en la caja de otro', async () => {
    const a = await createBarber('CajaA')
    const b = await createBarber('CajaB')

    await req('POST', '/api/cash/open', { token: a.token, body: { openingBalance: 10000 } })
    await req('POST', '/api/cash/movements', {
      token: a.token,
      body: { type: 'income', amount: 7777, concept: 'Ingreso de A' },
    })

    const currentB = await req('GET', '/api/cash/current', { token: b.token })
    assert.equal(currentB.data.session, null)
    assert.equal(currentB.data.totals.income, 0)
    assert.equal(currentB.data.movements.length, 0)

    await req('POST', '/api/cash/close', {
      token: a.token,
      body: { closingBalance: 17777 },
    })
  })
})
