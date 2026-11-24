import { WhatsAppConnection } from '../models/WhatsAppConnection.js'
import { Profile } from '../models/Profile.js'
import { normalizePhone } from '../models/Client.js'

const UUID = /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i
const SESSION_STATES = new Set(['created', 'initializing', 'qr_ready', 'authenticating', 'ready', 'disconnected', 'action_required', 'failed'])
const STARTABLE = new Set(['created', 'disconnected', 'failed'])
const empty = () => ({ status: 'unlinked' })

export class WhatsAppLinkError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

export function whatsappNumber(value) {
  const digits = normalizePhone(value)
  if (digits.length === 10 && !String(value).trim().startsWith('+')) return `57${digits}`
  return /^[1-9]\d{6,14}$/.test(digits) && (String(value).trim().startsWith('+') || digits.length >= 11) ? digits : ''
}

function gatewayOrigin(env) {
  try {
    const url = new URL(env.OPENWA_URL)
    const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    if (url.username || url.password || url.search || url.hash || url.pathname !== '/') return null
    if (url.protocol === 'https:' || (url.protocol === 'http:' && loopback)) return url.origin
  } catch {
    return null
  }
  return null
}

export function isOpenWAConfigured(env = process.env) {
  return env.WHATSAPP_PROVIDER === 'openwa' && Boolean(env.OPENWA_API_KEY?.trim() && gatewayOrigin(env))
}

async function gateway(path, { method = 'GET', body, idempotencyKey, timeout = 5000 } = {}) {
  const response = await fetch(`${gatewayOrigin(process.env)}/api${path}`, {
    method,
    headers: {
      'X-API-Key': process.env.OPENWA_API_KEY,
      ...(body && { 'Content-Type': 'application/json' }),
      ...(idempotencyKey && { 'Idempotency-Key': idempotencyKey }),
    },
    body: body && JSON.stringify(body),
    redirect: 'error',
    signal: AbortSignal.timeout(timeout),
  })
  if (response.status === 204) return null
  const result = await response.json().catch(() => null)
  if (response.ok && result) return result
  const error = new Error('OpenWA no completó la operación')
  error.httpStatus = response.status
  error.code = ['IDEMPOTENCY_OUTCOME_UNKNOWN', 'IDEMPOTENCY_KEY_REUSED'].includes(result?.code)
    ? result.code : `OPENWA_HTTP_${response.status}`
  throw error
}

async function remoteSession(id) {
  try {
    const session = await gateway(`/sessions/${id}`)
    if (session.id !== id || !SESSION_STATES.has(session.status)) throw new Error('Estado de sesión inválido')
    return session
  } catch (error) {
    if (error.httpStatus === 404) return null
    throw error
  }
}

async function findRemoteByName(name) {
  const sessions = await gateway(`/sessions?name=${encodeURIComponent(name)}`)
  return sessions.find((session) => session.name === name)
}

async function createRemote(name) {
  try {
    return await gateway('/sessions', { method: 'POST', body: { name } })
  } catch (error) {
    if (error.httpStatus !== 409) throw error
    const existing = await findRemoteByName(name)
    if (!existing) throw error
    return existing
  }
}

export async function findLinkedWhatsApp(owner) {
  if (!isOpenWAConfigured()) return null
  return WhatsAppConnection.findOne({ owner, linkedPhone: { $type: 'string' }, disconnecting: false })
    .select('sessionId linkedPhone').lean()
}

async function describeConnection(connection, remote, includeQr) {
  const identity = { _id: connection._id, sessionId: connection.sessionId, disconnecting: false }
  if (!remote) {
    await WhatsAppConnection.updateOne(identity, { $set: { linkedPhone: null } })
    return empty()
  }
  if (remote.status === 'ready') {
    if (!/^[1-9]\d{6,14}$/.test(remote.phone || '')) return { status: 'initializing' }
    try {
      const updated = await WhatsAppConnection.updateOne(identity, { $set: { linkedPhone: remote.phone } })
      return updated.matchedCount ? { status: 'ready', phone: remote.phone } : empty()
    } catch (error) {
      if (error.code === 11000) {
        await WhatsAppConnection.updateOne(identity, { $set: { linkedPhone: null } })
        return { status: 'number_in_use' }
      }
      throw error
    }
  }
  if (remote.status === 'qr_ready' && includeQr) {
    await WhatsAppConnection.updateOne(identity, { $set: { linkedPhone: null } })
    try {
      const { qrCode } = await gateway(`/sessions/${connection.sessionId}/qr`)
      const active = await WhatsAppConnection.exists(identity)
      if (active && typeof qrCode === 'string' && qrCode.length <= 200_000 && /^data:image\/png;base64,[a-z0-9+/=]+$/i.test(qrCode)) {
        return { status: 'qr_ready', qrCode }
      }
    } catch (error) {
      if (![400, 404].includes(error.httpStatus)) throw error
    }
  }
  return { status: remote.status }
}

export async function readWhatsAppConnection(owner, { includeQr = true } = {}) {
  const connection = await WhatsAppConnection.findOne({ owner }).lean()
  if (connection?.disconnecting) return { status: 'disconnecting' }
  if (!connection?.sessionId) return empty()
  return describeConnection(connection, await remoteSession(connection.sessionId), includeQr)
}

export async function startWhatsAppConnection(owner) {
  await WhatsAppConnection.init()
  await WhatsAppConnection.updateOne({ owner }, { $setOnInsert: { owner } }, { upsert: true })
  const now = new Date()
  const provisioningUntil = new Date(now.getTime() + 60_000)
  const connection = await WhatsAppConnection.findOneAndUpdate({
    owner,
    disconnecting: false,
    $or: [{ provisioningUntil: null }, { provisioningUntil: { $lte: now } }],
  }, { $set: { provisioningUntil } }, { new: true }).lean()
  if (!connection) return readWhatsAppConnection(owner, { includeQr: false })

  try {
    return await provisionRemoteConnection(connection)
  } finally {
    await WhatsAppConnection.updateOne({ _id: connection._id, provisioningUntil }, { $set: { provisioningUntil: null } })
  }
}

async function provisionRemoteConnection(connection) {
  let remote = connection.sessionId ? await remoteSession(connection.sessionId) : null
  if (!remote) {
    const name = `elysia-${connection._id}`
    remote = await createRemote(name)
    if (!UUID.test(remote.id) || remote.name !== name) throw new Error('Sesión de OpenWA inválida')
    const saved = await WhatsAppConnection.updateOne(
      { _id: connection._id, sessionId: connection.sessionId, disconnecting: false },
      { $set: { sessionId: remote.id, linkedPhone: null } }
    )
    if (!saved.matchedCount) return readWhatsAppConnection(connection.owner)
    connection.sessionId = remote.id
  }
  if (STARTABLE.has(remote.status)) {
    try {
      remote = await gateway(`/sessions/${connection.sessionId}/start`, { method: 'POST' })
    } catch (error) {
      if (![409, 504].includes(error.httpStatus) && error.name !== 'TimeoutError') throw error
      return { status: 'initializing' }
    }
  }
  return describeConnection(connection, remote, false)
}

export async function getWhatsAppPairingCode(owner) {
  const connection = await WhatsAppConnection.findOne({ owner, disconnecting: false }).lean()
  const profile = await Profile.findOne({ owner }).select('phone').lean()
  const phoneNumber = whatsappNumber(profile?.phone)
  if (!phoneNumber) throw new WhatsAppLinkError(422, 'Guarda un número de WhatsApp con indicativo en tu perfil.')
  const remote = connection?.sessionId && await remoteSession(connection.sessionId)
  if (remote?.status !== 'qr_ready') throw new WhatsAppLinkError(409, 'Espera a que aparezca el QR para pedir el código.')
  try {
    const { pairingCode } = await gateway(`/sessions/${connection.sessionId}/pairing-code`, { method: 'POST', body: { phoneNumber } })
    if (!/^[A-Z0-9]{8}$/i.test(pairingCode || '')) throw new Error('Código de vinculación inválido')
    if (!await WhatsAppConnection.exists({ _id: connection._id, sessionId: connection.sessionId, disconnecting: false })) {
      throw new WhatsAppLinkError(409, 'La conexión cambió. Vuelve a vincular tu WhatsApp.')
    }
    return { pairingCode }
  } catch (error) {
    if (error.httpStatus === 409) throw new WhatsAppLinkError(409, 'WhatsApp todavía no puede generar el código. Espera unos segundos o usa el QR.')
    throw error
  }
}

export async function disconnectWhatsApp(owner) {
  const connection = await WhatsAppConnection.findOneAndUpdate({
    owner,
    $or: [{ provisioningUntil: null }, { provisioningUntil: { $lte: new Date() } }],
  }, { $set: { disconnecting: true, linkedPhone: null } }, { new: true }).lean()
  if (!connection) {
    if (await WhatsAppConnection.exists({ owner })) throw new WhatsAppLinkError(409, 'WhatsApp está iniciando. Espera unos segundos e intenta desvincularlo de nuevo.')
    return empty()
  }
  const remote = connection.sessionId ? null : await findRemoteByName(`elysia-${connection._id}`)
  const id = connection.sessionId || remote?.id
  if (id) {
    if (!UUID.test(id)) throw new Error('Sesión de OpenWA inválida')
    try {
      await gateway(`/sessions/${id}`, { method: 'DELETE' })
    } catch (error) {
      if (error.httpStatus !== 404) throw error
    }
  }
  await WhatsAppConnection.deleteOne({ _id: connection._id, disconnecting: true })
  return empty()
}

const introByEvent = {
  'booking:barber': (client) => `Nueva solicitud de reserva de ${client}. Confirma el turno desde tu agenda de Elysia.`,
  'booking:client': (client) => `Hola, ${client}. Recibimos tu solicitud de reserva. Te avisaremos cuando la confirmen.`,
  'status:confirmed': (client) => `Hola, ${client}. Tu cita está confirmada.`,
  'status:cancelled': (client) => `Hola, ${client}. Tu cita fue cancelada.`,
  'reminder:3h': (client) => `Hola, ${client}. Te recordamos que tu cita está próxima.`,
}

export async function sendOpenWANotice(job, owner) {
  const connection = await findLinkedWhatsApp(owner)
  const remote = connection && connection.sessionId === job.openwaSessionId && connection.linkedPhone === job.openwaPhone
    ? await remoteSession(connection.sessionId) : null
  if (!remote || (remote.status === 'ready' && remote.phone !== job.openwaPhone)) {
    throw Object.assign(new Error('La conexión de WhatsApp cambió'), { code: 'OPENWA_CONNECTION_CHANGED', permanent: true })
  }
  if (remote.status !== 'ready') throw Object.assign(new Error('WhatsApp está desconectado'), { code: 'OPENWA_DISCONNECTED' })

  const [client, business, service, day, from, to, location] = job.parameters
  const date = new Intl.DateTimeFormat('es-CO', { dateStyle: 'full', timeZone: 'UTC' }).format(new Date(`${day}T00:00:00Z`))
  const lines = [introByEvent[job.templateName](client), '', business, `Servicio: ${service}`, `Fecha: ${date}`, `Hora: ${from} a ${to}`]
  if (location) {
    lines.push(`Ubicación: ${location}`, `Mapa: https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`)
  }
  const response = await gateway(`/sessions/${connection.sessionId}/messages/send-text`, {
    method: 'POST',
    body: { chatId: `${job.recipientPhone}@c.us`, text: lines.join('\n'), linkPreview: false },
    idempotencyKey: `elysia-${job._id}`,
    timeout: 12000,
  })
  if (!response.messageId) throw new Error('OpenWA no devolvió un identificador de mensaje')
}
