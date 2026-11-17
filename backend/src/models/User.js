import mongoose from 'mongoose'
import crypto from 'node:crypto'

/**
 * Roles del sistema.
 * - client: persona que solo reserva (perfil de cliente, sin barbería).
 * - barber: barbero individual (panel individual).
 * - barbershop_owner: propietario de una barbería (panel de equipo).
 * - barber_employee: empleado de una barbería (cuando exista el módulo de equipo).
 * - admin: administración interna (asignación controlada, nunca desde el frontend).
 */
export const ROLES = ['client', 'barber', 'barbershop_owner', 'barber_employee', 'admin']

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
    /*
      Teléfono de la persona (opcional).
      Sirve para que una cuenta de tipo `client` encuentre sus citas: las
      reservas públicas no piden cuenta, así que el único hilo que las une es
      el número con el que se reservó.
    */
    phone: {
      type: String,
      trim: true,
      maxlength: 40,
      default: '',
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
    /*
      Validación de correo (código de 6 dígitos).

      `emailVerifiedAt` SIN `default` a propósito:
      - undefined => cuenta creada antes de esta función: ya es válida y
        sigue entrando sin cambios (nada se rompe al desplegar).
      - null      => cuenta creada con la validación activa y AÚN sin verificar.
      - Date      => verificada.
      El código solo se guarda hasheado (HMAC con JWT_SECRET).
    */
    emailVerifiedAt: {
      type: Date,
    },
    emailVerificationCodeHash: {
      type: String,
      select: false,
    },
    emailVerificationExpires: {
      type: Date,
      select: false,
    },
    emailVerificationAttempts: {
      type: Number,
      select: false,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.passwordHash
        delete ret.resetPasswordTokenHash
        delete ret.resetPasswordExpires
        delete ret.emailVerificationCodeHash
        delete ret.emailVerificationExpires
        delete ret.emailVerificationAttempts
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
