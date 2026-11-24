import './env.js'
import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { createServer } from 'node:http'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import app from '../src/app.js'
import { Appointment } from '../src/models/Appointment.js'
import { Profile } from '../src/models/Profile.js'
import { User } from '../src/models/User.js'
import { WhatsAppConnection } from '../src/models/WhatsAppConnection.js'
import { WhatsAppOutbox } from '../src/models/WhatsAppOutbox.js'
import { processWhatsAppOutbox, queueAppointmentStatusWhatsApp, queueBookingWhatsApp } from '../src/services/whatsappCloud.js'

const sessions = new Map()
const sent = []
let openwa
let api
const qrCode = 'data:image/png;base64,AAAA'

function listen(server) {
  return new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
}

function stubGateway(req, res) {
  async function handle() {
    const reply = (status, data) => {
      res.writeHead(status, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(data))
    }
    if (req.headers['x-api-key'] !== 'openwa-local-test') return reply(401, {})
    const url = new URL(req.url, 'http://localhost')
    const [, , , id, action, method] = url.pathname.split('/')
    let raw = ''
    for await (const chunk of req) raw += chunk
    const body = raw ? JSON.parse(raw) : null

    if (!id && req.method === 'POST') {
      if ([...sessions.values()].some((row) => row.name === body.name)) return reply(409, {})
      const session = { id: randomUUID(), name: body.name, status: 'created' }
      sessions.set(session.id, session)
      return reply(201, session)
    }
    if (!id) return reply(200, [...sessions.values()].filter((row) => row.name === url.searchParams.get('name')))
    const session = sessions.get(id)
    if (!session) return reply(404, {})
    if (req.method === 'DELETE') {
      sessions.delete(id)
      return reply(204)
    }
    if (action === 'start') {
      session.status = 'qr_ready'
      return reply(201, session)
    }
    if (action === 'qr') return reply(200, { qrCode })
    if (action === 'pairing-code' && body.phoneNumber === '573001234567') return reply(201, { pairingCode: 'AB12CD34' })
    if (action === 'messages' && method === 'send-text' && session.status === 'ready') {
      sent.push({ id, key: req.headers['idempotency-key'], ...body })
      return reply(201, { messageId: randomUUID() })
    }
    if (!action) return reply(200, session)
    return reply(409, {})
  }
  void handle().catch(() => res.writeHead(500).end())
}

before(async () => {
  openwa = createServer(stubGateway)
  await listen(openwa)
  process.env.WHATSAPP_PROVIDER = 'openwa'
  process.env.OPENWA_URL = `http://127.0.0.1:${openwa.address().port}`
  process.env.OPENWA_API_KEY = 'openwa-local-test'
  await mongoose.connect(process.env.MONGODB_URI)
  await Promise.all([WhatsAppConnection.init(), WhatsAppOutbox.init()])
  api = app.listen(0, '127.0.0.1')
  await new Promise((resolve) => api.once('listening', resolve))
})

after(async () => {
  await Promise.all([api, openwa].filter(Boolean).map((server) => new Promise((resolve) => server.close(resolve))))
  await mongoose.disconnect()
})

async function getAccount(phone = '3001234567') {
  const suffix = randomUUID()
  const owner = await User.create({ name: 'Barbero local', email: `${suffix}@example.test`, role: 'barber', googleSubject: suffix })
  await Profile.create({ owner: owner.id, type: 'barber', professionalName: 'Cortes El Parque', phone, location: 'San Gil, Santander', whatsappNotificationsEnabled: true })
  return { owner: owner._id, token: jwt.sign({ sub: owner.id }, process.env.JWT_SECRET) }
}

async function request(method, path, token) {
  const response = await fetch(`http://127.0.0.1:${api.address().port}/api/whatsapp/${path}`, {
    method, headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  return { status: response.status, data: await response.json(), cache: response.headers.get('cache-control') }
}

async function start(account) {
  const response = await request('POST', 'connection', account.token)
  assert.equal(response.data.status, 'qr_ready')
  const mapping = await WhatsAppConnection.findOne({ owner: account.owner }).lean()
  return sessions.get(mapping.sessionId)
}

async function fakeAppointment(owner, optIn, minute = 0) {
  const startUtc = new Date(Date.now() + 6 * 60 * 60 * 1000 + minute * 60_000)
  const endUtc = new Date(startUtc.getTime() + 30 * 60_000)
  const date = startUtc.toISOString().slice(0, 10)
  return Appointment.create({
    owner, client: new mongoose.Types.ObjectId(), service: new mongoose.Types.ObjectId(),
    serviceSnapshot: { name: 'Corte clásico', price: 30000, durationMinutes: 30 },
    clientSnapshot: { name: 'Cliente de prueba', phone: '3112223344', whatsappOptIn: optIn },
    locationSnapshot: 'San Gil, Santander', date, timezone: 'America/Bogota', source: 'public',
    localStart: '10:00', localEnd: '10:30', startMinutes: 600 + minute, endMinutes: 630 + minute,
    startUtc, endUtc, occupiedSlots: [`${date}:${600 + minute}`, `${date}:${615 + minute}`], status: 'pending',
  })
}

test('cada cuenta recibe su propia sesión y el QR y código requieren autenticación', async () => {
  assert.equal((await request('GET', 'connection')).status, 401)
  const first = await getAccount()
  const second = await getAccount('3021234567')
  const firstSession = await start(first)
  assert.equal((await request('GET', 'connection', second.token)).data.status, 'unlinked')
  const secondSession = await start(second)
  assert.notEqual(firstSession.id, secondSession.id)
  assert.deepEqual(await request('GET', 'connection', first.token), { status: 200, data: { status: 'qr_ready', qrCode }, cache: 'no-store' })
  assert.deepEqual((await request('POST', 'connection/code', first.token)).data, { pairingCode: 'AB12CD34' })
  firstSession.status = 'ready'
  firstSession.phone = '573001234567'
  assert.deepEqual((await request('GET', 'connection', first.token)).data, { status: 'ready', phone: '573001234567' })
  secondSession.status = 'ready'
  secondSession.phone = firstSession.phone
  assert.equal((await request('GET', 'connection', second.token)).data.status, 'number_in_use')
  assert.equal((await request('DELETE', 'connection', second.token)).data.status, 'unlinked')
  assert.ok(sessions.has(firstSession.id))
})

test('OpenWA entrega por la sesión correcta, respeta el permiso y espera la confirmación para recordar', async () => {
  const account = await getAccount('3012123456')
  const session = await start(account)
  session.status = 'ready'
  session.phone = '573012123456'
  await request('GET', 'connection', account.token)

  const appointment = await fakeAppointment(account.owner, true)
  await queueBookingWhatsApp(appointment)
  await queueBookingWhatsApp(appointment)
  await processWhatsAppOutbox()
  const deliveries = sent.slice()
  assert.equal(deliveries.length, 2)
  assert.ok(deliveries.every((message) => message.id === session.id && message.key.startsWith('elysia-')))
  assert.deepEqual(deliveries.map((message) => message.chatId).sort(), ['573012123456@c.us', '573112223344@c.us'])

  const filter = { appointment: appointment._id, templateName: 'reminder:3h' }
  const reminder = await WhatsAppOutbox.findOne(filter).lean()
  assert.equal(appointment.startUtc - reminder.scheduledAt, 3 * 60 * 60_000)
  await processWhatsAppOutbox({ now: reminder.scheduledAt })
  assert.equal(sent.length, 2)
  const deferred = await WhatsAppOutbox.findOne(filter).lean()
  assert.equal(deferred.attempts, 0)

  appointment.status = 'confirmed'
  await appointment.save()
  await queueAppointmentStatusWhatsApp(appointment, 'confirmed')
  await processWhatsAppOutbox({ now: deferred.scheduledAt })
  const message = sent.find((entry) => entry.text.includes('Te recordamos'))
  assert.ok(message)
  assert.match(message.text, /Corte clásico/)
  assert.match(message.text, /Fecha: [^\n]+\nHora: 10:00 a 10:30/)
  assert.match(message.text, /google\.com\/maps\/search\/\?api=1&query=San%20Gil%2C%20Santander/)
  assert.ok(sent.some((entry) => entry.text.includes('Tu cita está confirmada')))

  const noConsent = await fakeAppointment(account.owner, false, 60)
  await queueBookingWhatsApp(noConsent)
  const jobs = await WhatsAppOutbox.find({ appointment: noConsent._id }).lean()
  assert.deepEqual(jobs.map((job) => job.recipientRole), ['barber'])

  const cancelled = await fakeAppointment(account.owner, true, 120)
  await queueBookingWhatsApp(cancelled)
  cancelled.status = 'cancelled'
  await cancelled.save()
  await queueAppointmentStatusWhatsApp(cancelled, 'cancelled')
  assert.equal((await WhatsAppOutbox.findOne({ appointment: cancelled._id, templateName: 'reminder:3h' })).status, 'cancelled')

  await request('DELETE', 'connection', account.token)
  await processWhatsAppOutbox()
  assert.equal((await WhatsAppOutbox.findById(jobs[0]._id)).lastErrorCode, 'OPENWA_CONNECTION_CHANGED')
})
