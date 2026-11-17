import mongoose from 'mongoose'

import { Appointment } from '../models/Appointment.js'
import { CashMovement } from '../models/CashMovement.js'
import { Client } from '../models/Client.js'
import { transition, AppointmentError, APPOINTMENT_STATUSES } from '../utils/appointmentStatus.js'
import { queueAppointmentStatusWhatsApp } from '../services/whatsappCloud.js'

/** ¿Tiene formato de ObjectId? */
function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id)
}

/**
 * Extras que la Agenda pinta en cada tarjeta y que también deben viajar en
 * las respuestas de detalle/cambio de estado (si no, al cambiar el estado la
 * vista perdería la ficha y el indicador de cobro):
 * - `clientNotes`: ficha técnica privada del cliente.
 * - `paid`: true si esa cita ya tiene un cobro en caja.
 */
async function withAppointmentExtras(appointment, ownerId) {
  const [client, paidMovement] = await Promise.all([
    Client.findById(appointment.client).select('notes').lean(),
    CashMovement.findOne({ owner: ownerId, appointment: appointment._id })
      .select('amount')
      .lean(),
  ])
  const plain = typeof appointment.toObject === 'function' ? appointment.toObject() : appointment
  return {
    ...plain,
    clientNotes: client?.notes || '',
    paid: Boolean(paidMovement),
  }
}

/**
 * GET /api/appointments?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Lista las citas del dueño autenticado en un rango de fechas (agenda
 * diaria o semanal). Si no se envía rango, devuelve las de hoy.
 * El filtro SIEMPRE es por el _id del token: nunca por un id del cliente.
 *
 * A cada cita se le añaden dos campos de conveniencia para la Agenda:
 * - `clientNotes`: ficha técnica privada del cliente (para verla al
 *   abrir la cita antes de cortar). Solo existe en esta respuesta
 *   privada; el perfil público nunca la expone.
 * - `paid`: true si esa cita ya tiene un cobro registrado en caja.
 */
export async function listAppointments(req, res, next) {
  try {
    const today = new Date().toISOString().slice(0, 10)
    const from = typeof req.query.from === 'string' ? req.query.from : today
    const to = typeof req.query.to === 'string' ? req.query.to : from

    // Validación ligera de formato de fecha.
    const dateRe = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRe.test(from) || !dateRe.test(to)) {
      return res.status(422).json({
        message: 'Fechas inválidas',
        errors: [{ path: 'from', message: 'Usa fechas en formato YYYY-MM-DD' }],
      })
    }

    const appointments = await Appointment.find({
      owner: req.user._id,
      date: { $gte: from, $lte: to },
    })
      .sort({ startUtc: 1 })
      .populate('client', 'notes')
      .lean()

    // ¿Qué citas de este rango ya fueron cobradas en caja?
    const paidMovements = await CashMovement.find({
      owner: req.user._id,
      appointment: { $in: appointments.map((a) => a._id) },
    })
      .select('appointment amount')
      .lean()
    const paidByAppointment = new Map(
      paidMovements.map((m) => [String(m.appointment), m.amount])
    )

    const items = appointments.map((a) => ({
      ...a,
      // populate deja el cliente como objeto { _id, notes }; se conserva
      // solo el id para no cambiar el contrato que ya usa el frontend.
      client: a.client?._id ?? a.client,
      clientNotes: a.client?.notes || '',
      paid: paidByAppointment.has(String(a._id)),
    }))

    res.json({ appointments: items, from, to })
  } catch (err) {
    next(err)
  }
}

/** GET /api/appointments/:id — una cita propia (o ajena => 404). */
export async function getAppointment(req, res, next) {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: 'Identificador de cita inválido' })
    }
    const appointment = await Appointment.findOne({
      _id: req.params.id,
      owner: req.user._id,
    })
    if (!appointment) return res.status(404).json({ message: 'Cita no encontrada' })
    res.json({ appointment: await withAppointmentExtras(appointment, req.user._id) })
  } catch (err) {
    next(err)
  }
}

/**
 * PATCH /api/appointments/:id/status — { status }
 * Cambia el estado con máquina de transiciones validada en backend.
 * Ej.: pending -> confirmed -> completed|cancelled|no_show.
 */
export async function updateAppointmentStatus(req, res, next) {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: 'Identificador de cita inválido' })
    }
    const { status: next } = req.body

    const appointment = await Appointment.findOne({
      _id: req.params.id,
      owner: req.user._id,
    })
    if (!appointment) return res.status(404).json({ message: 'Cita no encontrada' })

    // Valida la transición (puede lanzar AppointmentError => 409/422).
    const previousStatus = appointment.status
    const result = transition(appointment, next)

    if (result.status !== previousStatus) {
      appointment.status = result.status
      appointment.statusHistory.push({
        status: result.status,
        at: result.changedAt,
        by: req.user._id,
      })
      await appointment.save()
      await queueAppointmentStatusWhatsApp(appointment, appointment.status)
    }

    res.json({ appointment: await withAppointmentExtras(appointment, req.user._id) })
  } catch (err) {
    if (err instanceof AppointmentError) {
      return res.status(err.status).json({ message: err.message, code: err.code })
    }
    next(err)
  }
}

/** DELETE /api/appointments/:id — cancela (borrado lógico vía status). */
export async function cancelAppointment(req, res, next) {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: 'Identificador de cita inválido' })
    }
    const appointment = await Appointment.findOne({
      _id: req.params.id,
      owner: req.user._id,
    })
    if (!appointment) return res.status(404).json({ message: 'Cita no encontrada' })

    const result = transition(appointment, 'cancelled')
    if (result.status !== appointment.status) {
      appointment.status = result.status
      appointment.statusHistory.push({ status: result.status, at: result.changedAt, by: req.user._id })
      await appointment.save()
      await queueAppointmentStatusWhatsApp(appointment, 'cancelled')
    }

    res.json({ appointment })
  } catch (err) {
    if (err instanceof AppointmentError) {
      return res.status(err.status).json({ message: err.message, code: err.code })
    }
    next(err)
  }
}
