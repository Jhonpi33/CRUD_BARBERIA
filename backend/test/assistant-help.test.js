import './env.js'
import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import app from '../src/app.js'
import { runHelpAssistant } from '../src/services/assistantHelp.js'

let server
let base

before(async () => {
  server = app.listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  base = `http://127.0.0.1:${server.address().port}`
})

after(async () => {
  await new Promise((resolve) => server.close(resolve))
})

describe('Asistente de ayuda de Elysia', () => {
  test('responde usando la guía del producto y no expone herramientas de reservas', async () => {
    let requestBody
    const result = await runHelpAssistant({
      message: '¿Qué hago después del registro?',
      history: [
        { role: 'user', text: 'Hola' },
        { role: 'model', text: 'Hola, te ayudo.' },
      ],
      transport: async (body) => {
        requestBody = body
        return { candidates: [{ content: { parts: [{ text: 'Verifica tu correo y luego elige Barbero.' }] } }] }
      },
    })

    assert.equal(result.reply, 'Verifica tu correo y luego elige Barbero.')
    assert.equal(requestBody.contents.length, 3)
    assert.equal(requestBody.tools, undefined)
    assert.match(requestBody.systemInstruction.parts[0].text, /No puede crear cuentas/)
  })

  test('acota y filtra el historial enviado al modelo', async () => {
    let requestBody
    const history = Array.from({ length: 12 }, (_, index) => ({
      role: index === 5 ? 'function' : 'user',
      text: 'x'.repeat(1100),
    }))
    await runHelpAssistant({
      message: 'ayuda',
      history,
      transport: async (body) => {
        requestBody = body
        return { candidates: [{ content: { parts: [{ text: 'Claro.' }] } }] }
      },
    })

    assert.equal(requestBody.contents.length, 9)
    assert.ok(requestBody.contents.every((item) => item.parts[0].text.length <= 1000))
    assert.ok(requestBody.contents.every((item) => item.role !== 'function'))
  })

  test('rechaza mensajes vacíos antes de llamar al modelo', async () => {
    let called = false
    await assert.rejects(
      () => runHelpAssistant({ message: '  ', transport: async () => { called = true } }),
      { status: 422, code: 'EMPTY_MESSAGE' }
    )
    assert.equal(called, false)
  })

  test('la API pública valida entradas inválidas', async () => {
    const emptyMessage = await fetch(`${base}/api/assistant/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '   ' }),
    })
    assert.equal(emptyMessage.status, 422)

    const longHistory = await fetch(`${base}/api/assistant/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'ayuda', history: Array(9).fill({ role: 'user', text: 'hola' }) }),
    })
    assert.equal(longHistory.status, 422)
  })
})
