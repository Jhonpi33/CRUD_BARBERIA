/*
  Cerebro del agente (Gemini + function calling).

  El bucle es deliberadamente simple y sin dependencias nuevas:
    1. Se manda la conversación + la lista de herramientas.
    2. Si el modelo pide una herramienta, la ejecutamos y le devolvemos el
       resultado (así hasta `maxSteps` veces).
    3. Cuando responde texto, ese texto es la respuesta para la persona.

  `transport` se puede inyectar en los tests para simular las respuestas del
  modelo sin llamar a la API real.
*/
import { getBookingInfo, BookingError } from '../bookingService.js'
import { Schedule } from '../../models/Schedule.js'
import {
  TOOL_DECLARATIONS,
  executeTool,
  todayInTimezone,
  addDays,
  weekdayLabel,
} from './tools.js'

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta'

/** Máximo de idas y vueltas con el modelo por mensaje (evita bucles infinitos). */
const MAX_STEPS = 6

/** Presupuesto total por mensaje: pasado este tiempo se responde con una disculpa. */
const TOTAL_BUDGET_MS = 45000

/** Tiempo máximo de UNA llamada al modelo. */
const CALL_TIMEOUT_MS = 15000

/** Máximo de mensajes de historial que se reenvían (contexto reciente). */
const MAX_HISTORY = 10

const FALLBACK_REPLY =
  'Perdona, no pude completar eso. ¿Me lo escribes de otra forma o prefieres que el barbero te contacte?'

export class AgentError extends Error {
  constructor(status, message, code = null) {
    super(message)
    this.name = 'AgentError'
    this.status = status
    this.code = code
  }
}

/**
 * Llamada HTTP real a Gemini.
 *
 * Reintenta hasta 2 veces ante errores transitorios (429/500/502/503/504):
 * el modelo a veces devuelve "overloaded" en horas pico y un segundo intento
 * suele bastar. Los 4xx de nuestra petición (clave inválida, etc.) no se
 * reintentan: no se arreglan solos.
 */
export async function callGemini(body, { timeoutMs = CALL_TIMEOUT_MS, retries = 1 } = {}) {
  const key = process.env.GEMINI_API_KEY
  if (!key) {
    throw new AgentError(
      503,
      'El asistente todavía no está configurado.',
      'AGENT_NOT_CONFIGURED'
    )
  }

  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash'
  const url = `${API_BASE}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`

  let lastError = null

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      const data = await res.json().catch(() => null)

      if (res.ok) return data

      const detail = data?.error?.message || ''
      console.error('[agente] Gemini respondió', res.status, detail)

      // Cuota agotada: reintentar no sirve (el límite es diario).
      if (res.status === 429) {
        throw new AgentError(
          503,
          'El asistente alcanzó su límite de uso por hoy. Vuelve a intentarlo más tarde.',
          'MODEL_QUOTA'
        )
      }

      // Errores transitorios: vale la pena reintentar.
      if ([500, 502, 503, 504].includes(res.status) && attempt < retries) {
        lastError = new AgentError(
          502,
          'El asistente no está disponible en este momento.',
          'MODEL_ERROR'
        )
        await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)))
        continue
      }

      throw new AgentError(502, 'El asistente no está disponible en este momento.', 'MODEL_ERROR')
    } catch (err) {
      // Los AgentError de la petición no se reintentan aquí (ya se decidió).
      if (err instanceof AgentError) throw err

      console.error('[agente] error llamando a Gemini:', err.message)
      lastError = new AgentError(504, 'El asistente tardó demasiado. Intenta de nuevo.', 'MODEL_TIMEOUT')

      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)))
        continue
      }
      throw lastError
    } finally {
      clearTimeout(timer)
    }
  }

  throw lastError || new AgentError(502, 'El asistente no está disponible en este momento.')
}

/** Instrucciones fijas del agente para un negocio concreto. */
export function buildSystemPrompt({ business, timezone, context, now = new Date() }) {
  const today = todayInTimezone(timezone, now)
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, i)
    return `- ${date} (${weekdayLabel(date)})`
  }).join('\n')

  return `Eres el asistente de reservas de ${business} y atiendes por WhatsApp.

CONTEXTO
- Hoy es ${today} (${weekdayLabel(today)}).
- Zona horaria del negocio: ${timezone}.
- Próximos días (úsalos para entender "mañana", "el viernes", etc.):
${days}
- La persona que escribe${context.name ? ` se llama ${context.name}` : ''} y su teléfono ya está verificado${context.phone ? ` (${context.phone})` : ''}.

CÓMO TRABAJAS
1. Habla en español, cercano y breve: máximo 4 líneas por respuesta. Sin tablas ni markdown.
2. No inventes horarios, precios ni servicios. Para ofrecer horas usa check_availability y para precios list_services.
3. Para agendar necesitas: servicio, fecha, hora y nombre. Si falta el nombre, pídelo.
4. Antes de crear la cita, repite el resumen ("Corte clásico, viernes 30 a las 11:00, a nombre de Camila") y pide confirmación. Solo llama a book_appointment cuando la persona diga que sí.
5. Cuando book_appointment responda ok, confirma con fecha, hora y que la cita queda pendiente de aprobación del barbero. No prometas confirmación automática.
6. Si un horario ya se ocupó, consulta de nuevo y ofrece alternativas cercanas.
7. Si no hay huecos ese día, ofrece el día siguiente (consulta como máximo 3 días antes de rendirte).
8. Si preguntan por sus citas, usa list_my_appointments. Nunca inventes citas.
9. Si piden cancelar o mover una cita, o algo que no puedes hacer, dilo con claridad y ofrece avisar al barbero. No prometas lo que no puedes cumplir.
10. No pidas correo, dirección ni datos que no necesites. Nunca compartas información de otras personas.
11. Si el mensaje no tiene que ver con el negocio, responde amable y vuelve al tema de la cita.`
}

/**
 * Ejecuta un turno de conversación.
 *
 * @param {object} params
 * @param {string} params.message  mensaje de la persona
 * @param {{slug:string, phone?:string, name?:string}} params.context
 * @param {Array<{role:'user'|'model', text:string}>} [params.history]
 * @param {Function} [params.transport] transporte al modelo (inyectable en tests)
 * @param {Date} [params.now]
 * @returns {Promise<{reply:string, toolCalls:Array, booking:object|null}>}
 */
export async function runAgent({
  message,
  context,
  history = [],
  transport = callGemini,
  now = new Date(),
}) {
  const text = typeof message === 'string' ? message.trim() : ''
  if (!text) {
    throw new AgentError(422, 'Escribe un mensaje para el asistente.', 'EMPTY_MESSAGE')
  }

  // El negocio se deduce SIEMPRE del slug del canal, nunca del mensaje.
  const { profile } = await getBookingInfo(context.slug)
  const schedule = await Schedule.findOne({ owner: profile.owner }).select('timezone').lean()
  const timezone = schedule?.timezone || 'America/Bogota'

  const system = buildSystemPrompt({
    business: profile.professionalName || profile.businessName,
    timezone,
    context,
    now,
  })

  const contents = [
    ...history
      .filter((m) => m && typeof m.text === 'string' && (m.role === 'user' || m.role === 'model'))
      .slice(-MAX_HISTORY)
      .map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
    { role: 'user', parts: [{ text }] },
  ]

  const toolCalls = []
  let booking = null
  let lastText = ''
  const deadline = Date.now() + TOTAL_BUDGET_MS

  for (let step = 0; step < MAX_STEPS; step += 1) {
    // Si ya se agotó el presupuesto, no se arranca otra llamada al modelo.
    const remaining = deadline - Date.now()
    if (remaining < 3000) break

    const data = await transport(
      {
        systemInstruction: { parts: [{ text: system }] },
        contents,
        tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 600 },
      },
      { timeoutMs: Math.min(remaining, CALL_TIMEOUT_MS) }
    )

    const parts = data?.candidates?.[0]?.content?.parts || []
    const calls = parts.filter((p) => p.functionCall)

    // Respuesta final en texto.
    if (calls.length === 0) {
      lastText = parts
        .map((p) => p.text)
        .filter(Boolean)
        .join('\n')
        .trim()
      break
    }

    contents.push({ role: 'model', parts })

    const responses = []
    for (const part of calls) {
      const name = part.functionCall.name
      const args = part.functionCall.args || {}
      toolCalls.push({ name, args })

      const result = await executeTool(name, args, context)
      if (name === 'book_appointment' && result?.ok) booking = result
      responses.push({ functionResponse: { name, response: result } })
    }
    contents.push({ role: 'user', parts: responses })
  }

  return {
    reply: lastText || FALLBACK_REPLY,
    toolCalls,
    booking,
  }
}

export { TOOL_DECLARATIONS, BookingError }
