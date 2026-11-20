import './env.js'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import app from '../src/app.js'

test('bcrypt rechaza contraseñas que exceden 72 bytes sin truncarlas', async t => {
  const server = app.listen(0, '127.0.0.1')
  await new Promise(resolve => server.once('listening', resolve))
  t.after(() => server.close())
  for (const path of ['register', 'reset-password']) {
    const response = await fetch('http://127.0.0.1:' + server.address().port + '/api/auth/' + path, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Validación', email: 'password@example.com', password: '😀'.repeat(20), token: 'a'.repeat(64),
      }),
    })
    assert.equal(response.status, 422)
    const body = await response.json()
    assert.match(body.message, /contraseña/)
  }
})
