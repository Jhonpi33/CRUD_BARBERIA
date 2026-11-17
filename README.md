# Elysia

SaaS para automatizar y gestionar negocios de barbería.

Dos tipos de cuenta:

- **`barber`**: barbero individual (no pertenece a una barbería en la base de datos).
- **`barbershop`**: barbería/equipo (caja, productos, inventario, reportes). Se construye después.

## Estructura del repositorio (monorepo)

```
CURD_BARBERIA/
  AGENTS.md      <- reglas de trabajo y alcance
  README.md
  .gitignore
  backend/       <- API: Node + Express + Mongoose
  frontend/      <- Web: Vue 3 + Vite
```

Cada carpeta tiene su propio `package.json` y su propio `.env.example`.
**No hay `package.json` en la raíz.**

- Una tarea de backend solo toca archivos dentro de `backend/`.
- Una tarea de frontend solo toca archivos dentro de `frontend/`.

## Requisitos

- Node.js 22.12 o superior
- MongoDB (local o un clúster de MongoDB Atlas)

## Cómo correr cada parte

### Backend (API)

```bash
cd backend
cp .env.example .env   # completa MONGODB_URI y JWT_SECRET
npm install
npm run dev             # http://localhost:3001
```

### Frontend (web)

```bash
cd frontend
npm install
npm run dev             # http://localhost:5173
```

En desarrollo el frontend llama al backend en `/api` (proxy de Vite hacia
`http://localhost:3001`), por lo que no hace falta configurar `VITE_API_URL`.

## Alcance actual

- **Público y Acceso**: Landing (`/`), `/funciones`, `/precios`, `/legal`, `/login`, `/registro`, `/recuperar-contrasena`, `/seleccionar-rol`.
- **Onboarding y Perfil**: Onboarding de barbero (`/onboarding/barbero`) y barbería (`/onboarding/barberia`), persistencia de perfil en MongoDB y perfil público en `/u/:slug`.
- **Panel del Barbero**:
  - **Compartir perfil**: Enlace público para captar reservas, copiado directo al portapapeles y compartir por WhatsApp (`wa.me`).
  - **Servicios**: Gestión completa de cortes y servicios con precios y duraciones.
  - **Horarios**: Configuración de jornada semanal, bloques de atención y descansos con soporte de zonas horarias.
  - **Reservas en línea**: Flujo público en `/u/:slug/reservar` con recálculo de disponibilidad y prevención de solapes atómica.
  - **Agenda**: Gestión de turnos, confirmación, cancelación y finalización de citas.
  - **Clientes**: Directorio generado automáticamente desde las reservas públicas con historial de citas.
  - **Notificaciones**: Avisos internos en el panel y correo electrónico al dueño al recibir reservas.

Todavía **no** se construyen: caja y cobros, pasarelas de pago, inventario de productos, reportes financieros, IA, ni módulo multiempleado de barbería.

## Producción

El backend puede servir la web y la API desde el mismo dominio. Ejecuta estos comandos desde la raíz del repositorio en el servicio de hosting:

```bash
npm ci --prefix frontend --include=dev
npm run build --prefix frontend
npm ci --prefix backend --omit=dev
npm start --prefix backend
```

Configura `NODE_ENV=production`, `SERVE_FRONTEND=true`, `REQUIRE_EMAIL_VERIFICATION=true`, `CLIENT_URL` con el origen público HTTPS, `MONGODB_URI`, `JWT_SECRET`, `ADMIN_EMAIL` y las variables del servicio de correo. Usa `/api/health` para comprobar que la API está conectada a MongoDB. Las credenciales se guardan en la configuración privada del hosting.

Antes de publicar, prueba el registro con entrega de correo y confirma una reserva desde el enlace de un perfil. Publica los cambios mediante pull requests hacia `main` y despliega esa rama después de verificar la versión.

## Convenciones

Lee [AGENTS.md](./AGENTS.md): stack, estructura de carpetas, reglas de
seguridad y flujo de trabajo (ramas y tipo de commits).
