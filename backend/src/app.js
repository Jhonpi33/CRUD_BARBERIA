import express from 'express'
import mongoose from 'mongoose'
import helmet from 'helmet'
import cors from 'cors'
import { existsSync } from 'node:fs'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import authRoutes from './routes/auth.routes.js'
import adminRoutes from './routes/admin.routes.js'
import profileRoutes from './routes/profile.routes.js'
import serviceRoutes from './routes/service.routes.js'
import scheduleRoutes from './routes/schedule.routes.js'
import availabilityRoutes from './routes/availability.routes.js'
import appointmentRoutes from './routes/appointment.routes.js'
import clientRoutes from './routes/client.routes.js'
import cashRoutes from './routes/cash.routes.js'
import publicBookingRoutes from './routes/publicBooking.routes.js'
import notificationRoutes from './routes/notification.routes.js'
import assistantHelpRoutes from './routes/assistantHelp.routes.js'
import whatsappRoutes from './routes/whatsapp.routes.js'
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js'

const app = express()
const serveFrontend = process.env.SERVE_FRONTEND === 'true'

app.set('trust proxy', 1)

app.use(helmet({
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  ...(serveFrontend ? {
  contentSecurityPolicy: {
    directives: {
      styleSrc: ["'self'", 'https://fonts.googleapis.com', 'https://accounts.google.com/gsi/style', "'unsafe-inline'"],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      scriptSrc: ["'self'", 'https://accounts.google.com/gsi/client'],
      frameSrc: ["'self'", 'https://accounts.google.com'],
      connectSrc: ["'self'", 'https://accounts.google.com'],
    },
  },
  } : {}),
}))
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
)
// Permite guardar una foto de perfil comprimida como data URL (sin aceptar
// archivos grandes). El frontend limita la imagen a un tamaño pequeño antes
// de enviarla.
app.use(express.json({ limit: '250kb' }))

/** Readiness check: distingue API activa de API con MongoDB listo. */
app.get('/api/health', (_req, res) => {
  const database = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  const ready = database === 'connected'

  res.status(ready ? 200 : 503).json({
    status: ready ? 'ok' : 'degraded',
    service: 'elysia-api',
    database,
  })
})

app.use('/api/auth', authRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/profile', profileRoutes)
app.use('/api/services', serviceRoutes)
app.use('/api/schedule', scheduleRoutes)
app.use('/api/availability', availabilityRoutes)
app.use('/api/appointments', appointmentRoutes)
app.use('/api/clients', clientRoutes)
app.use('/api/cash', cashRoutes)
app.use('/api/public/booking', publicBookingRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/assistant', assistantHelpRoutes)
app.use('/api/whatsapp', whatsappRoutes)
app.use('/api', notFoundHandler)

if (serveFrontend) {
  const frontendDist = fileURLToPath(new URL('../../frontend/dist/', import.meta.url))
  const indexFile = join(frontendDist, 'index.html')
  if (!existsSync(indexFile)) {
    throw new Error('SERVE_FRONTEND requiere compilar primero el frontend')
  }

  app.use(express.static(frontendDist, { index: false }))
  app.get('*', (req, res, next) => {
    if (extname(req.path) || req.path.startsWith('/assets/') || !req.accepts('html')) {
      return next()
    }
    res.set('Cache-Control', 'no-cache')
    res.sendFile(indexFile)
  })
}

app.use(notFoundHandler)
app.use(errorHandler)

export default app
