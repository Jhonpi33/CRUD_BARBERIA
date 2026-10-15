import mongoose from 'mongoose'
import crypto from 'node:crypto'

/**
 * Roles del sistema.
 * - barber: barbero individual (panel individual).
 * - barbershop_owner: propietario de una barbería (panel de equipo).
 * - barber_employee: empleado de una barbería (cuando exista el módulo de equipo).
 * - admin: administración interna (asignación controlada, nunca desde el frontend).
 */
export const ROLES = ['barber', 'barbershop_owner', 'barber_employee', 'admin']

/** Roles que el usuario puede elegir él mismo en /seleccionar-rol. */
export const SELF_ASSIGNABLE_ROLES = ['barber', 'barbershop_owner']

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'El nombre es obligatorio'],
      trim: true,
      minlength: 2,
      maxlength: 60,
    },
    email: {
      type: String,
      required: [true, 'El correo es obligatorio'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'La contraseña es obligatoria'],
      select: false,
    },
    // null = sin rol asignado todavía (debe pasar por /seleccionar-rol).
    role: {
      type: String,
      enum: ROLES,
      default: null,
    },
    roleAssignedAt: {
      type: Date,
      default: null,
    },
    // Recuperación de contraseña: se guarda solo el hash del token.
    resetPasswordTokenHash: {
      type: String,
      select: false,
    },
    resetPasswordExpires: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.passwordHash
        delete ret.resetPasswordTokenHash
        delete ret.resetPasswordExpires
        delete ret.__v
        return ret
      },
    },
  }
)

/** Genera un token de recuperación y devuelve el token en claro (para enviarlo al usuario). */
userSchema.methods.createPasswordResetToken = function createPasswordResetToken() {
  const rawToken = crypto.randomBytes(32).toString('hex')
  this.resetPasswordTokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
  this.resetPasswordExpires = new Date(Date.now() + 30 * 60 * 1000) // 30 minutos
  return rawToken
}

userSchema.methods.clearPasswordResetToken = function clearPasswordResetToken() {
  this.resetPasswordTokenHash = undefined
  this.resetPasswordExpires = undefined
}

export const User = mongoose.model('User', userSchema)
