import mongoose from 'mongoose'
import { DAY_KEYS } from '../utils/scheduleValidation.js'

/** Un bloque laboral o un descanso: intervalo en formato HH:MM (hora local). */
const intervalSchema = new mongoose.Schema(
  {
    start: { type: String, required: true, maxlength: 5 },
    end: { type: String, required: true, maxlength: 5 },
  },
  { _id: false }
)

const daySchema = new mongoose.Schema(
  {
    isWorkingDay: { type: Boolean, default: false },
    // Varios bloques por día => jornada partida.
    blocks: { type: [intervalSchema], default: () => [] },
    // Descansos/pausas dentro de los bloques laborales.
    breaks: { type: [intervalSchema], default: () => [] },
  },
  { _id: false }
)

function defaultDays() {
  return Object.fromEntries(DAY_KEYS.map((key) => [key, { isWorkingDay: false, blocks: [], breaks: [] }]))
}

/**
 * Configuración semanal de atención. Un documento por propietario
 * (índice único sobre `owner`: evita configuraciones duplicadas).
 *
 * Los horarios son "wall-clock" en `timezone`: las horas HH:MM se
 * interpretan en esa zona horaria IANA. La conversión a instantes UTC
 * se deja para la Fase 5 (sistema de citas).
 */
const scheduleSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      immutable: true,
      unique: true,
      index: true,
    },
    timezone: {
      type: String,
      required: true,
      default: 'America/Bogota',
      maxlength: 60,
    },
    days: {
      type: Object,
      default: defaultDays,
    },
  },
  {
    timestamps: true,
    toJSON: { transform: (_doc, ret) => { delete ret.__v; return ret } },
  }
)

export const Schedule = mongoose.model('Schedule', scheduleSchema)

export { defaultDays, DAY_KEYS }
