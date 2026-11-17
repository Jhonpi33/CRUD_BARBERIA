import 'dotenv/config'
import app from './app.js'
import { connectDB } from './config/db.js'
import { isMailConfigured } from './config/mailer.js'
import { isWhatsAppConfigured, isWhatsAppPilotReady, processWhatsAppOutbox } from './services/whatsappCloud.js'

// Keep the API away from port 3000, which is commonly used by other local apps.
// Hosted environments still provide their own PORT through the environment.
const PORT = process.env.PORT || 3001

async function main() {
  if (!process.env.JWT_SECRET) {
    console.error('[server] Falta JWT_SECRET en las variables de entorno (revisa backend/.env)')
    process.exit(1)
  }

  if (process.env.NODE_ENV === 'production') {
    if (process.env.REQUIRE_EMAIL_VERIFICATION !== 'true') {
      console.error('[server] En producción REQUIRE_EMAIL_VERIFICATION debe ser true')
      process.exit(1)
    }
    if (!isMailConfigured()) {
      console.error('[server] En producción configura el transporte de correo y sus credenciales')
      process.exit(1)
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(process.env.ADMIN_EMAIL || '')) {
      console.error('[server] En producción configura ADMIN_EMAIL para avisos de registro.')
      process.exit(1)
    }
    const whatsappRequested = [
      process.env.WHATSAPP_ACCESS_TOKEN,
      process.env.WHATSAPP_PHONE_NUMBER_ID,
      process.env.WHATSAPP_GRAPH_API_VERSION,
    ].some(Boolean)
    if (whatsappRequested && !isWhatsAppPilotReady()) {
      console.error('[server] Completa la configuración de WhatsApp Cloud API o deja sus credenciales vacías para usar el envío manual.')
      process.exit(1)
    }
    try {
      const clientUrl = new URL(process.env.CLIENT_URL || '')
      if (clientUrl.protocol !== 'https:' || ['localhost', '127.0.0.1'].includes(clientUrl.hostname)) {
        throw new Error('CLIENT_URL debe ser un dominio público con HTTPS')
      }
    } catch {
      console.error('[server] En producción CLIENT_URL debe ser una URL pública con HTTPS')
      process.exit(1)
    }
  }

  try {
    await connectDB()
  } catch (err) {
    console.error(`[server] No se pudo conectar a MongoDB: ${err.message}`)
    process.exit(1)
  }

  if (isWhatsAppConfigured()) {
    const processQueue = () => {
      processWhatsAppOutbox().catch((err) => {
        console.error('[whatsapp] error procesando cola:', err.code || 'error')
      })
    }
    processQueue()
    setInterval(processQueue, 15_000).unref()
    console.log('[server] Cola de WhatsApp activada.')
  } else {
    console.log('[server] WhatsApp Cloud API sin configurar; avisos automáticos desactivados.')
  }

  const server = app.listen(PORT, () => {
    console.log(`[server] API de Elysia escuchando en http://localhost:${PORT}`)
  })

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[server] El puerto ${PORT} ya está ocupado. Libéralo o configura otro PORT en backend/.env.`)
    } else {
      console.error(`[server] No se pudo iniciar la API (${err.code || 'error de red'}).`)
    }
    process.exit(1)
  })
}

main()
