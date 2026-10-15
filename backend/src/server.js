import 'dotenv/config'
import app from './app.js'
import { connectDB } from './config/db.js'

const PORT = process.env.PORT || 3000

async function main() {
  if (!process.env.JWT_SECRET) {
    console.error('[server] Falta JWT_SECRET en las variables de entorno (revisa backend/.env)')
    process.exit(1)
  }

  try {
    await connectDB()
  } catch (err) {
    console.error(`[server] No se pudo conectar a MongoDB: ${err.message}`)
    process.exit(1)
  }

  app.listen(PORT, () => {
    console.log(`[server] API de Elysia escuchando en http://localhost:${PORT}`)
  })
}

main()
