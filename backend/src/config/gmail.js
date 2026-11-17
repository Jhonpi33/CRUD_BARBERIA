import nodemailer from 'nodemailer'

const tokenUrl = 'https://oauth2.googleapis.com/token'
const sendUrl = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send'
const mimeTransport = nodemailer.createTransport({ streamTransport: true, buffer: true })
let accessToken
let expiresAt = 0
let refreshInFlight

export function isGmailConfigured(env = process.env) {
  return Boolean(env.GMAIL_USER && env.GMAIL_CLIENT_ID && env.GMAIL_CLIENT_SECRET && env.GMAIL_REFRESH_TOKEN)
}

export async function requestGoogleToken(parameters) {
  const response = await fetch(tokenUrl, {
    method: 'POST',
    body: new URLSearchParams(parameters),
    signal: AbortSignal.timeout(10000),
  })
  if (!response.ok) {
    throw Object.assign(new Error('Google rechazó la solicitud de autorización'), {
      code: `GMAIL_OAUTH_${response.status}`,
    })
  }
  return response.json()
}

async function getAccessToken() {
  if (accessToken && Date.now() < expiresAt) return accessToken

  refreshInFlight ??= requestGoogleToken({
    client_id: process.env.GMAIL_CLIENT_ID,
    client_secret: process.env.GMAIL_CLIENT_SECRET,
    refresh_token: process.env.GMAIL_REFRESH_TOKEN,
    grant_type: 'refresh_token',
  }).then(token => {
    if (!token.access_token) throw new Error('Google no devolvió un token de acceso')
    accessToken = token.access_token
    expiresAt = Date.now() + Math.max(0, Number(token.expires_in) - 60) * 1000
    return accessToken
  }).finally(() => {
    refreshInFlight = undefined
  })
  return refreshInFlight
}

export async function sendGmail(mail) {
  const token = await getAccessToken()
  const { message } = await mimeTransport.sendMail(mail)
  const response = await fetch(sendUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw: message.toString('base64url') }),
    signal: AbortSignal.timeout(10000),
  })
  if (!response.ok) {
    if (response.status === 401 && accessToken === token) expiresAt = 0
    throw Object.assign(new Error('Gmail rechazó el envío'), { code: `GMAIL_SEND_${response.status}` })
  }
  await response.body?.cancel()
}
