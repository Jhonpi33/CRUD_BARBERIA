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
