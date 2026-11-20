import mongoose from 'mongoose'

/**
 * Movimiento de caja (ingreso o egreso) dentro de una sesión.
 *
 * - `amount` SIEMPRE es positivo; el signo lo da `type` ('income' | 'expense').
 *   Así un egreso de 20.000 no puede registrarse por error como -20.000.
 * - `method` es solo informativo (para el cuadre: cuánto es efectivo, cuánto
 *   transferencia). No afecta los cálculos.
 * - `appointment` opcional: cuando el barbero cobra desde la tarjeta de la
 *   cita, se guarda el vínculo. El índice único de abajo impide, de forma
 *   ATÓMICA en la base de datos, cobrar dos veces la misma cita (el segundo
 *   INSERT falla con 11000 => 409 en la API).
 */
const cashMovementSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      immutable: true,
      index: true,
    },
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CashSession',
      required: true,
      immutable: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['income', 'expense'],
      required: [true, 'El tipo de movimiento es obligatorio'],
    },
    amount: {
      type: Number,
      required: [true, 'El valor del movimiento es obligatorio'],
      min: [0.01, 'El valor debe ser mayor que cero'],
    },
    concept: {
      type: String,
      required: [true, 'El concepto del movimiento es obligatorio'],
      trim: true,
      maxlength: 140,
    },
    method: {
      type: String,
      enum: ['cash', 'transfer', 'card'],
      default: 'cash',
    },
    // Cobro vinculado a una cita (null para ingresos/egresos manuales).
    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { transform: (_doc, ret) => { delete ret.__v; return ret } },
  }
)

// Una cita solo puede tener UN cobro registrado (evita doble cobro).
cashMovementSchema.index(
  { appointment: 1 },
  { unique: true, partialFilterExpression: { appointment: { $type: 'objectId' } } }
)

// Movimientos de una sesión en orden cronológico.
cashMovementSchema.index({ session: 1, createdAt: 1 })

export const CashMovement = mongoose.model('CashMovement', cashMovementSchema)
