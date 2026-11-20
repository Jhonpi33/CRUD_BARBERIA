import './env.js'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { OAuth2Client } from 'google-auth-library'
import { User } from '../src/models/User.js'
import app from '../src/app.js'

test('Google verifica el reto y crea una cuenta sin aceptar roles del navegador', async t => {
  const original = process.env.GOOGLE_WEB_CLIENT_ID
  process.env.GOOGLE_WEB_CLIENT_ID = 'web-client-id'
  t.after(() => {
    if (original === undefined) delete process.env.GOOGLE_WEB_CLIENT_ID
    else process.env.GOOGLE_WEB_CLIENT_ID = original
  })
  const server = app.listen(0, '127.0.0.1')
  await new Promise(resolve => server.once('listening', resolve))
  t.after(() => server.close())
  const base = 'http://127.0.0.1:' + server.address().port
  const config = await fetch(base + '/api/auth/google/config')
  const { nonce } = await config.json()
  const cookie = config.headers.get('set-cookie').split(';')[0]
  let invalidNonce = false
  t.mock.method(OAuth2Client.prototype, 'verifyIdToken', async options => {
    assert.equal(options.audience, 'web-client-id')
    return { getPayload: () => ({
      sub: 'google-user', email: 'verified@gmail.com', email_verified: true,
      nonce: invalidNonce ? 'wrong-nonce' : nonce, name: 'Barbero Google',
    }) }
  })
  t.mock.method(User, 'findOne', () => ({ select: async () => null }))
  let creates = 0
  t.mock.method(User, 'create', async data => {
    creates++
    const user = new User(data)
    await user.validate()
    return user
  })
  const send = (headers = {}) => fetch(base + '/api/auth/google', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: process.env.CLIENT_URL || 'http://localhost:5173', Cookie: cookie, ...headers,
    },
    body: JSON.stringify({ credential: 'google-id-token-for-verification', role: 'admin' }),
  })
  const response = await send()
  assert.equal(response.status, 200)
  const body = await response.json()
  assert.ok(body.token)
  assert.equal(body.user.role, null)
  assert.equal(body.user.googleSubject, undefined)
  assert.equal(body.user.passwordHash, undefined)
  assert.ok(body.user.emailVerifiedAt)
  assert.equal(creates, 1)

  assert.equal((await send({ Origin: 'https://other.example' })).status, 403)
  assert.equal((await send({ Cookie: '' })).status, 401)
  invalidNonce = true
  assert.equal((await send()).status, 401)
  assert.equal(creates, 1)
})
