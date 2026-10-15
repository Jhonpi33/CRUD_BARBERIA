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
        <span class="role-card__icon" aria-hidden="true">💈</span>
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
        <span class="role-card__icon" aria-hidden="true">✂️</span>
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
}

.select-role__lead {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
  margin-bottom: var(--space-5);
  max-width: 380px;
  margin-left: auto;
  margin-right: auto;
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
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-5);
  text-align: center;
  transition: border-color 0.15s ease, transform 0.15s ease;
}

.role-card:hover:not(:disabled) {
  border-color: var(--color-primary);
  transform: translateY(-2px);
}

.role-card:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.role-card__icon {
  font-size: 1.8rem;
}

.role-card__title {
  font-family: var(--font-display);
  font-size: var(--font-size-md);
  color: var(--color-text);
}

.role-card__description {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.role-card__cta {
  margin-top: var(--space-2);
  font-size: var(--font-size-sm);
  font-weight: 700;
  color: var(--color-primary-soft);
}

.select-role__error {
  margin-top: var(--space-4);
  color: var(--color-danger-soft);
  font-size: var(--font-size-sm);
}
</style>
