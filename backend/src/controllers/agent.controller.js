/*
  Controlador del agente de IA (modo prueba y, más adelante, webhook de
  WhatsApp).

  Por ahora expone un chat sin estado: el cliente manda el mensaje y el
  historial reciente. Cuando llegue el canal de WhatsApp, este mismo
  `runAgent` se llamará desde el webhook con el teléfono del remitente.
*/
import { runAgent, AgentError } from '../services/agent/gemini.js'
import { BookingError } from '../services/bookingService.js'

/** GET /api/agent/status — ¿está configurado el cerebro? */
export function agentStatus(_req, res) {
  res.json({
    configured: Boolean(process.env.GEMINI_API_KEY),
    model: process.env.GEMINI_MODEL || null,
  })
}

/**
 * POST /api/agent/chat
 * Body: { slug, message, phone?, name?, history? }
 * `slug` fija el negocio: el modelo no puede cambiar de agenda.
 */
export async function chat(req, res, next) {
  try {
    const { slug, message, phone = '', name = '', history = [] } = req.body

    const result = await runAgent({
      message,
      context: { slug, phone, name },
      history: Array.isArray(history) ? history : [],
    })

    res.json(result)
  } catch (err) {
    if (err instanceof AgentError) {
      return res.status(err.status).json({ message: err.message, code: err.code })
    }
    if (err instanceof BookingError) {
      return res.status(err.status).json({ message: err.message, code: err.code })
    }
    next(err)
  }
}
