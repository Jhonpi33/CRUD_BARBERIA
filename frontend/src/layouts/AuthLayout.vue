<script setup>
import Icon from '../components/Icon.vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const benefits = [
  'Agenda y reservas en línea, sin cuaderno.',
  'Clientes, cobros e historia en un solo lugar.',
  'Listo para recibir turnos en menos de 5 minutos.',
]
</script>

<template>
  <div class="auth-split">
    <!-- Panel de marca (solo escritorio) -->
    <aside class="auth-split__brand">
      <RouterLink class="auth-split__logo" to="/">Elysia</RouterLink>
      <p class="auth-split__tagline">Tu agenda, en orden y lista para compartir.</p>
      <ul class="auth-split__benefits">
        <li v-for="benefit in benefits" :key="benefit">{{ benefit }}</li>
      </ul>
    </aside>

    <!-- Formulario en card centrada -->
    <main class="auth-split__panel">
      <div class="auth-split__card">
        <nav v-if="!route.meta.onboarding && route.name !== 'select-role'" class="auth-split__navigation" aria-label="Navegación de acceso">
          <RouterLink class="auth-split__back" to="/">
            <Icon name="arrow-left" :size="18" />
            Volver al inicio
          </RouterLink>
        </nav>
        <RouterView />
      </div>
    </main>
  </div>
</template>

<style scoped>
.auth-split {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 1fr 1fr;
}

/* ---------- Panel de marca ---------- */
.auth-split__brand {
  background: linear-gradient(160deg, var(--accent) 0%, var(--accent-hover) 100%);
  color: var(--accent-contrast);
  padding: clamp(32px, 6vw, 72px);
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: var(--space-5);
}

.auth-split__logo {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: var(--font-size-lg);
  letter-spacing: 0.02em;
  color: var(--accent-contrast);
}

.auth-split__tagline {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: clamp(1.5rem, 3vw, 2.2rem);
  line-height: 1.15;
  max-width: 18ch;
}

.auth-split__benefits {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  font-size: var(--font-size-sm);
  max-width: 34ch;
}

/* Check con ícono: nunca solo color */
.auth-split__benefits li {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
}

.auth-split__benefits li::before {
  content: '';
  flex: none;
  display: inline-block;
  width: 22px;
  height: 22px;
  border-radius: var(--radius-full);
  background-color: rgba(255, 255, 255, 0.22);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 6 9 17l-5-5'/%3E%3C/svg%3E");
  background-position: center;
  background-size: 12px;
  background-repeat: no-repeat;
}

/* ---------- Panel del formulario ---------- */
.auth-split__panel {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-5);
  background: var(--bg);
}

.auth-split__card {
  width: 100%;
  max-width: 420px;
  background: var(--surface);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  padding: clamp(24px, 5vw, 40px);
}

.auth-split__navigation {
  margin-bottom: var(--space-4);
  padding-bottom: var(--space-3);
  border-bottom: 1px solid var(--border-soft);
}

.auth-split__back {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text);
  font-size: var(--font-size-sm);
  font-weight: 500;
  text-decoration: none;
}

.auth-split__back:hover {
  background: var(--surface-2);
  color: var(--accent);
}

.auth-split__back:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}

/* ---------- Móvil: solo el formulario ---------- */
@media (max-width: 860px) {
  .auth-split {
    grid-template-columns: 1fr;
  }

  .auth-split__brand {
    display: none;
  }

  .auth-split__panel {
    padding: var(--space-4);
    align-items: flex-start;
    padding-top: clamp(24px, 8vw, 48px);
  }

  .auth-split__card {
    box-shadow: none;
    background: transparent;
    border: none;
    padding: 0;
    max-width: 480px;
    margin: 0 auto;
  }
}
</style>
