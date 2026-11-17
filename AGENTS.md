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

## Alcance ACTUAL
- **Público y Acceso**: Landing (`/`), `/funciones`, `/precios`, `/legal`, `/login`, `/registro`, `/recuperar-contrasena`, `/seleccionar-rol`.
- **Onboarding y Perfil**: Onboarding de barbero (`/onboarding/barbero`) y barbería (`/onboarding/barberia`), persistencia de perfil y perfil público en `/u/:slug`.
- **Panel del Barbero**:
  - Compartir perfil: enlace directo a `/u/:slug`, copiado al portapapeles y botón para compartir por WhatsApp.
  - Servicios: catálogo con precios, duraciones y activación/desactivación (`/panel/barbero/servicios`).
  - Horarios: configuración semanal de atención, descansos y zona horaria (`/panel/barbero/horarios`).
  - Reservas públicas: disponibilidad en tiempo real y reserva de citas sin cuenta (`/u/:slug/reservar`).
  - Agenda: gestión de turnos diarios/semanales con control de estados y concurrencia atómica (`/panel/barbero/agenda`).
  - Comunicación directa: botones de WhatsApp en cada tarjeta de cita (solicitud recibida, recordatorio, confirmación con fecha/hora/ubicación en enlace de mapa, "turno listo" y cancelación) con textos listos vía `frontend/src/utils/whatsapp.js` y enlaces de mapa vía `frontend/src/utils/maps.js`.
  - Clientes: directorio automático alimentado por reservas públicas, detalle con historial y ficha técnica de notas privadas (`/panel/barbero/clientes`).
  - Caja: sesión con apertura (fondo inicial), ingresos/egresos, cobro de citas en un clic desde la agenda y cierre con cuadre (`/panel/barbero/caja`).
  - Notificaciones internas del panel y correos de confirmación al dueño.

NO construir todavía: pasarelas de pago en línea (Nequi/Daviplata/tarjetas), inventario de productos, reportes financieros avanzados (comisiones, utilidades), IA, ni módulo de equipo/empleados de barbería.

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
6. Iconografía: sin emojis en la interfaz; todos los símbolos son SVG con `frontend/src/components/Icon.vue`.

---------------------------------------------------------------
## Reglas generales de trabajo
- Una tarea por vez. No toques archivos que la tarea no mencione.
- Al terminar, lista los archivos creados o modificados y cómo probar lo que hiciste.
- Ramas: nunca trabajes en `main` ni en `develop`. Commits tipo `feat:`, `fix:`, `chore:`.
