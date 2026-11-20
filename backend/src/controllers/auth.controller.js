import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'node:crypto'
import { OAuth2Client } from 'google-auth-library'
import { User, SELF_ASSIGNABLE_ROLES } from '../models/User.js'
import {
  sendAccountCreatedEmail,
  sendAdminNewAccountEmail,
  sendPasswordResetEmail,
  sendVerificationEmail,
} from '../utils/mailer.js'
import {
  verificationEnabled,
  generateCode,
  hashCode,
  codesMatch,
  CODE_TTL_MS,
  CODE_LENGTH,
  MAX_ATTEMPTS,
} from '../utils/emailVerification.js'

const BCRYPT_ROUNDS = 12
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000 // coherente con el modelo
const CODE_TTL_SECONDS = Math.round(CODE_TTL_MS / 1000)
const googleClient = new OAuth2Client()
const googleCookie = 'elysia_google'

export function googleConfig(req, res) {
  res.set('Cache-Control', 'no-store')
  const clientId = process.env.GOOGLE_WEB_CLIENT_ID
  if (!clientId) return res.json({ enabled: false })
  const nonce = crypto.randomBytes(32).toString('hex')
  const challenge = jwt.sign({ nonce, purpose: 'google-login' }, process.env.JWT_SECRET, {
    expiresIn: '10m', audience: 'google-login',
  })
  res.cookie(googleCookie, challenge, {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production',
    path: '/api/auth/google', maxAge: 10 * 60 * 1000,
  })
  return res.json({ enabled: true, clientId, nonce })
}

export async function googleLogin(req, res, next) {
  res.set('Cache-Control', 'no-store')
  if (!process.env.GOOGLE_WEB_CLIENT_ID) {
    return res.status(503).json({ message: 'El acceso con Google no está disponible.' })
  }
  const allowedOrigin = new URL(process.env.CLIENT_URL || 'http://localhost:5173').origin
  if (req.get('origin') !== allowedOrigin) {
    return res.status(403).json({ message: 'Solicitud de acceso no válida.' })
  }
  let identity
  try {
    const cookie = req.headers.cookie?.split(';').map(value => value.trim())
      .find(value => value.startsWith(googleCookie + '='))?.slice(googleCookie.length + 1)
    const challenge = jwt.verify(decodeURIComponent(cookie || ''), process.env.JWT_SECRET, {
      audience: 'google-login', algorithms: ['HS256'],
    })
    const ticket = await googleClient.verifyIdToken({
      idToken: req.body.credential, audience: process.env.GOOGLE_WEB_CLIENT_ID,
    })
    identity = ticket.getPayload()
    if (challenge.purpose !== 'google-login' || !identity?.sub || !identity.email_verified ||
        identity.nonce !== challenge.nonce || !identity.email) {
      throw new Error('Invalid identity')
    }
  } catch {
    return res.status(401).json({ message: 'No pudimos verificar tu cuenta de Google. Intenta de nuevo.' })
  }
  try {
    // Google es autoridad del correo en Gmail y dominios Workspace verificados.
    const email = identity.email.toLowerCase()
    const authoritative = email.endsWith('@gmail.com') || Boolean(identity.hd)
    let user = await User.findOne({ googleSubject: identity.sub }).select('+googleSubject')
    let created = false
    if (!user) {
      if (!authoritative) {
        return res.status(409).json({ message: 'Para este correo, crea tu cuenta con correo y contraseña y verifica el código.' })
      }
      user = await User.findOne({ email }).select('+googleSubject')
      if (user && (!authoritative || user.emailVerifiedAt === null ||
          (user.googleSubject && user.googleSubject !== identity.sub))) {
        return res.status(409).json({ message: 'Usa el acceso con correo y contraseña para esta cuenta.' })
      }
      if (user) {
        user.googleSubject = identity.sub
        await user.save({ validateModifiedOnly: true })
      } else {
        const googleName = String(identity.name || email.split('@')[0]).trim().slice(0, 60)
        user = await User.create({
          name: googleName.length >= 2 ? googleName : 'Usuario',
          email, googleSubject: identity.sub, emailVerifiedAt: new Date(),
        })
        created = true
      }
    }
    res.clearCookie(googleCookie, {
      path: '/api/auth/google', httpOnly: true, sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })
    if (created) await notifyNewAccount(user, false)
    return res.json({ token: signToken(user._id), user: publicUser(user) })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'La cuenta ya está creada. Intenta iniciar sesión de nuevo.' })
    }
    next(error)
  }
}

/** ¿La cuenta está esperando el código? (null = pendiente, undefined = anterior a la validación) */
function isPendingVerification(user) {
  return user?.emailVerifiedAt === null
}

/** Borra el código vigente (tras verificarlo, vencido o por intentos agotados). */
function clearVerificationCode(user) {
  user.emailVerificationCodeHash = undefined
  user.emailVerificationExpires = undefined
  user.emailVerificationAttempts = 0
}

function signToken(userId) {
  return jwt.sign({ sub: String(userId) }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  })
}

function publicUser(user) {
  return user.toJSON()
}

/** Genera un código nuevo, lo guarda hasheado y lo devuelve en claro. */
async function issueVerificationCode(user) {
  const code = generateCode()
  user.emailVerificationCodeHash = hashCode(user.email, code)
  user.emailVerificationExpires = new Date(Date.now() + CODE_TTL_MS)
  user.emailVerificationAttempts = 0
  await user.save({ validateModifiedOnly: true })
  return code
}

async function notifyNewAccount(user, requiresVerification) {
  const results = await Promise.all([
    sendAccountCreatedEmail({
      to: user.email,
      name: user.name,
      requiresVerification,
    }),
    sendAdminNewAccountEmail({
      to: process.env.ADMIN_EMAIL,
      accountName: user.name,
      accountEmail: user.email,
      requiresVerification,
    }),
  ])

  for (const result of results) {
    if (!result.sent && !result.skipped) {
      console.error('[registro] no se pudo enviar un aviso de cuenta nueva:', result.error?.code || 'error SMTP')
    }
  }
}

/**
 * En producción la cuenta permanece pendiente si el correo falla. En desarrollo
 * se devuelve el código para que el equipo pueda probar sin SMTP.
 */
async function resolveUnsentCode(user, code, res) {
  if (process.env.NODE_ENV === 'production') {
    return res.status(503).json({
      message: 'No pudimos enviar el código de verificación. Intenta de nuevo en unos minutos.',
    })
  }

  return res.status(201).json({
    verification: {
      email: user.email,
      sent: false,
      devCode: code,
      expiresInSeconds: CODE_TTL_SECONDS,
      message: 'No se pudo enviar el correo. En desarrollo puedes usar este código.',
    },
    user: publicUser(user),
  })
}

/**
 * POST /api/auth/register
 * El rol NUNCA se acepta aquí: queda en null hasta PATCH /api/auth/role.
 *
 * Con la validación de correo obligada, la cuenta nace PENDIENTE
 * (`emailVerifiedAt = null`), se envía un código de 6 dígitos y NO se
 * devuelve token: lo entrega /api/auth/verify-email. Sin validación activa,
 * responde igual que siempre (token inmediato).
 */
export async function register(req, res, next) {
  try {
    const { name, email, password } = req.body

    const existing = await User.findOne({ email })
    if (existing) {
      return res.status(409).json({ message: 'El correo ya está registrado' })
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)
    const mustVerify = verificationEnabled()
    const user = await User.create({
      name,
      email,
      passwordHash,
      // null = pendiente de verificar; sin validación => cuenta ya válida.
      emailVerifiedAt: mustVerify ? null : new Date(),
    })

    if (!mustVerify) {
      await notifyNewAccount(user, false)
      return res.status(201).json({ token: signToken(user._id), user: publicUser(user) })
    }

    const code = await issueVerificationCode(user)
    const [mail] = await Promise.all([
      sendVerificationEmail({
        to: user.email,
        name: user.name,
        code,
        minutes: Math.round(CODE_TTL_MS / 60000),
      }),
      notifyNewAccount(user, true),
    ])

    if (mail.sent) {
      return res.status(201).json({
        verification: {
          email: user.email,
          sent: true,
          expiresInSeconds: CODE_TTL_SECONDS,
        },
        user: publicUser(user),
      })
    }

    return resolveUnsentCode(user, code, res)
  } catch (err) {
    next(err)
  }
}

/** POST /api/auth/login — errores genéricos para no revelar qué campo falló. */
export async function login(req, res, next) {
  try {
    const { email, password } = req.body

    const user = await User.findOne({ email }).select('+passwordHash')
    const valid = user?.passwordHash ? await bcrypt.compare(password, user.passwordHash) : false

    if (!user || !valid) {
      return res.status(401).json({ message: 'Credenciales inválidas' })
    }

    // Solo se avisa de la cuenta sin verificar DESPUÉS de validar la
    // contraseña: así no se revela si el correo existe.
    if (isPendingVerification(user)) {
      return res.status(403).json({
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Tu correo aún no está verificado. Revisa tu bandeja o pide un código nuevo.',
        email: user.email,
      })
    }

    res.json({ token: signToken(user._id), user: publicUser(user) })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/auth/verify-email — { email, code }
 * Comprueba el código de 6 dígitos y entrega el token.
 * Todos los fallos responden igual (400 genérico) para no filtrar si existe
 * la cuenta ni si el código está cerca.
 */
export async function verifyEmail(req, res, next) {
  try {
    const { email, code } = req.body

    const invalid = (message) =>
      res.status(400).json({ code: 'CODE_INVALID', message })

    const user = await User.findOne({ email })
      .select(
        '+emailVerificationCodeHash +emailVerificationExpires +emailVerificationAttempts'
      )
    if (!user || !isPendingVerification(user) || !user.emailVerificationCodeHash) {
      return invalid('El código no es válido o ya expiró. Pide uno nuevo.')
    }

    if (
      !user.emailVerificationExpires ||
      user.emailVerificationExpires.getTime() < Date.now()
    ) {
      clearVerificationCode(user)
      await user.save({ validateModifiedOnly: true })
      return invalid('El código expiró. Pide uno nuevo.')
    }

    const attempts = user.emailVerificationAttempts || 0
    if (attempts >= MAX_ATTEMPTS) {
      clearVerificationCode(user)
      await user.save({ validateModifiedOnly: true })
      return invalid('Demasiados intentos. Pide un código nuevo.')
    }

    const match = codesMatch(
      user.emailVerificationCodeHash,
      hashCode(user.email, code)
    )

    if (!match) {
      user.emailVerificationAttempts = attempts + 1
      const exhausted = user.emailVerificationAttempts >= MAX_ATTEMPTS
      if (exhausted) clearVerificationCode(user)
      await user.save({ validateModifiedOnly: true })
      return invalid(
        exhausted
          ? 'Demasiados intentos. Pide un código nuevo.'
          : `Código incorrecto. Te quedan ${
              MAX_ATTEMPTS - user.emailVerificationAttempts
            } intentos.`
      )
    }

    user.emailVerifiedAt = new Date()
    clearVerificationCode(user)
    await user.save({ validateModifiedOnly: true })

    res.json({
      token: signToken(user._id),
      user: publicUser(user),
      message: 'Correo verificado',
    })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/auth/resend-verification — { email }
 * Emite un código nuevo (el anterior deja de servir). La respuesta es la
 * MISMA exista o no la cuenta: no se revela quién está registrado.
 */
export async function resendVerification(req, res, next) {
  try {
    const { email } = req.body
    const response = {
      message:
        'Si el correo está registrado y falta verificarlo, te enviamos un código nuevo.',
    }

    const user = await User.findOne({ email })
    if (user && isPendingVerification(user)) {
      const code = await issueVerificationCode(user)
      const mail = await sendVerificationEmail({
        to: user.email,
        name: user.name,
        code,
        minutes: Math.round(CODE_TTL_MS / 60000),
      })

      if (mail.sent) {
        response.verification = {
          email: user.email,
          sent: true,
          expiresInSeconds: CODE_TTL_SECONDS,
        }
      } else if (process.env.NODE_ENV !== 'production') {
        // Mismo criterio que en el registro: fuera de producción se entrega
        // el código en la respuesta para no bloquear el desarrollo.
        response.verification = {
          email: user.email,
          sent: false,
          devCode: code,
          expiresInSeconds: CODE_TTL_SECONDS,
        }
      } else {
        console.error('[verificacion] no se pudo reenviar el código:', mail.error?.code || mail.reason || 'error SMTP')
      }
    }

    res.json(response)
  } catch (err) {
    next(err)
  }
}

/** GET /api/auth/me — perfil del usuario del token. */
export async function me(req, res) {
  res.json({ user: publicUser(req.user) })
}

/**
 * PATCH /api/auth/me
 * Actualiza nombre y/o teléfono de la propia cuenta. El teléfono es opcional
 * (se puede borrar mandando ""), y es la llave con la que una cuenta `client`
 * encuentra sus citas hechas sin cuenta.
 */
export async function updateMe(req, res, next) {
  try {
    if (req.body.name !== undefined) req.user.name = req.body.name
    if (req.body.phone !== undefined) req.user.phone = req.body.phone
    await req.user.save()
    res.json({ user: publicUser(req.user) })
  } catch (err) {
    next(err)
  }
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
 * En producción el enlace solo se entrega por correo. En desarrollo, si el
 * correo no está disponible, se devuelve el token para poder probar el flujo.
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

      const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173'
      const resetUrl = new URL('/recuperar-contrasena', clientUrl)
      resetUrl.searchParams.set('token', rawToken)
      const mail = await sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetUrl: resetUrl.toString(),
        minutes: RESET_TOKEN_TTL_MS / 60000,
      })

      if (!mail.sent && process.env.NODE_ENV !== 'production') {
        response.devToken = rawToken
      } else if (!mail.sent) {
        console.error('[password-reset] no se pudo enviar el correo:', mail.error?.code || mail.reason || 'error SMTP')
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
