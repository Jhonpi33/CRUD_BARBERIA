import mongoose from 'mongoose'

import { CashSession } from '../models/CashSession.js'
import { CashMovement } from '../models/CashMovement.js'
import { Schedule } from '../models/Schedule.js'
import { Appointment } from '../models/Appointment.js'
import { calendarDateIn } from '../utils/timezone.js'

/** ¿Tiene formato de ObjectId? */
function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id)
}

/**
 * Día calendario de hoy (YYYY-MM-DD) en la zona horaria del dueño.
 * Se toma del horario guardado en `Schedule`; si aún no tiene, la app
 * asume Colombia (la misma zona por defecto de schedule.controller).
 */
async function ownerToday(userId) {
  const schedule = await Schedule.findOne({ owner: userId }).select('timezone').lean()
  return calendarDateIn(Date.now(), schedule?.timezone || 'America/Bogota')
}

/**
 * Totales de una sesión: ingresos, egresos y saldo esperado
 * (fondo inicial + ingresos - egresos). Se calculan SOLO con los
 * movimientos del dueño y de esa sesión.
 */
async function totalsOf(session) {
  const movements = await CashMovement.find({ session: session._id })
    .sort({ createdAt: 1 })
    .lean()

  let income = 0
  let expense = 0
  for (const m of movements) {
    if (m.type === 'income') income += m.amount
    else expense += m.amount
  }

  return {
    movements,
    totals: {
      income: round2(income),
      expense: round2(expense),
      count: movements.length,
      expected: round2(session.openingBalance + income - expense),
    },
  }
}

/** Redondea a 2 decimales (los precios de servicios tienen 2 decimales). */
function round2(n) {
  return Math.round(n * 100) / 100
}

/** Busca la sesión ABIERTA del dueño (o null). */
async function openSessionOf(userId) {
  return CashSession.findOne({ owner: userId, status: 'open' })
}

/**
 * GET /api/cash/current
 * Devuelve la caja abierta (o null), sus movimientos y los totales.
 * Si no hay caja abierta, sesión y movimientos vienen vacíos y los
 * totales en cero (para que la vista siempre tenga forma).
 */
export async function getCurrentCash(req, res, next) {
  try {
    const session = await openSessionOf(req.user._id)
    if (!session) {
      return res.json({
        session: null,
        movements: [],
        totals: { income: 0, expense: 0, count: 0, expected: 0 },
      })
    }

    const { movements, totals } = await totalsOf(session)
    res.json({ session, movements, totals })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/cash/open — { openingBalance?, note? }
 * Abre la caja del día. Si ya hay una abierta responde 409.
 */
export async function openCash(req, res, next) {
  try {
    const body = req.body ?? {}
    const existing = await openSessionOf(req.user._id)
    if (existing) {
      return res.status(409).json({ message: 'Ya tienes la caja abierta' })
    }

    const openingBalance = body.openingBalance ?? 0
    const date = await ownerToday(req.user._id)

    const session = await CashSession.create({
      owner: req.user._id,
      date,
      openingBalance,
      openingNote: typeof body.note === 'string' ? body.note.trim() : '',
      status: 'open',
    })

    res.status(201).json({ session })
  } catch (err) {
    // Carrera entre dos "abrir caja" simultáneos: el índice único parcial
    // (solo una sesión abierta por dueño) rechaza el segundo con 11000.
    if (err?.code === 11000) {
      return res.status(409).json({ message: 'Ya tienes la caja abierta' })
    }
    next(err)
  }
}

/**
 * POST /api/cash/close — { closingBalance, note? }
 * Cierra la caja: guarda el conteo manual del barbero y calcula el
 * saldo esperado y la diferencia del cuadre. Si no hay caja abierta, 409.
 */
export async function closeCash(req, res, next) {
  try {
    const body = req.body ?? {}
    const session = await openSessionOf(req.user._id)
    if (!session) {
      return res.status(409).json({ message: 'No tienes la caja abierta' })
    }

    const { totals } = await totalsOf(session)
    const closingBalance = body.closingBalance
    const difference = round2(closingBalance - totals.expected)

    session.status = 'closed'
    session.closedAt = new Date()
    session.closingBalance = closingBalance
    session.expectedBalance = totals.expected
    session.difference = difference
    session.closingNote = typeof body.note === 'string' ? body.note.trim() : ''
    await session.save()

    res.json({ session })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/cash/movements — { type, amount, concept, method?, appointmentId? }
 * Registra un ingreso o egreso en la caja ABIERTA.
 * - Sin caja abierta => 409 (la caja nunca queda "en negativo" por omisión).
 * - `appointmentId` solo con type 'income' (es un cobro de cita).
 * - Si esa cita ya fue cobrada => 409 (índice único 11000).
 */
export async function createMovement(req, res, next) {
  try {
    const session = await openSessionOf(req.user._id)
    if (!session) {
      return res.status(409).json({ message: 'Abre la caja para registrar movimientos' })
    }

    const { type, amount, concept, method } = req.body ?? {}
    const rawAppointmentId = req.body?.appointmentId
    let appointmentId = null

    if (rawAppointmentId !== undefined && rawAppointmentId !== null && rawAppointmentId !== '') {
      if (!isValidId(rawAppointmentId)) {
        return res.status(400).json({ message: 'Identificador de cita inválido' })
      }
      if (type !== 'income') {
        return res.status(422).json({ message: 'Un cobro de cita debe ser un ingreso' })
      }

      // La cita debe existir y ser del dueño del token (nunca de otro barbero).
      const appointment = await Appointment.findOne({
        _id: rawAppointmentId,
        owner: req.user._id,
      }).select('serviceSnapshot clientSnapshot')
      if (!appointment) {
        return res.status(404).json({ message: 'Cita no encontrada' })
      }
      appointmentId = appointment._id
    }

    const movement = await CashMovement.create({
      owner: req.user._id,
      session: session._id,
      type,
      amount,
      concept: concept?.trim(),
      method: method || 'cash',
      appointment: appointmentId,
    })

    res.status(201).json({ movement })
  } catch (err) {
    // Mismo cobro de la misma cita dos veces (índice único) => 409.
    if (err?.code === 11000) {
      return res.status(409).json({ message: 'Esta cita ya tiene un cobro registrado' })
    }
    next(err)
  }
}

/**
 * DELETE /api/cash/movements/:id
 * Borra un registro equivocado, solo mientras su sesión sigue abierta.
 * Los movimientos de sesiones cerradas son inmutables (histórico).
 */
export async function deleteMovement(req, res, next) {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: 'Identificador de movimiento inválido' })
    }

    const movement = await CashMovement.findOne({
      _id: req.params.id,
      owner: req.user._id,
    })
    if (!movement) return res.status(404).json({ message: 'Movimiento no encontrado' })

    const session = await CashSession.findOne({ _id: movement.session, owner: req.user._id })
    if (!session || session.status !== 'open') {
      return res.status(409).json({ message: 'Solo puedes borrar movimientos de la caja abierta' })
    }

    await movement.deleteOne()
    res.json({ message: 'Movimiento eliminado' })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/cash/history?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Sesiones del dueño (abiertas y cerradas) en el rango, con totales y
 * movimientos de cada una: sirve para el reporte y el cierre del día.
 */
export async function getCashHistory(req, res, next) {
  try {
    const dateRe = /^\d{4}-\d{2}-\d{2}$/
    const today = await ownerToday(req.user._id)
    const from = typeof req.query.from === 'string' && dateRe.test(req.query.from) ? req.query.from : today
    const to = typeof req.query.to === 'string' && dateRe.test(req.query.to) ? req.query.to : from

    if (from > to) {
      return res.status(422).json({ message: 'El rango de fechas es inválido (from > to)' })
    }

    const sessions = await CashSession.find({
      owner: req.user._id,
      date: { $gte: from, $lte: to },
    })
      .sort({ date: -1 })
      .limit(90)
      .lean()

    const items = []
    for (const session of sessions) {
      const { movements, totals } = await totalsOf(session)
      items.push({ ...session, movements, totals })
    }

    res.json({ sessions: items, from, to })
  } catch (err) {
    next(err)
  }
}
