import express from 'express'
import helmet from 'helmet'
import cors from 'cors'

import authRoutes from './routes/auth.routes.js'
import adminRoutes from './routes/admin.routes.js'
import profileRoutes from './routes/profile.routes.js'
import serviceRoutes from './routes/service.routes.js'
import scheduleRoutes from './routes/schedule.routes.js'
import availabilityRoutes from './routes/availability.routes.js'
import appointmentRoutes from './routes/appointment.routes.js'
import clientRoutes from './routes/client.routes.js'
import publicBookingRoutes from './routes/publicBooking.routes.js'
import notificationRoutes from './routes/notification.routes.js'
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js'

const app = express()

app.set('trust proxy', 1)

app.use(helmet())
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
)
app.use(express.json({ limit: '100kb' }))

/** Health check para verificar que la API responde. */
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'elysia-api' })
})

app.use('/api/auth', authRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/profile', profileRoutes)
app.use('/api/services', serviceRoutes)
app.use('/api/schedule', scheduleRoutes)
app.use('/api/availability', availabilityRoutes)
app.use('/api/appointments', appointmentRoutes)
app.use('/api/clients', clientRoutes)
app.use('/api/public/booking', publicBookingRoutes)
app.use('/api/notifications', notificationRoutes)

app.use(notFoundHandler)
app.use(errorHandler)

export default app
