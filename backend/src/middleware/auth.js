import jwt from 'jsonwebtoken'
import { User } from '../models/User.js'

/**
 * Verifica el Bearer token, carga el usuario desde la BD y lo adjunta a req.user.
 * Siempre filtra por el _id del token: el cliente nunca dicta qué usuario consultar.
 */
export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || ''
    const [scheme, token] = header.split(' ')

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ message: 'No autorizado: falta el token' })
    }

    let payload
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET)
    } catch {
      return res.status(401).json({ message: 'No autorizado: sesión inválida o expirada' })
    }

    const user = await User.findById(payload.sub)
    if (!user) {
      return res.status(401).json({ message: 'No autorizado: la cuenta ya no existe' })
    }

    req.user = user
    next()
  } catch (err) {
    next(err)
  }
}

/**
 * Restringe rutas a roles específicos. Usarse después de requireAuth.
 * Uso: requireRole('admin')
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'No tienes permiso para realizar esta acción' })
    }
    next()
  }
}
