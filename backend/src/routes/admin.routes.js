import { Router } from 'express'
import { body } from 'express-validator'

import { validate } from '../middleware/validate.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { User, ROLES } from '../models/User.js'

const router = Router()

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
