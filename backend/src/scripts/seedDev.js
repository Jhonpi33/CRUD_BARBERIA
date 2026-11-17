/**
 * seed:dev — Crea (o restablece) dos cuentas de prueba listas para usar:
 *
 *   barbero@elysia.app     /Barbero123*    → rol barber (perfil + horario completos)
 *   barberia@elysia.app    / Barberia123*  → rol barbershop_owner (perfil completo)
 *
 * Uso:
 *   cd backend && ALLOW_DEV_SEED=true npm run seed:dev
 *
 * Las credenciales anteriores se sobrescriben cada vez que se ejecuta el script.
 * Requiere autorización explícita y está bloqueado en producción.
 */

import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { connectDB, disconnectDB } from '../config/db.js'
import { User } from '../models/User.js'
import { Profile } from '../models/Profile.js'
import { Schedule } from '../models/Schedule.js'
import { Service } from '../models/Service.js'

const BCRYPT_ROUNDS = 12

/** Estructura de días laborables de lunes a sábado, 09:00 a 19:00. */
function workingSchedule() {
  const working = {
    isWorkingDay: true,
    blocks: [{ start: '09:00', end: '19:00' }],
    breaks: [{ start: '13:00', end: '14:00' }],
  }
  const off = { isWorkingDay: false, blocks: [], breaks: [] }
  return {
    mon: { ...working },
    tue: { ...working },
    wed: { ...working },
    thu: { ...working },
    fri: { ...working },
    sat: { ...working, breaks: [] },
    sun: { ...off },
  }
}

async function upsertUser({ email, password, name, role }) {
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)
  const user = await User.findOneAndUpdate(
    { email },
    { name, passwordHash, role, roleAssignedAt: new Date() },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )
  return user
}

async function seedDev() {
  console.log('🌱 Iniciando seed de desarrollo (barbero y barbería)...\n')

  if (process.env.NODE_ENV === 'production' || process.env.ALLOW_DEV_SEED !== 'true') {
    console.error('[seed:dev] Bloqueado. Define ALLOW_DEV_SEED=true solo en una base de pruebas no productiva.')
    process.exit(1)
  }

  if (!process.env.MONGODB_URI) {
    console.error('❌ Falta MONGODB_URI en backend/.env')
    process.exit(1)
  }

  try {
    await connectDB()

    // ─── 1. Barbero individual ─────────────────────────────────────────
    const barber = await upsertUser({
      email: 'barbero@elysia.app',
      password: 'Barbero123*',
      name: 'Carlos el Barbero',
      role: 'barber',
    })

    // Perfil del barbero completo (con slug → aparece la tarjeta de compartir perfil)
    await Profile.findOneAndUpdate(
      { owner: barber._id },
      {
        owner: barber._id,
        type: 'barber',
        professionalName: 'Carlos el Barbero',
        description: 'Barbero profesional con 5 años de experiencia en cortes clásicos y modernos.',
        phone: '3001234567',
        location: 'Bogotá, Chapinero',
        photoUrl: '',
        slug: 'carlos-el-barbero',
        completedAt: new Date(),
      },
      { upsert: true, new: true }
    )

    // Horario del barbero
    await Schedule.findOneAndUpdate(
      { owner: barber._id },
      { owner: barber._id, timezone: 'America/Bogota', days: workingSchedule() },
      { upsert: true, new: true }
    )

    // Servicios del barbero
    await Service.deleteMany({ owner: barber._id })
    await Service.insertMany([
      { owner: barber._id, name: 'Corte clásico', description: 'Corte a tijera o máquina', price: 25000, durationMinutes: 30, isActive: true },
      { owner: barber._id, name: 'Fade + barba', description: 'Degradado y arreglo de barba', price: 40000, durationMinutes: 45, isActive: true },
      { owner: barber._id, name: 'Arreglo de barba', description: 'Perfilado y arreglo de barba', price: 15000, durationMinutes: 20, isActive: true },
    ])

    console.log('✅ Barbero creado / actualizado')
    console.log('   📧 barbero@elysia.app')
    console.log('   🔑 Barbero123*')
    console.log('   🌐 /panel/barbero  →  perfil público: /u/carlos-el-barbero\n')

    // ─── 2. Dueño de barbería ──────────────────────────────────────────
    const barbershop = await upsertUser({
      email: 'barberia@elysia.app',
      password: 'Barberia123*',
      name: 'María García',
      role: 'barbershop_owner',
    })

    await Profile.findOneAndUpdate(
      { owner: barbershop._id },
      {
        owner: barbershop._id,
        type: 'barbershop',
        businessName: 'Barbería El Clan',
        phone: '3109876543',
        location: 'Medellín, El Poblado',
        logoUrl: '',
        settings: { currency: 'COP', openingTime: '09:00', closingTime: '19:00', appointmentDuration: 30 },
        completedAt: new Date(),
      },
      { upsert: true, new: true }
    )

    console.log('✅ Dueña de barbería creada / actualizada')
    console.log('   📧 barberia@elysia.app')
    console.log('   🔑 Barberia123*')
    console.log('   🌐 /panel/barberia\n')

    // ─── Resumen final ─────────────────────────────────────────────────
    console.log('╔══════════════════════════════════════════════════════╗')
    console.log('║        Cuentas de desarrollo listas                 ║')
    console.log('╠══════════════════════════════════════════════════════╣')
    console.log('║  BARBERO INDIVIDUAL                                  ║')
    console.log('║  Email:     barbero@elysia.app                       ║')
    console.log('║  Password:  Barbero123*                              ║')
    console.log('║  Panel:     /panel/barbero                           ║')
    console.log('║  Perfil:    /u/carlos-el-barbero                     ║')
    console.log('╠══════════════════════════════════════════════════════╣')
    console.log('║  DUEÑA DE BARBERÍA                                   ║')
    console.log('║  Email:     barberia@elysia.app                      ║')
    console.log('║  Password:  Barberia123*                             ║')
    console.log('║  Panel:     /panel/barberia                          ║')
    console.log('╠══════════════════════════════════════════════════════╣')
    console.log('╚══════════════════════════════════════════════════════╝')
    console.log()
  } catch (err) {
    console.error('❌ Error en seed:', err.message)
    process.exitCode = 1
  } finally {
    await disconnectDB()
    console.log('🔌 Conexión cerrada.')
  }
}

seedDev()
