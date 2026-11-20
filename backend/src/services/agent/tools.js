/*
  Herramientas del agente de IA.

  Cada herramienta es una función que Gemini puede pedir ejecutar. Todas
  trabajan con el `context` de la conversación:
    { slug, phone, name }
  El `slug` NUNCA viene del modelo: lo fija el canal (el enlace de WhatsApp o
  el modo prueba). Así el bot no puede agendar en la agenda de otro barbero
  aunque se lo pidan en el texto.

  Reutilizan `bookingService`, la misma lógica de la reserva pública: mismos
  horarios, mismo margen de cambio de turno y misma protección de concurrencia.
*/
import { Appointment } from '../../models/Appointment.js'
import { Client, normalizePhone } from '../../models/Client.js'
import { Schedule } from '../../models/Schedule.js'
import {
  getBookingInfo,
  getAvailability,
  createBooking,
  BookingError,
} from '../bookingService.js'

/** Máximo de huecos que se le devuelven al modelo (ahorra tokens y evita ruido). */
const MAX_SLOTS = 15

/** Máximo de citas que se listan al cliente. */
const MAX_APPOINTMENTS = 10

/**
 * Declaraciones en el formato de Gemini (`functionDeclarations`).
 * Los nombres van en inglés (código); las descripciones en español, porque
 * son las que lee el modelo para decidir cuándo usarlas.
 */
export const TOOL_DECLARATIONS = [
  {
    name: 'list_services',
    description:
      'Lista los servicios que ofrece el negocio, con su identificador, precio y duración. ' +
      'Úsala antes de hablar de precios o de agendar si aún no conoces el servicio.',
    parameters: { type: 'OBJECT', properties: {}, required: [] },
  },
  {
    name: 'check_availability',
    description:
      'Devuelve las horas libres reales para un servicio en una fecha concreta (YYYY-MM-DD). ' +
      'Nunca inventes horarios: si no consultaste, no puedes ofrecerlos.',
    parameters: {
      type: 'OBJECT',
      properties: {
        serviceId: {
          type: 'STRING',
          description: 'Identificador del servicio obtenido con list_services.',
        },
        date: {
          type: 'STRING',
          description: 'Fecha en formato YYYY-MM-DD (calendario del negocio).',
        },
      },
      required: ['serviceId', 'date'],
    },
  },
  {
    name: 'book_appointment',
    description:
      'Crea la cita. Solo después de que la persona aceptó explícitamente una fecha y hora ' +
      'de las que devolvió check_availability, y con su nombre.',
    parameters: {
      type: 'OBJECT',
      properties: {
        serviceId: { type: 'STRING', description: 'Servicio elegido.' },
        date: { type: 'STRING', description: 'Fecha en formato YYYY-MM-DD.' },
        start: { type: 'STRING', description: 'Hora de inicio en formato HH:MM (24 h).' },
        name: {
          type: 'STRING',
          description: 'Nombre de la persona. Si ya lo sabes por la conversación, omítelo.',
        },
      },
      required: ['serviceId', 'date', 'start'],
    },
  },
  {
    name: 'list_my_appointments',
    description:
      'Lista las próximas citas de esta persona en este negocio, buscadas por su teléfono. ' +
      'Úsala si pregunta "¿cuándo es mi cita?" o quiere confirmar lo que ya reservó.',
    parameters: { type: 'OBJECT', properties: {}, required: [] },
  },
]

/** Fecha de calendario 'YYYY-MM-DD' en una zona IANA (hoy). */
function todayInTimezone(timezone, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
  return parts // en-CA ya formatea como YYYY-MM-DD
}

/** Día de la semana en español para una fecha 'YYYY-MM-DD'. */
export function weekdayLabel(date) {
  const [y, m, d] = date.split('-').map(Number)
  return new Intl.DateTimeFormat('es-CO', { weekday: 'long', timeZone: 'UTC' }).format(
    new Date(Date.UTC(y, m - 1, d))
  )
}

/** Suma días a una fecha 'YYYY-MM-DD' sin cruzar zonas horarias. */
function addDays(date, days) {
  const [y, m, d] = date.split('-').map(Number)
  const base = new Date(Date.UTC(y, m - 1, d + days))
  return base.toISOString().slice(0, 10)
}

/** Últimos 10 dígitos: tolera indicativos distintos ("+57 300..." vs "300..."). */
function phoneSuffix(digits) {
  return digits.length > 10 ? digits.slice(-10) : digits
}

/**
 * Ejecuta una herramienta. Nunca lanza: los errores de negocio vuelven como
 * `{ error }` para que el modelo los explique en lenguaje natural.
 *
 * @param {string} name
 * @param {object} args
 * @param {{slug:string, phone?:string, name?:string}} context
 */
export async function executeTool(name, args = {}, context = {}) {
  try {
    switch (name) {
      case 'list_services':
        return await listServices(context)
      case 'check_availability':
        return await checkAvailability(args, context)
      case 'book_appointment':
        return await bookAppointment(args, context)
      case 'list_my_appointments':
        return await listMyAppointments(context)
      default:
        return { error: `Herramienta desconocida: ${name}` }
    }
  } catch (err) {
    if (err instanceof BookingError) {
      return { error: err.message, code: err.code || 'BOOKING_ERROR' }
    }
    console.error(`[agente] fallo en la herramienta ${name}:`, err)
    return { error: 'No pude completar esa acción. Intenta de nuevo.' }
  }
}

async function listServices({ slug }) {
  const { profile, services } = await getBookingInfo(slug)
  return {
    business: profile.professionalName || profile.businessName,
    location: profile.location || null,
    currency: 'COP',
    services: services.map((s) => ({
      id: String(s._id),
      name: s.name,
      price: s.price,
      durationMinutes: s.durationMinutes,
    })),
  }
}

async function checkAvailability({ serviceId, date }, { slug }) {
  const { service, payload } = await getAvailability({ slug, serviceId, date })
  return {
    service: { id: String(service._id), name: service.name, durationMinutes: service.durationMinutes },
    date: payload.date,
    weekday: weekdayLabel(payload.date),
    timezone: payload.timezone,
    totalFreeSlots: payload.slots.length,
    slots: payload.slots.slice(0, MAX_SLOTS).map((s) => s.start),
    ...(payload.slots.length > MAX_SLOTS
      ? { note: `Se muestran ${MAX_SLOTS} de ${payload.slots.length} huecos libres.` }
      : {}),
  }
}

async function bookAppointment({ serviceId, date, start, name }, context) {
  const phone = normalizePhone(context.phone)
  if (!phone) {
    return {
      error: 'No tengo un teléfono verificado para esta conversación. Pide a la persona que reserve desde el perfil.',
      code: 'NO_PHONE',
    }
  }

  const finalName = String(name || context.name || '').trim()
  if (finalName.length < 2) {
    return { error: 'Necesito el nombre de la persona antes de agendar.', code: 'MISSING_NAME' }
  }

  const { appointment, service } = await createBooking({
    slug: context.slug,
    serviceId,
    date,
    start,
    name: finalName,
    phone: context.phone,
    source: 'agent',
  })

  return {
    ok: true,
    appointmentId: String(appointment._id),
    date: appointment.date,
    weekday: weekdayLabel(appointment.date),
    start: appointment.localStart,
    end: appointment.localEnd,
    timezone: appointment.timezone,
    status: appointment.status,
    service: service.name,
    price: service.price,
    clientName: appointment.clientSnapshot.name,
    note: 'La cita queda PENDIENTE hasta que el barbero la confirme.',
  }
}

async function listMyAppointments({ slug, phone }) {
  const digits = normalizePhone(phone)
  if (!digits) {
    return { error: 'No tengo un teléfono para buscar citas.', code: 'NO_PHONE' }
  }

  const { profile } = await getBookingInfo(slug)
  const clients = await Client.find({
    owner: profile.owner,
    phoneNormalized: new RegExp(`${phoneSuffix(digits)}$`),
  })
    .select('_id')
    .lean()

  if (clients.length === 0) return { appointments: [] }

  const today = todayInTimezone(
    (await Schedule.findOne({ owner: profile.owner }).select('timezone').lean())?.timezone ||
      'America/Bogota'
  )
  const appointments = await Appointment.find({
    owner: profile.owner,
    client: { $in: clients.map((c) => c._id) },
    date: { $gte: today },
    status: { $in: ['pending', 'confirmed'] },
  })
    .sort({ date: 1, startMinutes: 1 })
    .limit(MAX_APPOINTMENTS)
    .lean()

  return {
    business: profile.professionalName || profile.businessName,
    appointments: appointments.map((a) => ({
      id: String(a._id),
      date: a.date,
      weekday: weekdayLabel(a.date),
      start: a.localStart,
      end: a.localEnd,
      status: a.status,
      service: a.serviceSnapshot?.name || '',
    })),
  }
}

export { todayInTimezone, addDays }
