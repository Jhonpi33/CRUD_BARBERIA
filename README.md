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

- Node.js 18 o superior
- MongoDB (local o un clúster de MongoDB Atlas)

## Cómo correr cada parte

### Backend (API)

```bash
cd backend
cp .env.example .env   # completa MONGODB_URI y JWT_SECRET
npm install
npm run dev             # http://localhost:3000
```

### Frontend (web)

```bash
cd frontend
npm install
npm run dev             # http://localhost:5173
```

En desarrollo el frontend llama al backend en `/api` (proxy de Vite hacia
`http://localhost:3000`), por lo que no hace falta configurar `VITE_API_URL`.

## Alcance actual

Landing, `/precios`, `/login`, `/register`, `/seleccionar-rol`,
`/onboarding/barbero`, `/onboarding/barberia` y la autenticación en el backend.

Todavía **no** se construyen: agenda, citas, clientes, IA, WhatsApp, pagos,
inventario ni dashboards.

## Convenciones

Lee [AGENTS.md](./AGENTS.md): stack, estructura de carpetas, reglas de
seguridad y flujo de trabajo (ramas y tipo de commits).
