import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'node:crypto'
import { User, SELF_ASSIGNABLE_ROLES } from '../models/User.js'

const BCRYPT_ROUNDS = 12
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000 // coherente con el modelo

function signToken(userId) {
  return jwt.sign({ sub: String(userId) }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  })
}

function publicUser(user) {
  return user.toJSON()
}

/**
 * POST /api/auth/register
 * El rol NUNCA se acepta aquí: queda en null hasta PATCH /api/auth/role.
 */
export async function register(req, res, next) {
  try {
    const { name, email, password } = req.body

    const existing = await User.findOne({ email })
    if (existing) {
      return res.status(409).json({ message: 'El correo ya está registrado' })
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)
    const user = await User.create({ name, email, passwordHash })

    res.status(201).json({ token: signToken(user._id), user: publicUser(user) })
  } catch (err) {
    next(err)
  }
}

/** POST /api/auth/login — errores genéricos para no revelar qué campo falló. */
export async function login(req, res, next) {
  try {
    const { email, password } = req.body

    const user = await User.findOne({ email }).select('+passwordHash')
    const valid = user ? await bcrypt.compare(password, user.passwordHash) : false

    if (!user || !valid) {
      return res.status(401).json({ message: 'Credenciales inválidas' })
    }

    res.json({ token: signToken(user._id), user: publicUser(user) })
  } catch (err) {
    next(err)
  }
}

/** GET /api/auth/me — perfil del usuario del token. */
export async function me(req, res) {
  res.json({ user: publicUser(req.user) })
}

/**
 * PATCH /api/auth/role
 * Solo admite roles autoasignables (barber | barbershop_owner) y solo una vez.
 * admin y barber_employee se asignan por proceso controlado (ruta admin).
 */
export async function setOwnRole(req, res, next) {
  try {
    const { role } = req.body

    if (!SELF_ASSIGNABLE_ROLES.includes(role)) {
      return res.status(403).json({ message: 'Ese rol no puede asignarse desde la aplicación' })
    }

    if (req.user.role) {
      return res.status(409).json({ message: 'Tu tipo de cuenta ya está definido' })
    }

    req.user.role = role
    req.user.roleAssignedAt = new Date()
    await req.user.save()

    res.json({ user: publicUser(req.user) })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/auth/forgot-password
 * Sin servicio de correo todavía: en desarrollo se devuelve el token en la respuesta.
 */
export async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body
    const response = {
      message: 'Si existe una cuenta con ese correo, recibirás instrucciones para restablecer tu contraseña.',
    }

    const user = await User.findOne({ email })
    if (user) {
      const rawToken = user.createPasswordResetToken()
      await user.save({ validateModifiedOnly: true })

      if (process.env.NODE_ENV !== 'production') {
        // Temporal: quitar cuando se integre el envío de correos.
        response.devToken = rawToken
      }
    }

    res.json(response)
  } catch (err) {
    next(err)
  }
}

/** POST /api/auth/reset-password */
export async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    const user = await User.findOne({
      resetPasswordTokenHash: tokenHash,
      resetPasswordExpires: { $gt: new Date() },
    }).select('+resetPasswordTokenHash +resetPasswordExpires')

    if (!user) {
      return res.status(400).json({ message: 'El enlace de recuperación es inválido o expiró' })
    }

    user.passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)
    user.clearPasswordResetToken()
    await user.save({ validateModifiedOnly: true })

    res.json({ message: 'Contraseña actualizada. Ya puedes iniciar sesión.' })
  } catch (err) {
    next(err)
  }
}
