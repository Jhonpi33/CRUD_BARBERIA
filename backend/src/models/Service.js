import mongoose from 'mongoose'

/**
 * Servicio ofrecido por un barbero o una barbería.
 * - `owner` es el usuario autenticado (del JWT); inmutable y con índice único
 *   compuesto (owner, name) para evitar nombres repetidos del mismo dueño.
 * - Los servicios inactivos no se ofrecen en la disponibilidad de reservas.
 */
const serviceSchema = new mongoose.Schema(
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
      required: [true, 'El nombre del servicio es obligatorio'],
      trim: true,
      minlength: [2, 'El nombre debe tener al menos 2 caracteres'],
      maxlength: [80, 'El nombre no puede superar 80 caracteres'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'La descripción no puede superar 500 caracteres'],
      default: '',
    },
    price: {
      type: Number,
      required: [true, 'El precio es obligatorio'],
      min: [0, 'El precio no puede ser negativo'],
      validate: {
        // Precisión monetaria: máximo 2 decimales y valor finito.
        validator: (v) =>
          typeof v === 'number' &&
          Number.isFinite(v) &&
          Math.abs(v * 100 - Math.round(v * 100)) < 1e-6,
        message: 'El precio debe ser un número finito con máximo 2 decimales',
      },
    },
    durationMinutes: {
      type: Number,
      required: [true, 'La duración es obligatoria'],
      validate: {
        validator: (v) => Number.isInteger(v) && v >= 10 && v <= 240,
        message: 'La duración debe ser un entero entre 10 y 240 minutos',
      },
    },
    /**
     * Minutos de aire que se dejan DESPUÉS de la cita (y ANTES de la
     * siguiente): cambio de turno, limpieza, espera. La disponibilidad nunca
     * ofrece un inicio dentro de ese margen respecto de otra cita.
     * 0 = sin margen. No forma parte de la duración que ve el cliente.
     */
    bufferMinutes: {
      type: Number,
      default: 10,
      validate: {
        validator: (v) => Number.isInteger(v) && v >= 0 && v <= 120,
        message: 'El margen debe ser un entero entre 0 y 120 minutos',
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { transform: (_doc, ret) => { delete ret.__v; return ret } },
  }
)

// Un dueño no puede tener dos servicios con el mismo nombre.
serviceSchema.index({ owner: 1, name: 1 }, { unique: true })

export const Service = mongoose.model('Service', serviceSchema)
