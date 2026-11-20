import { Router } from 'express'
import { body, query } from 'express-validator'

import { validate } from '../middleware/validate.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { User, ROLES } from '../models/User.js'

const router = Router()

/** Lista cuentas para la revisión del piloto. Solo visible para administradores. */
router.get(
  '/users',
  requireAuth,
  requireRole('admin'),
  validate([
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('search').optional().trim().isLength({ max: 80 }),
  ]),
  async (req, res, next) => {
    try {
      const limit = Number(req.query.limit) || 50
      const search = String(req.query.search || '').trim()
      const filter = search
        ? {
            $or: [
              { name: { $regex: escapeRegex(search), $options: 'i' } },
              { email: { $regex: escapeRegex(search), $options: 'i' } },
            ],
          }
        : {}

      const [users, total] = await Promise.all([
        User.find(filter)
          .select('name email role emailVerifiedAt createdAt')
          .sort({ createdAt: -1, _id: -1 })
          .limit(limit)
          .lean(),
        User.countDocuments(filter),
      ])

      res.json({
        users: users.map((user) => ({
          id: String(user._id),
          name: user.name,
          email: user.email,
          role: user.role,
          emailVerified: user.emailVerifiedAt !== null,
          createdAt: user.createdAt,
        })),
        total,
        limit,
      })
    } catch (err) {
      next(err)
    }
  }
)

/**
 * Asignación CONTROLADA de roles (admin y barber_employee).
 * Requiere un usuario con rol admin autenticado; el frontend normal no llama aquí.
 */
router.patch(
  '/users/:id/role',
  requireAuth,
  requireRole('admin'),
  validate([
    body('role')
      .isString()
      .withMessage('El rol es obligatorio')
      .isIn(ROLES)
      .withMessage(`Rol inválido. Valores permitidos: ${ROLES.join(', ')}`),
  ]),
  async (req, res, next) => {
    try {
      const user = await User.findByIdAndUpdate(
        req.params.id,
        { role: req.body.role, roleAssignedAt: new Date() },
        { new: true, runValidators: true }
      )

      if (!user) {
        return res.status(404).json({ message: 'Usuario no encontrado' })
      }

      res.json({ user: user.toJSON() })
    } catch (err) {
      next(err)
    }
  }
)

export default router

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
