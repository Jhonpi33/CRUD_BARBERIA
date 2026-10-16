import mongoose from 'mongoose'

import { Appointment } from '../models/Appointment.js'
import { transition, AppointmentError, APPOINTMENT_STATUSES } from '../utils/appointmentStatus.js'

/** ¿Tiene formato de ObjectId? */
function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id)
}

/**
 * GET /api/appointments?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Lista las citas del dueño autenticado en un rango de fechas (agenda
 * diaria o semanal). Si no se envía rango, devuelve las de hoy.
 * El filtro SIEMPRE es por el _id del token: nunca por un id del cliente.
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
    }).sort({ startUtc: 1 })

    res.json({ appointments, from, to })
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
    res.json({ appointment })
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
    const result = transition(appointment, next)

    appointment.status = result.status
    appointment.statusHistory.push({
      status: result.status,
      at: result.changedAt,
      by: req.user._id,
    })
    await appointment.save()

    res.json({ appointment })
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
    appointment.status = result.status
    appointment.statusHistory.push({ status: result.status, at: result.changedAt, by: req.user._id })
    await appointment.save()

    res.json({ appointment })
  } catch (err) {
    if (err instanceof AppointmentError) {
      return res.status(err.status).json({ message: err.message, code: err.code })
    }
    next(err)
  }
}
