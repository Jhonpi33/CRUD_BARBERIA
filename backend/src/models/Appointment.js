import mongoose from 'mongoose'
import { APPOINTMENT_STATUSES, BLOCKING_STATUSES } from '../utils/appointmentStatus.js'

/**
 * Cita entre un cliente y el propietario (barbero o barbería).
 *
 * ── Control de concurrencia (Fase 5) ──────────────────────────────────────
 * `occupiedSlots` guarda una CLAVE POR CADA INICIO de granularidad que la
 * cita bloquea (ej. una cita de 08:00 a 08:45 bloquea 08:00, 08:15, 08:30).
 * Sobre ese campo existe un ÍNDICE ÚNICO PARcial activo solo para las citas
 * que ocupan espacio (pending/confirmed).
 *
 * Consecuencia: dos citas que se solapen comparten al menos una clave, y
 * MongoDB rechaza el segundo INSERT con un error de duplicado de forma
 * ATÓMICA. No hay ventana de carrera entre "buscar" y "guardar": es el
 * propio motor el que impide el doble booking incluso con peticiones
 * simultáneas. Una cita cancelada sale del índice (parcial) y libera sus
 * claves, permitiendo reservar ese hueco de nuevo.
 *
 * ── Datos históricos ─────────────────────────────────────────────────────
 * Se guarda una COPIA del servicio (nombre, precio, duración) en el momento
 * de reservar: editar el servicio después no altera citas anteriores.
 * Igualmente se copian nombre y teléfono del cliente en la propia cita.
 *
 * ── Tiempo ────────────────────────────────────────────────────────────────
 * `startUtc`/`endUtc` son instantes UTC (para comparar, ordenar y detectar
 * solapes sin ambigüedad). `date`, `localStart` y `localEnd` son "wall-clock"
 * en la zona del propietario en el momento de la reserva (cómo lo ve el
 * cliente). Si el propietario cambia de zona después, las citas previas
 * conservan su zona original.
 */
const appointmentSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      immutable: true,
      index: true,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
      index: true,
    },
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: true,
      immutable: true,
    },

    // Copia del servicio al momento de reservar (dato histórico).
    serviceSnapshot: {
      name: { type: String, required: true, maxlength: 120 },
      price: { type: Number, required: true, min: 0 },
      durationMinutes: { type: Number, required: true, min: 10, max: 240 },
    },

    // Copia de los datos del cliente al momento de reservar.
    clientSnapshot: {
      name: { type: String, required: true, maxlength: 120 },
      phone: { type: String, required: true, maxlength: 40 },
      whatsappOptIn: { type: Boolean, default: false },
    },
    locationSnapshot: { type: String, trim: true, maxlength: 160, default: '' },

    // --- Tiempo (ver comentario superior) ---
    date: {
      type: String,
      required: true,
      maxlength: 10,
      immutable: true,
    },
    timezone: {
      type: String,
      required: true,
      maxlength: 60,
      immutable: true,
    },
    localStart: { type: String, required: true, maxlength: 5, immutable: true },
    localEnd: { type: String, required: true, maxlength: 5, immutable: true },
    startMinutes: { type: Number, required: true, min: 0, max: 1440, immutable: true },
    endMinutes: { type: Number, required: true, min: 0, max: 1440, immutable: true },
    startUtc: { type: Date, required: true, immutable: true, index: true },
    endUtc: { type: Date, required: true, immutable: true },

    // Claves de slot bloqueadas (alimentan el índice único de concurrencia).
    occupiedSlots: {
      type: [String],
      required: true,
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'Una cita debe bloquear al menos un slot',
      },
    },

    status: {
      type: String,
      enum: APPOINTMENT_STATUSES,
      default: 'pending',
      index: true,
    },
    // Quién originó la reserva (cliente por link público, o el dueño).
    source: {
      type: String,
      enum: ['public', 'owner', 'agent'],
      default: 'public',
    },
    notes: { type: String, trim: true, maxlength: 300, default: '' },

    // Auditoría de cambios de estado: [{ status, at, by }]
    statusHistory: {
      type: [
        new mongoose.Schema(
          {
            status: { type: String, enum: APPOINTMENT_STATUSES, required: true },
            at: { type: Date, default: Date.now },
            by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
          },
          { _id: false }
        ),
      ],
      default: () => [],
    },
  },
  {
    timestamps: true,
    toJSON: { transform: (_doc, ret) => { delete ret.__v; return ret } },
  }
)

/**
 * ÍNDICE ÚNICO PARCIAL: solo se exige unicidad de `occupiedSlots` para las
 * citas que ocupan espacio (pending/confirmed). Al cancelar/completar, el
 * documento deja de cumplir el filtro y sus claves quedan LIBRES para
 * reservar de nuevo.
 */
appointmentSchema.index(
  { owner: 1, occupiedSlots: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: BLOCKING_STATUSES } },
  }
)

// Consultas típicas de la agenda: citas de un dueño por fecha/estado.
appointmentSchema.index({ owner: 1, date: 1, status: 1 })
appointmentSchema.index({ owner: 1, startUtc: 1 })

export const Appointment = mongoose.model('Appointment', appointmentSchema)
