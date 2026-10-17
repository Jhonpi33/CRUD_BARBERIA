<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore, ROLE_LABEL } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

// Ruta base del panel según el rol (barber y barbershop comparten vistas).
const base = computed(() => (auth.role === 'barber' ? '/panel/barbero' : '/panel/barberia'))

// Solo barbero y dueño de barbería tienen sub-secciones con navegación.
const hasNav = computed(() => ['barber', 'barbershop_owner'].includes(auth.role))

const nav = computed(() => [
  { to: base.value, label: 'Inicio', icon: 'home', exact: true },
  { to: `${base.value}/agenda`, label: 'Agenda', icon: 'calendar' },
  { to: `${base.value}/servicios`, label: 'Servicios', icon: 'scissors' },
  { to: `${base.value}/horarios`, label: 'Horarios', icon: 'clock' },
])

// Íconos SVG inline (trazo 24x24), sin librerías.
const icons = {
  home: 'M3 10.5 12 3l9 7.5M5 9.5V21h5v-6h4v6h5V9.5',
  calendar: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
  scissors: 'M6 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM20 4 8.12 15.88M14.47 14.48 20 20M8.12 8.12 12 12',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
}

function isActive(to, exact) {
  return exact ? route.path === to : route.path.startsWith(to)
}

function onLogout() {
  auth.logout()
  router.push('/')
}
</script>

<template>
  <div class="panel" :class="{ 'panel--nav': hasNav }">
    <!-- Sidebar (solo escritorio) -->
    <aside v-if="hasNav" class="panel__sidebar">
      <RouterLink class="panel__brand" to="/">Elysia</RouterLink>

      <nav class="panel__nav" aria-label="Secciones del panel">
        <RouterLink
          v-for="item in nav"
          :key="item.to"
          class="panel__nav-link"
          :class="{ 'is-active': isActive(item.to, item.exact) }"
          :to="item.to"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path :d="icons[item.icon]" />
          </svg>
          <span>{{ item.label }}</span>
        </RouterLink>
      </nav>

      <div class="panel__sidebar-foot">
        <span v-if="auth.role" class="panel__badge">
          {{ ROLE_LABEL[auth.role] || auth.role }}
        </span>
        <span class="panel__user">{{ auth.user?.name }}</span>
        <button class="btn btn--secondary btn--sm btn--block" type="button" @click="onLogout">
          Cerrar sesión
        </button>
      </div>
    </aside>

    <!-- Zona principal -->
    <div class="panel__main">
      <!-- Topbar solo en móvil (en escritorio lo reemplaza el sidebar) -->
      <header class="panel__topbar">
        <RouterLink class="panel__brand" to="/">Elysia</RouterLink>
        <div class="panel__meta">
          <span v-if="auth.role" class="panel__badge">
            {{ ROLE_LABEL[auth.role] || auth.role }}
          </span>
          <button class="btn btn--secondary btn--sm" type="button" @click="onLogout">
            Cerrar sesión
          </button>
        </div>
      </header>

      <main class="panel__body">
        <RouterView />
      </main>
    </div>

    <!-- Bottom-nav (solo móvil) -->
    <nav v-if="hasNav" class="panel__bottomnav" aria-label="Secciones del panel">
      <RouterLink
        v-for="item in nav"
        :key="item.to"
        class="panel__bottomnav-link"
        :class="{ 'is-active': isActive(item.to, item.exact) }"
        :to="item.to"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path :d="icons[item.icon]" />
        </svg>
        <small>{{ item.label }}</small>
      </RouterLink>
    </nav>
  </div>
</template>

<style scoped>
.panel {
  min-height: 100vh;
  background: var(--bg);
}

/* ---------- Sidebar (escritorio) ---------- */
.panel__sidebar {
  display: none;
}

.panel__brand {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: var(--font-size-md);
  color: var(--accent);
}

.panel__nav {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.panel__nav-link {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: 10px var(--space-3);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--text-muted);
  transition: background-color var(--motion-fast) ease, color var(--motion-fast) ease;
}

.panel__nav-link svg {
  width: 20px;
  height: 20px;
  flex: none;
}

.panel__nav-link:hover {
  background: var(--surface-2);
  color: var(--text);
}

/* Activo: fondo accent-soft + texto accent + barra lateral (nunca solo color) */
.panel__nav-link.is-active {
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 600;
}

.panel__sidebar-foot {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  font-size: var(--font-size-sm);
}

.panel__badge {
  align-self: flex-start;
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: var(--accent);
  background: var(--accent-soft);
  border: 1px solid var(--accent-border);
  border-radius: var(--radius-pill);
  padding: 4px 10px;
}

.panel__user {
  color: var(--text-muted);
}

/* ---------- Topbar (móvil) ---------- */
.panel__topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  flex-wrap: wrap;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border-soft);
  background: var(--surface);
  position: sticky;
  top: 0;
  z-index: 20;
}

.panel__meta {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
  font-size: var(--font-size-sm);
}

.panel__body {
  max-width: var(--container-max);
  margin: 0 auto;
  padding: var(--space-5) var(--space-4);
}

/* ---------- Bottom-nav (móvil) ---------- */
.panel__bottomnav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 30;
  display: flex;
  background: var(--surface);
  border-top: 1px solid var(--border-soft);
  box-shadow: 0 -2px 10px rgb(15 23 42 / 0.04);
  padding-bottom: env(safe-area-inset-bottom, 0);
}

.panel__bottomnav-link {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 4px;
  font-size: 0.66rem;
  color: var(--text-muted);
  transition: color var(--motion-fast) ease;
}

.panel__bottomnav-link svg {
  width: 22px;
  height: 22px;
}

.panel__bottomnav-link small {
  font-size: 0.66rem;
}

/* Activo en bottom-nav: ícono + etiqueta en accent y punto indicador */
.panel__bottomnav-link.is-active {
  color: var(--accent);
  font-weight: 600;
}

.panel__bottomnav-link.is-active::before {
  content: '';
  position: absolute;
  top: 0;
  width: 28px;
  height: 3px;
  border-radius: var(--radius-full);
  background: var(--accent);
}

.panel__bottomnav-link {
  position: relative;
}

/* Deja espacio en el cuerpo para que el bottom-nav no tape el contenido */
.panel--nav .panel__body {
  padding-bottom: 88px;
}

/* ---------- Escritorio: sidebar, sin topbar/bottom-nav ---------- */
@media (min-width: 900px) {
  .panel--nav {
    display: grid;
    grid-template-columns: 248px 1fr;
  }

  .panel__sidebar {
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
    position: sticky;
    top: 0;
    height: 100vh;
    padding: var(--space-5);
    background: var(--surface);
    border-right: 1px solid var(--border-soft);
  }

  .panel__nav {
    flex: 1;
    align-items: stretch;
  }

  .panel__topbar,
  .panel__bottomnav {
    display: none;
  }

  .panel__body {
    padding: var(--space-6) var(--space-6);
  }
}
</style>
