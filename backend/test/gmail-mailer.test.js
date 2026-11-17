import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isMailConfigured, sendMail } from '../src/config/mailer.js'

test('Gmail API envía mensajes MIME por HTTPS y comparte la renovación del token', async t => {
  const settings = {
    MAIL_TRANSPORT: 'gmail-api',
    GMAIL_USER: 'sender@example.com',
    GMAIL_CLIENT_ID: 'client-id',
    GMAIL_CLIENT_SECRET: 'client-secret',
    GMAIL_REFRESH_TOKEN: 'refresh-token',
  }
  const previous = Object.fromEntries(Object.keys(settings).map(key => [key, process.env[key]]))
  Object.assign(process.env, settings)
  t.after(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  })

  let refreshes = 0
  const messages = []
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    if (url === 'https://oauth2.googleapis.com/token') {
      refreshes++
      assert.equal(init.body.get('grant_type'), 'refresh_token')
      assert.equal(init.body.get('refresh_token'), 'refresh-token')
      return Response.json({ access_token: 'access-token', expires_in: 3600 })
    }
    assert.equal(url, 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send')
    assert.equal(init.headers.Authorization, 'Bearer access-token')
    const { raw } = JSON.parse(init.body)
    messages.push(Buffer.from(raw, 'base64url').toString('utf8'))
    return Response.json({ id: 'message-id' })
  })

  assert.equal(isMailConfigured(), true)
  const results = await Promise.all(['code@example.com', 'admin@example.com'].map(to =>
    sendMail({ to, subject: 'Cuenta Elysia', text: 'Código de acceso' })
  ))
  assert.deepEqual(results, [{ sent: true }, { sent: true }])
  assert.equal(refreshes, 1)
  assert.equal(messages.length, 2)
  assert.ok(messages.some(message => /^To: code@example\.com\r?$/m.test(message)))
  assert.ok(messages.some(message => /^To: admin@example\.com\r?$/m.test(message)))
  assert.ok(messages.every(message => /^From: sender@example\.com\r?$/m.test(message)))
})
