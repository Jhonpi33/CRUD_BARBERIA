# Elysia — Backend (AGENTS.md)

## Qué es Elysia
SaaS para automatizar y gestionar negocios de barbería. Dos tipos de cuenta: `barber` (barbero individual) y `barbershop` (barbería/equipo).

## Stack
Node.js, Express, Mongoose (MongoDB), JWT (jsonwebtoken), bcryptjs, helmet, cors, express-rate-limit, express-validator, dotenv. JavaScript con ES Modules.

## Alcance ACTUAL
Auth (registro, login, /me, elegir rol) y luego Profile del barbero.
NO construir todavía: citas, clientes, WhatsApp, IA, pagos, inventario.

## Estructura
src/
  config/db.js
  models/        (User.js, Profile.js ...)
  routes/        (auth.routes.js ...)
  controllers/   (auth.controller.js ...)
  middleware/    (auth.js, errorHandler.js)
  app.js
  server.js
.env.example

## Seguridad (obligatorio)
1. Contraseñas siempre con bcrypt (costo 12). Nunca guardarlas ni devolverlas en claro. `passwordHash` con `select: false`.
2. `JWT_SECRET` solo desde variables de entorno. Nunca en el código ni en git. `.env` en `.gitignore`.
3. El rol NUNCA se acepta en `/register`. Solo se asigna con `PATCH /api/auth/role`, y solo si aún no tiene rol.
4. Errores de login genéricos: "Credenciales inválidas" (no digas si falló el correo o la contraseña).
5. Cada endpoint privado usa el middleware `auth`, que verifica el token y carga el usuario desde la BD.
6. Cada consulta de datos privados filtra por el `userId` del token, nunca por un id que mande el cliente.
7. Validar y sanitizar toda entrada (express-validator). Rate limit en login y registro.
8. Respuestas de error en JSON `{ message }`, sin stack traces en producción.

## Reglas de trabajo
- Una tarea por vez. No toques archivos que la tarea no mencione.
- Al terminar, lista los archivos creados o modificados y cómo probarlo (ejemplos curl).
- Ramas: nunca en `main`/`develop`. Commits tipo `feat:`, `fix:`, `chore:`.
