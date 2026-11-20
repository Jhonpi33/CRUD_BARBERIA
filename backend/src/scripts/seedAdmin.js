import 'dotenv/config'
import { connectDB, disconnectDB } from '../config/db.js'
import { User } from '../models/User.js'

/**
 * Promueve una cuenta existente y verificada a administradora.
 * Primero registra y verifica el correo desde la aplicación; luego ejecuta:
 *   ADMIN_EMAIL=tu-correo npm run seed:admin
 * El script nunca crea contraseñas ni las imprime.
 */
async function seedAdmin() {
  const adminEmail = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
    console.error('[seed:admin] Configura un ADMIN_EMAIL válido en backend/.env')
    process.exitCode = 1
    return
  }

  if (!process.env.MONGODB_URI) {
    console.error('[seed:admin] Falta MONGODB_URI en backend/.env')
    process.exitCode = 1
    return
  }

  try {
    await connectDB()
    const user = await User.findOne({ email: adminEmail })
    if (!user) {
      throw new Error('Primero crea tu cuenta desde la aplicación y verifica tu correo.')
    }
    if (user.emailVerifiedAt === null) {
      throw new Error('Verifica el correo de tu cuenta antes de asignar el rol administrador.')
    }

    user.role = 'admin'
    user.roleAssignedAt = new Date()
    await user.save({ validateModifiedOnly: true })

    console.log('[seed:admin] Rol administrador asignado a la cuenta verificada.')
    console.log('[seed:admin] Inicia sesión con la contraseña que configuraste al registrarte.')
    console.log('[seed:admin] Panel: /panel/admin')
  } catch (err) {
    console.error(`[seed:admin] ${err.message}`)
    process.exitCode = 1
  } finally {
    await disconnectDB()
  }
}

seedAdmin()
