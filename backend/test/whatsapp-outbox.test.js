import './env.js'
import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import { Appointment } from '../src/models/Appointment.js'
import { Profile } from '../src/models/Profile.js'
import { WhatsAppOutbox } from '../src/models/WhatsAppOutbox.js'
import {
  isWhatsAppConfigured,
  processWhatsAppOutbox,
  queueAppointmentStatusWhatsApp,
  queueBookingWhatsApp,
  setWhatsAppTransport,
} from '../src/services/whatsappCloud.js'

const ENV_KEYS = [
  'WHATSAPP_ACCESS_TOKEN',
  'WHATSAPP_PHONE_NUMBER_ID',
  'WHATSAPP_GRAPH_API_VERSION',
  'WHATSAPP_TEMPLATE_LANGUAGE',
  'WHATSAPP_TEMPLATE_BOOKING_OWNER',
  'WHATSAPP_TEMPLATE_BOOKING_CLIENT',
  'WHATSAPP_TEMPLATE_CONFIRMED_CLIENT',
  'WHATSAPP_TEMPLATE_REMINDER_CLIENT',
  'WHATSAPP_TEMPLATE_CANCELLED_CLIENT',
]
const previousEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]))
const delivered = []

before(async () => {
  process.env.WHATSAPP_ACCESS_TOKEN = 'test-token'
  process.env.WHATSAPP_PHONE_NUMBER_ID = 'test-phone-id'
  process.env.WHATSAPP_GRAPH_API_VERSION = 'v99.0'
  process.env.WHATSAPP_TEMPLATE_LANGUAGE = 'es_CO'
  process.env.WHATSAPP_TEMPLATE_BOOKING_OWNER = 'booking_owner'
  process.env.WHATSAPP_TEMPLATE_BOOKING_CLIENT = 'booking_client'
  process.env.WHATSAPP_TEMPLATE_CONFIRMED_CLIENT = 'confirmed_client'
  process.env.WHATSAPP_TEMPLATE_REMINDER_CLIENT = 'reminder_client'
  process.env.WHATSAPP_TEMPLATE_CANCELLED_CLIENT = 'cancelled_client'
  setWhatsAppTransport(async (job) => delivered.push(job))
  await mongoose.connect(process.env.MONGODB_URI)
  await mongoose.connection.dropDatabase()
  await Promise.all([Appointment.init(), Profile.init(), WhatsAppOutbox.init()])
})

after(async () => {
  setWhatsAppTransport(null)
  await mongoose.disconnect()
  for (const [key, value] of Object.entries(previousEnv)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

async function createAppointment({ optIn = true } = {}) {
  const owner = new mongoose.Types.ObjectId()
  const client = new mongoose.Types.ObjectId()
  const service = new mongoose.Types.ObjectId()
  const startUtc = new Date(Date.now() + 5 * 60 * 60 * 1000)
  const date = startUtc.toISOString().slice(0, 10)
  await Profile.create({
    owner,
    type: 'barber',
    professionalName: 'Barbero de prueba',
    phone: '3001234567',
    location: 'San Gil, Santander',
    whatsappNotificationsEnabled: true,
  })
  const appointment = await Appointment.create({
    owner,
    client,
    service,
    serviceSnapshot: { name: 'Corte clásico', price: 20000, durationMinutes: 30 },
    clientSnapshot: { name: 'Cliente de prueba', phone: '3112223344', whatsappOptIn: optIn },
    locationSnapshot: 'San Gil, Santander',
    date,
    timezone: 'America/Bogota',
    localStart: '10:00',
    localEnd: '10:30',
    startMinutes: 600,
    endMinutes: 630,
    startUtc,
    endUtc: new Date(startUtc.getTime() + 30 * 60 * 1000),
    occupiedSlots: [`${date}:600`, `${date}:615`],
    status: 'pending',
    source: 'public',
  })
  return appointment
}

describe('Notificaciones WhatsApp con Cloud API', () => {
  test('configuración exige token, número e identificador de versión válido', () => {
    assert.equal(isWhatsAppConfigured(), true)
    assert.equal(isWhatsAppConfigured({ WHATSAPP_ACCESS_TOKEN: 'x', WHATSAPP_PHONE_NUMBER_ID: 'y' }), false)
  })

  test('reserva encola avisos opt-in y el recordatorio sin duplicar', async () => {
    const appointment = await createAppointment()
    await queueBookingWhatsApp(appointment)
    await queueBookingWhatsApp(appointment)

    const jobs = await WhatsAppOutbox.find({ appointment: appointment._id }).sort({ recipientRole: 1 }).lean()
    assert.equal(jobs.length, 3)
    assert.equal(jobs.filter((job) => job.templateName === 'reminder_client').length, 1)
    assert.ok(jobs.some((job) => job.recipientPhone === '573001234567' && job.recipientRole === 'barber'))
    assert.ok(jobs.some((job) => job.recipientPhone === '573112223344' && job.recipientRole === 'client'))

    const firstRun = await processWhatsAppOutbox({ now: new Date(), limit: 10 })
    assert.equal(firstRun.processed, 2)
    assert.equal(delivered.length, 2)
    assert.ok((await WhatsAppOutbox.countDocuments({ appointment: appointment._id, status: 'sent' })) === 2)
  })

  test('al confirmar se avisa al cliente y se procesa recordatorio solo con cita confirmada', async () => {
    const appointment = await Appointment.findOne({ 'clientSnapshot.name': 'Cliente de prueba' })
    appointment.status = 'confirmed'
    appointment.statusHistory.push({ status: 'confirmed', at: new Date() })
    await appointment.save()
    await queueAppointmentStatusWhatsApp(appointment, 'confirmed')

    const confirmed = await WhatsAppOutbox.findOne({ appointment: appointment._id, templateName: 'confirmed_client' })
    assert.ok(confirmed)
    await processWhatsAppOutbox({ now: new Date(), limit: 10 })
    assert.ok(delivered.some((job) => job.templateName === 'confirmed_client'))

    const reminder = await WhatsAppOutbox.findOne({ appointment: appointment._id, templateName: 'reminder_client' })
    const reminderRun = await processWhatsAppOutbox({ now: reminder.scheduledAt, limit: 10 })
    assert.equal(reminderRun.processed, 1)
    assert.equal((await WhatsAppOutbox.findById(reminder._id)).status, 'sent')
  })

  test('sin consentimiento del cliente no se encola WhatsApp para él', async () => {
    const appointment = await createAppointment({ optIn: false })
    await queueBookingWhatsApp(appointment)
    const jobs = await WhatsAppOutbox.find({ appointment: appointment._id }).lean()
    assert.equal(jobs.length, 1)
    assert.equal(jobs[0].recipientRole, 'barber')
  })
})
