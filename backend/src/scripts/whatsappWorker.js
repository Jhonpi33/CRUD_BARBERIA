import 'dotenv/config'
import { connectDB } from '../config/db.js'
import { isWhatsAppConfigured } from '../services/whatsappCloud.js'
import { startWhatsAppWorker } from '../services/whatsappWorker.js'

if (!isWhatsAppConfigured()) {
  console.error('[whatsapp] Configura un proveedor antes de iniciar el proceso de avisos.')
  process.exit(1)
}

try {
  await connectDB()
  startWhatsAppWorker()
  console.log('[whatsapp] Procesando la cola de avisos.')
} catch {
  console.error('[whatsapp] No se pudo conectar a MongoDB.')
  process.exit(1)
}
