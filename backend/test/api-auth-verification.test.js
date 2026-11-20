/*
  Validación de correo al crear la cuenta (código de 6 dígitos).

  Requiere MongoDB local (mongodb://127.0.0.1:27017) y usa la BD de test
  `elysia_test` (se vacía al inicio de cada ejecución).
  Ejecutar con: npm test

  Este archivo enciende REQUIRE_EMAIL_VERIFICATION él mismo: el resto de las
  pruebas trabajan con la validación apagada (ver test/env.js).
*/
import './env.js' // DEBE ir primero: fija NODE_ENV antes de cargar la app

import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

import app from '../src/app.js'
import { User } from '../src/models/User.js'
import { setTransport } from '../src/config/mailer.js'

let server
let base

async function req(method, path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
  let data = null
  try {
    data = await res.json()
  } catch {
    /* sin cuerpo */
  }
  return { status: res.status, data }
}

/** Cuenta de prueba distinta en cada llamada (el correo es único). */
let contador = 0
function cuenta() {
  contador += 1
  return {
    name: 'Cuenta Nueva',
    email: `nueva${contador}@test.com`,
    password: 'secreto123',
  }
}

async function registrar(body) {
  return req('POST', '/api/auth/register', { body })
}

/** Código distinto al recibido (nunca puede coincidir). */
function codigoErroneo(devCode) {
  return String((Number(devCode) + 1) % 1000000).padStart(6, '0')
}

before(async () => {
  process.env.REQUIRE_EMAIL_VERIFICATION = 'true'
  await mongoose.connect(process.env.MONGODB_URI)
  await mongoose.connection.dropDatabase()
  await new Promise((resolve) => {
    server = app.listen(0, resolve)
  })
  base = `http://127.0.0.1:${server.address().port}`
})

after(async () => {
  process.env.REQUIRE_EMAIL_VERIFICATION = 'false'
  await new Promise((resolve) => server.close(resolve))
  await mongoose.disconnect()
})

describe('Validación de correo (código de 6 dígitos)', () => {
  test('el registro manda código al usuario y aviso al administrador', async () => {
    const originalAdminEmail = process.env.ADMIN_EMAIL
    process.env.ADMIN_EMAIL = 'admin@test.com'
    const sent = []
    setTransport({
      async sendMail(message) {
        sent.push(message)
        return { messageId: 'test' }
      },
    })

    try {
      const account = cuenta()
      const r = await registrar(account)
      assert.equal(r.status, 201, JSON.stringify(r.data))
      assert.equal(sent.length, 3)
      assert.ok(sent.some((mail) => mail.to === account.email && /código/i.test(mail.subject)))
      assert.ok(sent.some((mail) => mail.to === account.email && /cuenta.*creada/i.test(mail.subject)))
      const adminMail = sent.find((mail) => mail.to === 'admin@test.com')
      assert.ok(adminMail)
      assert.ok(adminMail.text.includes(account.email))
    } finally {
      setTransport(null)
      if (originalAdminEmail === undefined) delete process.env.ADMIN_EMAIL
      else process.env.ADMIN_EMAIL = originalAdminEmail
    }
  })

  test('el registro pide código y NO entrega token', async () => {
    const cuenta1 = cuenta()
    const r = await registrar(cuenta1)

    assert.equal(r.status, 201, JSON.stringify(r.data))
    assert.equal(r.data.token, undefined, 'no debe entregar token sin verificar')
    assert.equal(r.data.verification.email, cuenta1.email)
    // Sin SMTP configurado en tests: se avisa y se devuelve el código.
    assert.equal(r.data.verification.sent, false)
    assert.match(r.data.verification.devCode, /^\d{6}$/)
    assert.ok(r.data.verification.expiresInSeconds > 0)

    // En la BD la cuenta queda PENDIENTE (null) y el código, solo hasheado.
    const doc = await User.findOne({ email: cuenta1.email }).select(
      '+emailVerificationCodeHash'
    )
    assert.equal(doc.emailVerifiedAt, null)
    assert.notEqual(
      doc.emailVerificationCodeHash,
      r.data.verification.devCode,
      'el código jamás se guarda en claro'
    )
    // El hash no se filtra en la respuesta pública del usuario.
    assert.equal(r.data.user.emailVerificationCodeHash, undefined)
  })

  test('el login está bloqueado hasta verificar', async () => {
    const cuenta1 = cuenta()
    await registrar(cuenta1)

    const r = await req('POST', '/api/auth/login', {
      body: { email: cuenta1.email, password: cuenta1.password },
    })
    assert.equal(r.status, 403)
    assert.equal(r.data.code, 'EMAIL_NOT_VERIFIED')
    assert.equal(r.data.email, cuenta1.email)
  })

  test('un código incorrecto cuenta intentos y se invalida a la quinta', async () => {
    const cuenta1 = cuenta()
    const creada = await registrar(cuenta1)
    const bueno = creada.data.verification.devCode
    const malo = codigoErroneo(bueno)

    for (let i = 1; i <= 5; i += 1) {
      const r = await req('POST', '/api/auth/verify-email', {
        body: { email: cuenta1.email, code: malo },
      })
      assert.equal(r.status, 400, `intento ${i}`)
      assert.equal(r.data.code, 'CODE_INVALID')
      if (i < 5) {
        assert.ok(r.data.message.includes(`quedan ${5 - i} intentos`), r.data.message)
      } else {
        assert.ok(r.data.message.includes('Demasiados intentos'), r.data.message)
      }
    }

    // Al agotarse se borra el código: ni siquiera el bueno vale ya.
    const r = await req('POST', '/api/auth/verify-email', {
      body: { email: cuenta1.email, code: bueno },
    })
    assert.equal(r.status, 400)
    assert.ok(r.data.message.includes('Pide uno nuevo'))
  })

  test('el reenvío anula el código anterior y entrega uno nuevo', async () => {
    const cuenta1 = cuenta()
    const creada = await registrar(cuenta1)
    const viejo = creada.data.verification.devCode

    const reenvio = await req('POST', '/api/auth/resend-verification', {
      body: { email: cuenta1.email },
    })
    assert.equal(reenvio.status, 200)
    assert.match(reenvio.data.verification.devCode, /^\d{6}$/)
    const nuevo = reenvio.data.verification.devCode

    const conViejo = await req('POST', '/api/auth/verify-email', {
      body: { email: cuenta1.email, code: viejo },
    })
    assert.equal(conViejo.status, 400, 'el código anterior ya no sirve')

    const conNuevo = await req('POST', '/api/auth/verify-email', {
      body: { email: cuenta1.email, code: nuevo },
    })
    assert.equal(conNuevo.status, 200, JSON.stringify(conNuevo.data))
    assert.ok(conNuevo.data.token, 'verificado => token')

    const login = await req('POST', '/api/auth/login', {
      body: { email: cuenta1.email, password: cuenta1.password },
    })
    assert.equal(login.status, 200)
    assert.ok(login.data.token)
  })

  test('el reenvío no revela si el correo existe', async () => {
    const nadie = await req('POST', '/api/auth/resend-verification', {
      body: { email: 'nadie@test.com' },
    })
    assert.equal(nadie.status, 200)
    assert.equal(nadie.data.verification, undefined, 'sin pistas para el que no existe')
    assert.ok(nadie.data.message.includes('Si el correo está registrado'))
  })

  test('un código vencido se rechaza', async () => {
    const cuenta1 = cuenta()
    const creada = await registrar(cuenta1)

    await User.updateOne(
      { email: cuenta1.email },
      { $set: { emailVerificationExpires: new Date(Date.now() - 1000) } }
    )

    const r = await req('POST', '/api/auth/verify-email', {
      body: { email: cuenta1.email, code: creada.data.verification.devCode },
    })
    assert.equal(r.status, 400)
    assert.ok(r.data.message.includes('expiró'), r.data.message)
  })

  test('un correo con formato inválido => 422', async () => {
    const r = await req('POST', '/api/auth/verify-email', {
      body: { email: 'no-es-correo', code: '123456' },
    })
    assert.equal(r.status, 422)
  })

  test('con la validación APAGADA el registro entrega token directo', async () => {
    process.env.REQUIRE_EMAIL_VERIFICATION = 'false'
    try {
      const cuenta1 = cuenta()
      const r = await registrar(cuenta1)
      assert.equal(r.status, 201)
      assert.ok(r.data.token, 'sin validación activa sigue habiendo token')
      assert.equal(r.data.verification, undefined)

      const login = await req('POST', '/api/auth/login', {
        body: { email: cuenta1.email, password: cuenta1.password },
      })
      assert.equal(login.status, 200)
    } finally {
      process.env.REQUIRE_EMAIL_VERIFICATION = 'true'
    }
  })

  test('las cuentas anteriores a la validación siguen entrando', async () => {
    // Cuenta creada como existía ANTES de esta función: sin emailVerifiedAt.
    const passwordHash = await bcrypt.hash('secreto123', 12)
    await User.create({
      name: 'Cuenta Antigua',
      email: 'antigua@test.com',
      passwordHash,
    })

    // Con la validación encendida (como producción con SMTP), esa cuenta
    // NO debe quedarse bloqueada: undefined != null => nada pendiente.
    process.env.REQUIRE_EMAIL_VERIFICATION = 'true'
    const doc = await User.findOne({ email: 'antigua@test.com' })
    assert.equal(doc.emailVerifiedAt, undefined)
    assert.notEqual(doc.emailVerifiedAt, null, 'no debe quedar como pendiente')

    const login = await req('POST', '/api/auth/login', {
      body: { email: 'antigua@test.com', password: 'secreto123' },
    })
    assert.equal(login.status, 200, JSON.stringify(login.data))
    assert.ok(login.data.token)

    process.env.REQUIRE_EMAIL_VERIFICATION = 'false'
  })
})
