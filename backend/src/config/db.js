import mongoose from 'mongoose'

/**
 * Conecta a MongoDB usando MONGODB_URI del entorno.
 * Lanza si no hay URI o si la conexión falla.
 */
export async function connectDB() {
  const uri = process.env.MONGODB_URI

  if (!uri) {
    throw new Error('Falta la variable de entorno MONGODB_URI (revisa backend/.env)')
  }

  mongoose.set('strictQuery', true)

  const conn = await mongoose.connect(uri)
  console.log(`[db] MongoDB conectado: ${conn.connection.host}`)
  return conn
}

export async function disconnectDB() {
  await mongoose.disconnect()
}
