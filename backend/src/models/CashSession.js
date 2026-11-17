import mongoose from 'mongoose'

/**
 * Sesión de caja de un propietario (barbero o barbería).
 *
 * Ciclo de vida:
 *   open  --POST /close-->  closed
 *
 * - Solo puede existir UNA sesión abierta por dueño a la vez: el índice único
 *   parcial de abajo lo garantiza a nivel de base de datos, incluso si dos
 *   peticiones de "abrir caja" llegan al mismo tiempo (la segunda recibe un
 *   error 11000 y se traduce en un 409).
 * - `openingBalance` es el fondo inicial con el que el barbero arranca el día.
 * - Al cerrar se guarda el conteo manual del barbero (`closingBalance`) y el
 *   saldo esperado calculado por el servidor (`expectedBalance` = fondo +
 *   ingresos - egresos). `difference` es lo que faltó o sobró en el cuadre.
 *
 * `date` es el día calendario (YYYY-MM-DD) en la zona horaria del dueño,
 * igual que hacen las citas (`Schedule.timezone`).
 */
const cashSessionSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      immutable: true,
      // Sin `index: true`: el índice de owner lo declara schema.index() más
      // abajo (único parcial de "solo una caja abierta"); declararlo en dos
      // sitios hace que Mongo se queje por nombre de índice duplicado.
    },
    date: {
      type: String,
      required: [true, 'La fecha de la sesión es obligatoria'],
      maxlength: 10,
      index: true,
    },
    status: {
      type: String,
      enum: ['open', 'closed'],
      default: 'open',
      index: true,
    },

    // Apertura
    openingBalance: {
      type: Number,
      required: true,
      min: [0, 'El fondo inicial no puede ser negativo'],
    },
    openingNote: { type: String, trim: true, maxlength: 200, default: '' },
    openedAt: { type: Date, default: Date.now },

    // Cierre (null mientras la sesión está abierta)
    closedAt: { type: Date, default: null },
    closingBalance: { type: Number, min: 0, default: null },
    expectedBalance: { type: Number, min: 0, default: null },
    // Positivo = sobró dinero; negativo = faltó dinero.
    difference: { type: Number, default: null },
    closingNote: { type: String, trim: true, maxlength: 200, default: '' },
  },
  {
    timestamps: true,
    toJSON: { transform: (_doc, ret) => { delete ret.__v; return ret } },
  }
)

/**
 * Regla de negocio (a nivel de BD): solo UNA sesión abierta por dueño.
 * El filtro parcial solo aplica a las sesiones con status 'open', así que
 * el histórico cerrado no choca con ninguna otra.
 */
cashSessionSchema.index({ owner: 1 }, { unique: true, partialFilterExpression: { status: 'open' } })

// Consulta típica: sesiones del dueño ordenadas por día.
cashSessionSchema.index({ owner: 1, date: -1 })

export const CashSession = mongoose.model('CashSession', cashSessionSchema)
