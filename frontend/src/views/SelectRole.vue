<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore, friendlyAuthError } from '../stores/auth'
import Icon from '../components/Icon.vue'

const router = useRouter()
const auth = useAuthStore()
const error = ref('')

async function choosePilotRole() {
  error.value = ''
  try {
    await auth.setRole('barber')
    await router.push('/onboarding/barbero')
  } catch (err) {
    error.value = friendlyAuthError(err)
  }
}
</script>

<template>
  <div class="select-role">
    <RouterLink class="select-role__back" to="/">
      <Icon name="arrow-left" :size="16" /> Volver al inicio
    </RouterLink>

    <h1 class="select-role__title">Configura tu cuenta</h1>
    <p class="select-role__lead">
      Continúa para crear el perfil que compartirás con tus clientes.
    </p>

    <div class="select-role__grid">
      <button class="role-card" type="button" :disabled="auth.loading" @click="choosePilotRole">
        <span class="role-card__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </span>
        <span class="role-card__title">Barbero independiente</span>
        <span class="role-card__description">
          Quiero organizar mis servicios, horarios, reservas, clientes y caja básica.
        </span>
        <span class="role-card__cta">
          <template v-if="auth.loading">Configurando…</template>
          <template v-else>Continuar <Icon name="arrow-right" :size="15" /></template>
        </span>
      </button>
    </div>

    <p v-if="error" class="select-role__error" role="alert">{{ error }}</p>
  </div>
</template>

<style scoped>
.select-role { text-align: center; }
.select-role__back { display: flex; justify-content: flex-start; align-items: center; gap: 6px; width: 100%; font-size: var(--font-size-sm); color: var(--color-text-muted); margin-bottom: var(--space-5); }
.select-role__title { font-size: var(--font-size-lg); margin-bottom: var(--space-2); }
.select-role__lead { color: var(--color-text-muted); font-size: var(--font-size-sm); margin: 0 auto var(--space-5); max-width: 520px; }
.select-role__grid { display: grid; grid-template-columns: minmax(0, 440px); justify-content: center; margin: var(--space-5) 0; }
.role-card { display: flex; flex-direction: column; align-items: center; gap: var(--space-3); text-align: center; border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-surface); color: var(--color-text); padding: var(--space-6); cursor: pointer; }
.role-card:disabled { opacity: .65; cursor: wait; }
.role-card__icon svg { width: 36px; height: 36px; }
.role-card__title { font-weight: 700; font-size: var(--font-size-md); }
.role-card__description { color: var(--color-text-muted); font-size: var(--font-size-sm); }
.role-card__cta { color: var(--color-primary-soft); font-weight: 700; display: flex; align-items: center; gap: 6px; }
.select-role__error { color: var(--color-danger, #b42318); }
</style>
