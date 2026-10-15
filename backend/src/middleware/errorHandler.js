/** Manejador 404 para rutas no encontradas. */
export function notFoundHandler(_req, res) {
  res.status(404).json({ message: 'Ruta no encontrada' })
}

/** Manejador global de errores: siempre responde JSON { message }, sin stack traces en producción. */
export function errorHandler(err, _req, res, _next) {
  console.error('[error]', err.message)

  // Errores de Mongoose (validación, duplicados, cast).
  if (err.name === 'ValidationError') {
    const first = Object.values(err.errors)[0]
    return res.status(422).json({ message: first?.message || 'Datos inválidos' })
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ message: 'Identificador inválido' })
  }
  if (err.code === 11000) {
    return res.status(409).json({ message: 'El correo ya está registrado' })
  }

  const message =
    process.env.NODE_ENV === 'production' ? 'Error interno del servidor' : err.message

  res.status(err.status || 500).json({ message })
}
