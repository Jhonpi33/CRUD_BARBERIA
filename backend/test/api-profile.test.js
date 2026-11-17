/*
  Perfil: foto y logo son opcionales de verdad.

  Regresión: el frontend SIEMPRE manda photoUrl/logoUrl en el payload, aunque
  el usuario no haya subido nada (va como ""). `optional()` solo salta campos
  ausentes, así que ese "" llegaba a `isURL()` y devolvía 422:
  "La foto debe ser un enlace válido (http/https)".
  Resultado real: ningún barbero ni barbero de barbería podía terminar el
  onboarding si dejaba la imagen vacía.

  Ejecutar con: npm test
*/
import './env.js' // DEBE ir primero: fija NODE_ENV antes de cargar la app

import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'

import app from '../src/app.js'

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

/** Cuenta nueva con rol asignado y su token (validación de correo apagada en test). */
async function createAccount(role) {
  const email = `perfil${Date.now()}${Math.random().toString(36).slice(2, 8)}@test.com`
  const r = await req('POST', '/api/auth/register', {
    body: { name: 'Perfil Test', email, password: 'secreto123' },
  })
  assert.equal(r.status, 201, JSON.stringify(r.data))
  const token = r.data.token
  const rr = await req('PATCH', '/api/auth/role', { token, body: { role } })
  assert.equal(rr.status, 200, JSON.stringify(rr.data))
  return token
}

const common = { phone: '+57 300 111 2233', location: 'Bogotá, Colombia' }

before(async () => {
  await mongoose.connect(process.env.MONGODB_URI)
  await mongoose.connection.dropDatabase()
  await new Promise((resolve) => {
    server = app.listen(0, resolve)
  })
  base = `http://127.0.0.1:${server.address().port}`
})

after(async () => {
  await new Promise((resolve) => server.close(resolve))
  await mongoose.disconnect()
})

describe('PUT /api/profile/me — imagen opcional', () => {
  test('acepta photoUrl vacío (barbero sin foto)', async () => {
    const token = await createAccount('barber')
    const r = await req('PUT', '/api/profile/me', {
      token,
      body: {
        ...common,
        professionalName: 'Sin Foto',
        description: 'Barbero de pruebas',
        photoUrl: '',
      },
    })
    assert.equal(r.status, 200, JSON.stringify(r.data))
    assert.equal(r.data.profile.photoUrl, '')
  })

  test('acepta photoUrl ausente', async () => {
    const token = await createAccount('barber')
    const r = await req('PUT', '/api/profile/me', {
      token,
      body: { ...common, professionalName: 'Sin Campo', description: 'Otro' },
    })
    assert.equal(r.status, 200, JSON.stringify(r.data))
  })

  test('acepta logoUrl vacío (barbería sin logo)', async () => {
    const token = await createAccount('barbershop_owner')
    const r = await req('PUT', '/api/profile/me', {
      token,
      body: { ...common, businessName: 'Barbería Sin Logo', logoUrl: '' },
    })
    assert.equal(r.status, 200, JSON.stringify(r.data))
    assert.equal(r.data.profile.logoUrl, '')
  })

  test('sigue aceptando una foto válida', async () => {
    const token = await createAccount('barber')
    const r = await req('PUT', '/api/profile/me', {
      token,
      body: {
        ...common,
        professionalName: 'Con Foto',
        description: 'Con imagen',
        photoUrl: 'https://ejemplo.com/foto.jpg',
      },
    })
    assert.equal(r.status, 200, JSON.stringify(r.data))
    assert.equal(r.data.profile.photoUrl, 'https://ejemplo.com/foto.jpg')
  })

  test('sigue rechazando un enlace inválido', async () => {
    const token = await createAccount('barber')
    const r = await req('PUT', '/api/profile/me', {
      token,
      body: {
        ...common,
        professionalName: 'Foto Rota',
        description: 'Enlace malo',
        photoUrl: 'esto no es un enlace',
      },
    })
    assert.equal(r.status, 422, JSON.stringify(r.data))
    assert.match(r.data.message, /enlace válido/)
  })
})
