import { Schedule, defaultDays } from '../models/Schedule.js'
import { validateWeekInput, isValidTimezone } from '../utils/scheduleValidation.js'

/**
 * GET /api/schedule/me
 * Sin configuración previa => devuelve valores iniciales seguros en `defaults`
 * SIN crear documentos en la base de datos.
 */
export async function getMySchedule(req, res, next) {
  try {
    const schedule = await Schedule.findOne({ owner: req.user._id })
    if (!schedule) {
      return res.json({
        schedule: null,
        defaults: { timezone: 'America/Bogota', days: defaultDays() },
      })
    }
    res.json({ schedule })
  } catch (err) {
    next(err)
  }
}

/**
 * PUT /api/schedule/me — crea o actualiza la configuración semanal.
 *
 * - `owner` y `timezone` de otro usuario no pueden alterarse: el owner sale
 *   del JWT y el timezone solo se acepta si es una zona IANA válida.
 * - Merge POR DÍA: los días presentes en el body reemplazan a los
 *   guardados; los ausentes conservan su valor (evita pisar otros días).
 * - La validación de bloques/descansos es completa antes de persistir.
 */
export async function putMySchedule(req, res, next) {
  try {
    const { timezone, days } = req.body || {}

    // --- Zona horaria ---
    let newTimezone
    if (timezone !== undefined) {
      if (!isValidTimezone(timezone)) {
        return res.status(422).json({
          message: 'Zona horaria inválida',
          errors: [{ path: 'timezone', message: 'Usa una zona horaria IANA, ej. America/Bogota' }],
        })
      }
      newTimezone = timezone
    }

    // --- Días enviados ---
    const hasDays = days !== undefined
    if (hasDays) {
      const result = validateWeekInput(days)
      if (!result.ok) {
        return res.status(422).json({ message: 'La configuración de horario no es válida', errors: result.errors })
      }
    }

    // --- Cargar existente para hacer merge por día ---
    const existing = await Schedule.findOne({ owner: req.user._id })

    if (hasDays) {
      const mergedDays = { ...(existing?.days || defaultDays()) }
      for (const [key, value] of Object.entries(days)) {
        // Normaliza claves faltantes dentro del día enviado.
        mergedDays[key] = {
          isWorkingDay: value.isWorkingDay,
          blocks: Array.isArray(value.blocks) ? value.blocks : [],
          breaks: Array.isArray(value.breaks) ? value.breaks : [],
        }
      }
      const data = {
        timezone: newTimezone ?? existing?.timezone ?? 'America/Bogota',
        days: mergedDays,
      }

      // upsert + índice único sobre owner: una sola configuración por dueño.
      const schedule = await Schedule.findOneAndUpdate(
        { owner: req.user._id },
        { $set: data, $setOnInsert: { owner: req.user._id } },
        { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
      )

      // La respuesta refleja lo realmente persistido.
      return res.json({ schedule })
    }

    // Solo timezone, sin días: crea el documento con días vacíos si no existe.
    const schedule = await Schedule.findOneAndUpdate(
      { owner: req.user._id },
      {
        $set: { timezone: newTimezone },
        $setOnInsert: { owner: req.user._id, days: defaultDays() },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
    )
    res.json({ schedule })
  } catch (err) {
    if (err.code === 11000) {
      // Carrera de concurrencia: otro request creó primero la configuración.
      return res.status(409).json({ message: 'Ya existe una configuración de horario; vuelve a intentar' })
    }
    next(err)
  }
}
