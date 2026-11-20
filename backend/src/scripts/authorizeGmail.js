import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import path from 'node:path'
import dotenv from 'dotenv'
import { requestGoogleToken } from '../config/gmail.js'

const envPath = path.resolve('.env')
const credentialsPath = process.argv[2]
const scope = 'https://www.googleapis.com/auth/gmail.send'

async function authorize(client, email) {
  const verifier = randomBytes(32).toString('base64url')
  const challenge = createHash('sha256').update(verifier).digest('base64url')
  const state = randomBytes(32).toString('hex')

  return new Promise((resolve, reject) => {
    const server = createServer(async (req, res) => {
      const url = new URL(req.url, 'http://127.0.0.1')
      if (req.method === 'GET' && url.pathname === '/oauth/start' && authorization) {
        res.writeHead(302, { Location: authorization.href, 'Cache-Control': 'no-store' }).end()
        return
      }
      const receivedState = Buffer.from(url.searchParams.get('state') || '')
      if (url.pathname !== '/oauth/callback' || receivedState.length !== state.length ||
          !timingSafeEqual(receivedState, Buffer.from(state))) {
        res.writeHead(404).end()
        return
      }
      if (handled) {
        res.writeHead(409).end()
        return
      }
      handled = true
      try {
        const code = url.searchParams.get('code')
        if (!code) throw new Error('Google no concedió el permiso')
        const token = await requestGoogleToken({
          client_id: client.client_id,
          client_secret: client.client_secret,
          grant_type: 'authorization_code',
          code,
          code_verifier: verifier,
          redirect_uri: redirectUri,
        })
        if (!token.refresh_token || !token.scope?.split(' ').includes(scope)) {
          throw new Error('No se recibió el permiso persistente para enviar correo')
        }
        res.writeHead(200, {'Content-Type': 'text/plain; charset=utf-8'}).end('Gmail autorizó a Elysia. Puedes cerrar esta pestaña.')
        finish(null, token.refresh_token)
      } catch (error) {
        res.writeHead(400, {'Content-Type': 'text/plain; charset=utf-8'}).end('La autorización no se completó.')
        finish(error)
      }
    })
    let handled = false
    let redirectUri
    let authorization
    const timer = setTimeout(() => finish(new Error('Se agotó el tiempo para autorizar Gmail')), 60 * 60 * 1000)
    function finish(error, token) {
      clearTimeout(timer)
      server.close()
      if (error) reject(error)
      else resolve(token)
    }
    server.once('error', finish)
    server.listen(0, '127.0.0.1', () => {
      redirectUri = `http://127.0.0.1:${server.address().port}/oauth/callback`
      authorization = new URL('https://accounts.google.com/o/oauth2/v2/auth')
      authorization.search = new URLSearchParams({
        client_id: client.client_id,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope,
        access_type: 'offline',
        prompt: 'consent',
        login_hint: email,
        code_challenge: challenge,
        code_challenge_method: 'S256',
        state,
      })
      if (process.argv.includes('--manual')) {
        console.log(new URL('/oauth/start', redirectUri).href)
        return
      }
      const browser = spawn('open', [authorization.href], { stdio: 'ignore' })
      browser.once('error', finish)
      browser.once('exit', code => {
        if (code !== 0) finish(new Error('No se pudo abrir el navegador'))
      })
      console.log('Autoriza el permiso de envío en la ventana de Google.')
    })
  })
}

async function main() {
  if (!credentialsPath) throw new Error('Indica la ruta del JSON del cliente OAuth de escritorio')
  const { installed: client } = JSON.parse(await readFile(credentialsPath, 'utf8'))
  if (!client?.client_id || !client.client_secret) {
    throw new Error('El JSON debe pertenecer a un cliente OAuth de escritorio')
  }
  const source = await readFile(envPath, 'utf8')
  const env = dotenv.parse(source)
  const email = env.GMAIL_USER || env.SMTP_USER
  if (!email) throw new Error('Configura GMAIL_USER con el correo que vas a autorizar')

  const refreshToken = await authorize(client, email)
  const settings = {
    MAIL_TRANSPORT: 'gmail-api',
    GMAIL_USER: email,
    GMAIL_CLIENT_ID: client.client_id,
    GMAIL_CLIENT_SECRET: client.client_secret,
    GMAIL_REFRESH_TOKEN: refreshToken,
  }
  if (Object.values(settings).some(value => /[\r\n'"#]/.test(value))) {
    throw new Error('Las credenciales tienen un formato inesperado')
  }
  const keys = new RegExp(`^\\s*(?:export\\s+)?(?:${Object.keys(settings).join('|')})\\s*=`)
  // Recarga para conservar cambios realizados durante la autorización.
  const current = await readFile(envPath, 'utf8')
  const preserved = current.split(/\r?\n/).filter(line => !keys.test(line)).join('\n').trimEnd()
  const updated = Object.entries(settings).map(([key, value]) => `${key}=${value}`).join('\n')
  await writeFile(envPath, `${preserved}\n\n${updated}\n`)
  console.log('Autorización guardada en backend/.env. Reinicia la API de Elysia.')
}

main().catch(error => {
  console.error('No se pudo autorizar Gmail:', error.message)
  process.exitCode = 1
})
