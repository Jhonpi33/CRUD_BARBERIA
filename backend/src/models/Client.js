import mongoose from 'mongoose'

/**
 * Cliente de un propietario (barbero o barbería).
 *
 * Se deduplica por TELÉFONO dentro del mismo dueño: dos personas con el
 * mismo número se consideran el mismo cliente, y así el historial de citas
 * queda agrupado sin duplicar registros innecesarios.
 *
 * `phoneNormalized` guarda solo los dígitos (sin espacios, guiones ni '+')
 * para que la comparación sea robusta ante formatos distintos
 * ("+57 300 111 2233" y "3001112233" son el mismo cliente).
 */
const clientSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      immutable: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'El nombre del cliente es obligatorio'],
      trim: true,
      maxlength: 120,
    },
    phone: {
      type: String,
      required: [true, 'El teléfono del cliente es obligatorio'],
      trim: true,
      maxlength: 40,
    },
    // Versión solo dígitos, para deduplicar y buscar de forma robusta.
    phoneNormalized: {
      type: String,
      required: true,
      maxlength: 40,
      immutable: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 120,
      default: '',
    },
    notes: { type: String, trim: true, maxlength: 500, default: '' },
  },
  {
    timestamps: true,
    toJSON: { transform: (_doc, ret) => { delete ret.__v; return ret } },
  }
)

// Un dueño no puede tener dos clientes con el mismo teléfono.
clientSchema.index({ owner: 1, phoneNormalized: 1 }, { unique: true })

/** Normaliza un teléfono a solo dígitos (deduplicación). */
export function normalizePhone(phone) {
  return String(phone || '').replace(/\D+/g, '')
}

export const Client = mongoose.model('Client', clientSchema)
