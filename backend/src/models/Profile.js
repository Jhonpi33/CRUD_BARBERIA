import mongoose from 'mongoose'

/** Tipos de perfil: derivados del rol, nunca elegidos por el cliente. */
export const PROFILE_TYPES = ['barber', 'barbershop']

/** Configuración inicial del negocio (solo barbería). */
const businessSettingsSchema = new mongoose.Schema(
  {
    currency: { type: String, default: 'COP', maxlength: 8 },
    openingTime: { type: String, default: '09:00', maxlength: 5 },
    closingTime: { type: String, default: '20:00', maxlength: 5 },
    appointmentDuration: { type: Number, default: 30, min: 10, max: 240 },
  },
  { _id: false }
)

/**
 * Perfil público/negocio de un usuario. Un documento por propietario.
 * `owner` es el _id del usuario autenticado (del token, nunca del body).
 * El `type` se deriva del rol del usuario, no se acepta del cliente.
 */
const profileSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    type: {
      type: String,
      enum: PROFILE_TYPES,
      required: true,
    },

    // ---- Comunes a ambos tipos ----
    phone: { type: String, trim: true, maxlength: 30, default: '' },
    location: { type: String, trim: true, maxlength: 160, default: '' },

    // ---- Solo barbero ----
    professionalName: { type: String, trim: true, maxlength: 80, default: '' },
    photoUrl: { type: String, trim: true, maxlength: 300, default: '' },
    description: { type: String, trim: true, maxlength: 600, default: '' },
    // Enlace público corto (ej. "carlos-el-barbero"). Se genera al completar.
    slug: { type: String, trim: true, lowercase: true, maxlength: 80, default: null },

    // ---- Solo barbería ----
    businessName: { type: String, trim: true, maxlength: 80, default: '' },
    logoUrl: { type: String, trim: true, maxlength: 300, default: '' },
    settings: { type: businessSettingsSchema, default: () => ({}) },

    // Marca si el onboarding quedó completo (para poder retomarlo si no).
    completedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, transform: (_doc, ret) => { delete ret.__v; return ret } },
    toObject: { virtuals: true },
  }
)

/** true si el onboarding ya se terminó. */
profileSchema.virtual('isCompleted').get(function isCompleted() {
  return Boolean(this.completedAt)
})

/**
 * Campos obligatorios según el tipo, usados al marcar como completado.
 * Fuente única de verdad en backend.
 */
export const REQUIRED_FIELDS = {
  barber: ['professionalName', 'phone', 'location', 'description'],
  barbershop: ['businessName', 'phone', 'location'],
}

export const Profile = mongoose.model('Profile', profileSchema)
