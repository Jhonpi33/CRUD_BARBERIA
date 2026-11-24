import { processWhatsAppOutbox } from './whatsappCloud.js'

export function startWhatsAppWorker() {
  let running = false
  async function processQueue() {
    if (running) return
    running = true
    try {
      await processWhatsAppOutbox()
    } catch (error) {
      console.error('[whatsapp] error procesando cola:', error.code || 'error')
    } finally {
      running = false
    }
  }

  void processQueue()
  return setInterval(processQueue, 15_000)
}
