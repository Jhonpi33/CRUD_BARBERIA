# Elysia — CURD_BARBERIA (AGENTS.md)

## Qué es Elysia
SaaS para automatizar y gestionar negocios de barbería. Dos tipos de cuenta:
- `barber`: barbero individual (no pertenece a una barbería en la BD).
- `barbershop`: barbería/equipo (caja, productos, inventario, reportes). Se construye mucho después.

## Estructura del repositorio (monorepo)
CURD_BARBERIA/
  AGENTS.md          <- este archivo
  README.md
  .gitignore
  backend/           <- API: Node + Express + Mongoose
  frontend/          <- Web: Vue 3 + Vite

Cada carpeta tiene su propio package.json y su propio .env.example. No hay package.json en la raíz.

## Regla de oro de carpetas
- Una tarea de BACKEND solo toca archivos dentro de `backend/`.
- Una tarea de FRONTEND solo toca archivos dentro de `frontend/`.
- Nunca mezcles las dos en una misma tarea. Si una función necesita las dos, se hace en dos tareas (primero backend, después frontend).

## Alcance ACTUAL (no construir nada fuera de esto)
Landing, /precios, /login, /register, /seleccionar-rol, /onboarding/barbero, /onboarding/barberia, y la autenticación en el backend.
NO construir todavía: agenda, citas, clientes, IA, WhatsApp, pagos, inventario, dashboards.

---------------------------------------------------------------
## BACKEND (carpeta backend/)
Stack: Node.js, Express, Mongoose (MongoDB), jsonwebtoken, bcryptjs, helmet, cors, express-rate-limit, express-validator, dotenv. JavaScript con ES Modules.

backend/src/
  config/db.js
  models/        (User.js, Profile.js ...)
  routes/        (auth.routes.js ...)
  controllers/   (auth.controller.js ...)
  middleware/    (auth.js, errorHandler.js)
  app.js
  server.js
backend/.env.example

### Seguridad (obligatorio)
1. Contraseñas siempre con bcrypt (costo 12). Nunca guardarlas ni devolverlas en claro. `passwordHash` con `select: false`.
2. `JWT_SECRET` solo desde variables de entorno. Nunca en el código ni en git. Todo `.env` está en `.gitignore`.
3. El rol NUNCA se acepta en `/register`. Solo se asigna con `PATCH /api/auth/role`, y solo si aún no tiene rol.
4. Errores de login genéricos: "Credenciales inválidas" (no digas si falló el correo o la contraseña).
5. Cada endpoint privado usa el middleware `auth`, que verifica el token y carga el usuario desde la BD.
6. Cada consulta de datos privados filtra por el `_id` del usuario del token, nunca por un id que mande el cliente.
7. Validar y sanitizar toda entrada (express-validator). Rate limit en login y registro.
8. Errores en JSON `{ message }`, sin stack traces en producción.

---------------------------------------------------------------
## FRONTEND (carpeta frontend/)
Stack: Vue 3 (Composition API, `<script setup>`), Vite, Vue Router, Pinia, Axios. CSS propio (sin librerías de UI).
Llama al backend en `/api` (proxy de Vite a http://localhost:3000 en desarrollo).

frontend/src/
  components/   (Navbar.vue, Footer.vue, Button.vue ...)
  layouts/      (PublicLayout.vue, AuthLayout.vue)
  views/        (Home, Pricing, Login, Register, SelectRole, BarberOnboarding, BarbershopOnboarding)
  router/index.js
  stores/auth.js
  services/api.js
  styles/

Rutas: / , /precios , /login , /register , /seleccionar-rol , /onboarding/barbero , /onboarding/barberia

### Reglas del frontend
1. Textos de la interfaz en español. Nombres de código en inglés.
2. El `role` en el frontend solo sirve para mostrar pantallas. La seguridad real está en el backend: nunca asumas que "si no ve el botón, no puede hacer la acción".
3. Todas las llamadas HTTP pasan por `frontend/src/services/api.js`. Prohibido usar `fetch`/`axios` suelto en componentes.
4. No guardes contraseñas ni datos sensibles en el store ni en logs.
5. Diseño responsive (celular primero). Sin dependencias nuevas sin avisar.

---------------------------------------------------------------
## Reglas generales de trabajo
- Una tarea por vez. No toques archivos que la tarea no mencione.
- Al terminar, lista los archivos creados o modificados y cómo probar lo que hiciste.
- Ramas: nunca trabajes en `main` ni en `develop`. Commits tipo `feat:`, `fix:`, `chore:`.
