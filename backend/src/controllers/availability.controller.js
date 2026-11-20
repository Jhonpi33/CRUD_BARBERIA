import mongoose from 'mongoose'
import { Service } from '../models/Service.js'
import { Schedule } from '../models/Schedule.js'
import {
  computeAvailability,
  AvailabilityError,
  isValidDate,
} from '../utils/availability.js'

/** Granularidad de agenda: separación mínima entre inicios (no es la duración). */
const STEP_MINUTES = 15

/**
 * GET /api/availability?date=YYYY-MM-DD&serviceId=...
 *
 * Política de autorización (Fase 4): PRIVADA — el servicio debe pertenecer
 * al usuario autenticado. La página pública de reservas de la Fase 5 usará
 * una política pública explícita aparte; ambos modelos no se mezclan.
 *
 * Preparación para reservas: NO crea citas ni garantiza que el intervalo
 * siga libre (llega con la Fase 5, junto al control de concurrencia).
 */
export async function getAvailability(req, res, next) {
  try {
    const { date, serviceId } = req.query

    if (!isValidDate(date)) {
      return res.status(422).json({
        message: 'Fecha inválida',
        errors: [{ path: 'date', message: 'Usa una fecha real en formato YYYY-MM-DD' }],
      })
    }

    if (typeof serviceId !== 'string' || !mongoose.Types.ObjectId.isValid(serviceId)) {
      return res.status(400).json({ message: 'Identificador de servicio inválido' })
    }

    // El servicio debe ser del usuario autenticado; ajeno o inexistente => 404.
    const service = await Service.findOne({ _id: serviceId, owner: req.user._id })
    if (!service) return res.status(404).json({ message: 'Servicio no encontrado' })

    // 9) Los servicios inactivos no se ofrecen.
    if (!service.isActive) {
      return res.status(404).json({ message: 'Este servicio no está disponible actualmente' })
    }

    const schedule = await Schedule.findOne({ owner: req.user._id })
    const timezone = schedule?.timezone || 'America/Bogota'
    const dayKey = schedule ? dayKeyOf(date) : null
    const day = dayKey ? schedule.days?.[dayKey] : undefined

    const slots = computeAvailability({
      date,
      timezone,
      day,
      durationMinutes: service.durationMinutes,
      stepMinutes: STEP_MINUTES,
    })

    res.json({
      date,
      timezone,
      serviceId: service._id,
      durationMinutes: service.durationMinutes,
      stepMinutes: STEP_MINUTES,
      slots,
    })
  } catch (err) {
    if (err instanceof AvailabilityError) {
      return res.status(422).json({
        message: err.message,
        errors: [{ path: 'date', message: err.message }],
      })
    }
    next(err)
  }
}

/** Fecha de calendario -> clave de día ('mon'...'sun'). */
function dayKeyOf(date) {
  const [y, m, d] = date.split('-').map(Number)
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  return ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][weekday]
}
