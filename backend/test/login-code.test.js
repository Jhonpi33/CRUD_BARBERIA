import './env.js'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import app from '../src/app.js'
import { User } from '../src/models/User.js'
import { LoginChallenge } from '../src/models/LoginChallenge.js'
import { setTransport } from '../src/config/mailer.js'

test('el login exige contraseña y código de un uso, con intentos y vencimiento', async t => {
  process.env.REQUIRE_LOGIN_CODE = 'true'
  await mongoose.connect(process.env.MONGODB_URI)
  const user = await User.create({
    name: 'Acceso Seguro', email: 'login-code-' + Date.now() + '@example.com',
    passwordHash: await bcrypt.hash('Contraseña123', 12), emailVerifiedAt: new Date(),
  })
  const server = app.listen(0, '127.0.0.1')
  await new Promise(resolve => server.once('listening', resolve))
  t.after(async () => {
    server.close()
    setTransport(null)
    delete process.env.REQUIRE_LOGIN_CODE
    await LoginChallenge.deleteMany({ owner: user._id })
    await User.deleteOne({ _id: user._id })
    await mongoose.disconnect()
  })
  let deliveredCode
  let sends = 0
  setTransport({ sendMail: async mail => {
    sends++
    deliveredCode = mail.text.match(/\b\d{6}\b/)[0]
  } })
  const post = async (path, body) => {
    const response = await fetch('http://127.0.0.1:' + server.address().port + '/api/auth/' + path, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    return { status: response.status, body: await response.json() }
  }
  const begin = () => post('login', { email: user.email, password: 'Contraseña123' })
  const verify = (token, code = deliveredCode) => post('login/verify-code', { challengeToken: token, code })
  assert.equal((await post('login', { email: user.email, password: 'incorrecta' })).status, 401)
  assert.equal(sends, 0)
  const first = await begin()
  assert.equal(first.status, 200)
  assert.equal(first.body.token, undefined)
  assert.equal(first.body.user, undefined)
  const token = first.body.loginChallenge.token
  const stored = await LoginChallenge.findOne({ owner: user._id })
  assert.notEqual(stored.codeHash, deliveredCode)
  assert.notEqual(stored.tokenHash, token)
  const results = await Promise.all([verify(token), verify(token)])
  assert.deepEqual(results.map(r => r.status).sort(), [200, 401])
  assert.ok(results.find(r => r.status === 200).body.token)
  assert.equal((await verify(token)).status, 401)

  const attempts = (await begin()).body.loginChallenge.token
  const goodCode = deliveredCode
  const badCode = goodCode === '000000' ? '111111' : '000000'
  for (let i = 0; i < 5; i++) assert.equal((await verify(attempts, badCode)).status, 401)
  assert.equal((await verify(attempts, goodCode)).status, 401)

  const expired = (await begin()).body.loginChallenge.token
  await LoginChallenge.updateMany({ owner: user._id }, { expiresAt: new Date(0) })
  assert.equal((await verify(expired)).status, 401)

  const changedPassword = (await begin()).body.loginChallenge.token
  await User.updateOne({ _id: user._id }, { passwordHash: await bcrypt.hash('OtraClave123', 12) })
  assert.equal((await verify(changedPassword)).status, 401)

  setTransport({ sendMail: async () => { throw new Error('Correo no disponible') } })
  const failedMail = await post('login', { email: user.email, password: 'OtraClave123' })
  assert.equal(failedMail.status, 503)
  assert.equal(failedMail.body.token, undefined)
})
