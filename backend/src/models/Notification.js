import mongoose from 'mongoose'

/**
 * Notificación interna del panel (Fase 6.1).
 *
 * Cada propietario (barber o barbershop_owner) tiene su propia bandeja.
 * `owner` + `dedupeKey` forman una CLAVE ÚNICA: así, un reintento o una
 * doble ejecución del mismo evento (p. ej. la misma cita) nunca duplica
 * la notificación — el motor rechaza el segundo INSERT con código 11000.
 *
 * `readAt` en `null` significa "no leída"; al marcarla se guarda el instante
 * en que se leyó. `createdAt`/`updatedAt` vienen de `timestamps: true`.
 */
const notificationSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      immutable: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['booking_created'],
      required: true,
    },
    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      default: null,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'El título de la notificación es obligatorio'],
      trim: true,
      maxlength: 120,
    },
    message: {
      type: String,
      required: [true, 'El mensaje de la notificación es obligatorio'],
      trim: true,
      maxlength: 300,
    },
    // null = no leída.
    readAt: {
      type: Date,
      default: null,
    },
    // Clave de idempotencia: `${type}:${appointmentId}`.
    dedupeKey: {
      type: String,
      required: true,
      maxlength: 200,
      immutable: true,
    },
  },
  {
    timestamps: true,
    toJSON: { transform: (_doc, ret) => { delete ret.__v; return ret } },
  }
)

// Un mismo evento (cita) genera UNA sola notificación por propietario.
notificationSchema.index({ owner: 1, dedupeKey: 1 }, { unique: true })

// Consultas típicas de la bandeja: no leídas de un dueño.
notificationSchema.index({ owner: 1, readAt: 1 })

export const Notification = mongoose.model('Notification', notificationSchema)
