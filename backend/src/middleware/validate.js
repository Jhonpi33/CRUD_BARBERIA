import { validationResult } from 'express-validator'

/**
 * Ejecuta las validaciones de express-validator de una ruta.
 * Si hay errores responde 422 con el primer mensaje en JSON { message }.
 */
export function validate(validations) {
  if (!Array.isArray(validations)) {
    throw new TypeError('validate() espera un arreglo de validaciones: validate([...])')
  }

  return async (req, res, next) => {
    for (const validation of validations) {
      await validation.run(req)
    }

    const errors = validationResult(req)
    if (errors.isEmpty()) return next()

    res.status(422).json({ message: errors.array()[0].msg })
  }
}
