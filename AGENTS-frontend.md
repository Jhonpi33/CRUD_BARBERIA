# Elysia — Frontend (AGENTS.md)

## Qué es Elysia
SaaS para automatizar y gestionar negocios de barbería. Dos productos:
- **Barbero** (persona individual; no pertenece a una barbería en la BD).
- **Barbería** (equipo: caja, productos, inventario, reportes). Se construye mucho después.

## Stack
Vue 3 (Composition API, `<script setup>`), Vite, Vue Router, Pinia, Axios. CSS propio (sin librerías de UI).
El backend es otro repo (Express + Mongoose). El frontend lo llama en `/api` (proxy de Vite a `http://localhost:3000`).

## Alcance ACTUAL
- Landing, /funciones, /precios, /legal, /login, /registro, /recuperar-contrasena, /seleccionar-rol, /onboarding/barbero, /onboarding/barberia.
- Perfil público (/u/:slug) y flujo de reserva pública (/u/:slug/reservar).
- Panel del barbero completo: Compartir perfil (con copiado de enlace y WhatsApp), Agenda (con botones de WhatsApp y cobro en un clic), Servicios, Horarios, Clientes con detalle/historial y ficha técnica de notas privadas, Caja (apertura, ingresos/egresos, cuadre e historial) y Notificaciones.
NO construir todavía: pasarelas de pago en línea, inventario, reportes financieros avanzados (comisiones/utilidades), IA, ni módulo multiempleado de barbería.

## Estructura
src/
  components/   (Navbar.vue, Footer.vue, Button.vue ...)
  layouts/      (PublicLayout.vue, AuthLayout.vue)
  views/        (Home, Pricing, Login, Register, SelectRole, BarberOnboarding, BarbershopOnboarding)
  router/index.js
  stores/auth.js
  services/api.js
  styles/

## Rutas
/ , /precios , /login , /register , /seleccionar-rol , /onboarding/barbero , /onboarding/barberia

## Reglas
1. Una tarea por vez. No toques archivos que la tarea no mencione.
2. Textos de la interfaz en español. Nombres de código en inglés.
3. El `role` del frontend es solo para mostrar pantallas. La seguridad real está en el backend: nunca asumas que "si no ve el botón, no puede hacer la acción".
4. Todas las llamadas HTTP pasan por `src/services/api.js`. Prohibido usar `fetch`/`axios` suelto en componentes.
5. No guardes contraseñas ni datos sensibles en el store ni en logs.
6. Diseño responsive (celular primero). Sin dependencias nuevas sin avisar.
7. Al terminar, lista los archivos creados o modificados.
8. Ramas: nunca en `main`/`develop`. Commits tipo `feat:`, `fix:`, `chore:`.
9. Iconografía: la interfaz NO usa emojis; todos los símbolos son SVG con el componente `src/components/Icon.vue` (`<Icon name="…" :size="…" />`). Para pseudoelementos CSS, SVG en `data:` con `mask`. Sin librerías de iconos.
