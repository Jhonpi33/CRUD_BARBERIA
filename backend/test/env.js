/*
  Entorno de pruebas. DEBE ser el primer import de cada archivo de test:
  las sentencias normales de un módulo ES se ejecutan DESPUÉS de evaluar
  todos los `import` (se elevan), así que asignar process.env en el cuerpo
  del test no llegaría a tiempo para que app.js lea NODE_ENV al importarse.
  Importando este módulo primero, se fija el entorno antes de cargar la app.
*/
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = process.env.JWT_SECRET || 'secreto-de-pruebas-solo-test'
process.env.MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/elysia_test'
/*
  La validación de correo por código se apaga AQUÍ y no en cada test: el resto
  de las pruebas registran cuentas y las usan directamente, como si la
  validación no existiera. El flujo completo lo cubre
  `api-auth-verification.test.js`, que la enciende él mismo (se lee en cada
  petición, no al importar el módulo).
*/
process.env.REQUIRE_EMAIL_VERIFICATION = 'false'

/** 'YYYY-MM-DD' con dos dígitos. */
function pad2(n) {
  return String(n).padStart(2, '0')
}

/**
 * Fecha de un día de la semana SIEMPRE FUTURA, para las pruebas de reservas.
 *
 * Antes los tests escribían la fecha a mano ('2026-10-19'); al avanzar los
 * días esa fecha caía en el pasado y la API empezaba a rechazar las reservas
 * de prueba con 422. Calculándola contra el reloj actual, las pruebas no se
 * vencen con el tiempo.
 *
 * @param {number} weekday día deseado (0=domingo … 6=sábado). Por defecto lunes.
 * @param {number} weeksAhead cuántas semanas saltar hacia adelante (mínimo 1,
 *                 lo que garantiza que nunca coincide con hoy).
 * @returns {string} 'YYYY-MM-DD'
 */
export function futureWeekday(weekday = 1, weeksAhead = 1) {
  const d = new Date()
  d.setHours(12, 0, 0, 0)
  const delta = (weekday - d.getDay() + 7) % 7
  d.setDate(d.getDate() + delta + 7 * weeksAhead)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}
