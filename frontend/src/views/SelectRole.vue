<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore, friendlyAuthError } from '../stores/auth'
import Button from '../components/Button.vue'

const router = useRouter()
const auth = useAuthStore()

const error = ref('')
const choosing = ref(null)

async function choose(role) {
  error.value = ''
  choosing.value = role
  try {
    // El backend valida que el rol solo pueda asignarse una vez y que sea autoasignable.
    await auth.setRole(role)
    router.push(role === 'barber' ? '/onboarding/barbero' : '/onboarding/barberia')
  } catch (err) {
    error.value = friendlyAuthError(err)
  } finally {
    choosing.value = null
  }
}
</script>

<template>
  <div class="select-role">
    <h1 class="select-role__title">¿Cómo vas a usar Elysia?</h1>
    <p class="select-role__lead">
      Elige tu tipo de cuenta. Esto define tu panel y no podrás cambiarlo después.
    </p>

    <div class="select-role__grid">
      <button
        class="role-card"
        type="button"
        :disabled="auth.loading"
        @click="choose('barber')"
      >
        <span class="role-card__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </span>
        <span class="role-card__title">Barbero individual</span>
        <span class="role-card__description">
          Trabajo solo: quiero mi agenda, mis clientes y mis cobros en orden.
        </span>
        <span class="role-card__cta">
          {{ choosing === 'barber' ? 'Configurando…' : 'Soy barbero →' }}
        </span>
      </button>

      <button
        class="role-card"
        type="button"
        :disabled="auth.loading"
        @click="choose('barbershop_owner')"
      >
        <span class="role-card__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 21h18" />
            <path d="M5 21V7l7-4 7 4v14" />
            <path d="M9 21v-6h6v6" />
          </svg>
        </span>
        <span class="role-card__title">Dueño de barbería</span>
        <span class="role-card__description">
          Tengo un local con equipo: necesito ver agendas, caja, productos e informes.
        </span>
        <span class="role-card__cta">
          {{ choosing === 'barbershop_owner' ? 'Configurando…' : 'Tengo una barbería →' }}
        </span>
      </button>
    </div>

    <p v-if="error" class="select-role__error" role="alert">{{ error }}</p>
  </div>
</template>

<style scoped>
.select-role {
  text-align: center;
}

.select-role__title {
  font-size: var(--font-size-lg);
  margin-bottom: var(--space-2);
  text-align: center;
}

.select-role__lead {
  color: var(--text-muted);
  font-size: var(--font-size-sm);
  margin-bottom: var(--space-5);
  max-width: 380px;
  margin-left: auto;
  margin-right: auto;
  text-align: center;
}

.select-role__grid {
  display: grid;
  gap: var(--space-4);
}

.role-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--space-6) var(--space-5);
  text-align: center;
  cursor: pointer;
  transition:
    border-color var(--motion) ease,
    background-color var(--motion) ease,
    transform var(--motion) ease,
    box-shadow var(--motion) ease;
}

/* Borde y fondo accent al hover y al foco (nunca solo color: elevación + ícono) */
.role-card:hover:not(:disabled),
.role-card:focus-visible:not(:disabled) {
  border-color: var(--accent);
  background: var(--accent-soft);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.role-card:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.role-card__icon {
  display: inline-grid;
  place-items: center;
  width: 56px;
  height: 56px;
  border-radius: var(--radius-full);
  background: var(--accent-soft);
  color: var(--accent);
  margin-bottom: var(--space-2);
}

.role-card__icon svg {
  width: 28px;
  height: 28px;
}

.role-card__title {
  font-family: var(--font-display);
  font-size: var(--font-size-md);
  color: var(--text);
}

.role-card__description {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
}

.role-card__cta {
  margin-top: var(--space-3);
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--accent);
}

.select-role__error {
  margin-top: var(--space-4);
  color: var(--danger);
  font-size: var(--font-size-sm);
  text-align: center;
}
</style>
