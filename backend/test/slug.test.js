/*
  Unicidad del slug público.

  Regresión real: dos perfiles compartían el slug "carlos-el-barbero" y la
  reserva pública (POST /api/public/booking/:slug) guardaba la cita en la
  cuenta equivocada, así que al barbero "no le aparecía" en la agenda.
  `uniqueSlug()` evita el caso normal; el índice único parcial cierra la
  carrera de dos onboards simultáneos.

  Requiere MongoDB local (mongodb://127.0.0.1:27017/elysia_test).
  Ejecutar con: npm test
*/
import './env.js' // DEBE ir primero: fija NODE_ENV antes de cargar la app

import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'

import { Profile } from '../src/models/Profile.js'

before(async () => {
  await mongoose.connect(process.env.MONGODB_URI)
  await mongoose.connection.dropDatabase()
  await Profile.init() // fuerza el índice único parcial antes de las pruebas
})

after(async () => {
  await mongoose.disconnect()
})

describe('slug público único (índice parcial)', () => {
  test('no se puede crear un segundo perfil con el mismo slug', async () => {
    await Profile.create({
      owner: new mongoose.Types.ObjectId(),
      type: 'barber',
      slug: 'carlos-el-barbero',
    })

    await assert.rejects(
      () =>
        Profile.create({
          owner: new mongoose.Types.ObjectId(),
          type: 'barber',
          slug: 'carlos-el-barbero',
        }),
      (err) => err.code === 11000,
      'el índice único debió rechazar el duplicado'
    )
  })

  test('los perfiles sin onboarding (slug null) pueden coexistir', async () => {
    // El esquema usa un índice PARCIAL (slug $type string): varios perfiles
    // con slug null deben poder existir a la vez.
    for (let i = 0; i < 3; i += 1) {
      await Profile.create({ owner: new mongoose.Types.ObjectId(), type: 'barber' })
    }
    const sinSlug = await Profile.countDocuments({ slug: null })
    assert.equal(sinSlug, 3)
  })
})
