<script setup>
import { reactive, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore, friendlyAuthError } from '../stores/auth'
import Button from '../components/Button.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const form = reactive({ email: '', password: '' })
const error = ref('')

const redirectTarget = computed(() => {
  const target = route.query.redirect
  return typeof target === 'string' && target.startsWith('/') ? target : null
})

async function onSubmit() {
  error.value = ''
  try {
    const user = await auth.login({ email: form.email, password: form.password })
    router.push(redirectTarget.value || auth.panelPath)
    return user
  } catch (err) {
    error.value = friendlyAuthError(err)
  }
}
</script>

<template>
  <div class="auth-form">
    <h1 class="auth-form__title">Iniciar sesión</h1>
    <p class="auth-form__lead">Bienvenido de nuevo a Elysia.</p>

    <form class="form" novalidate @submit.prevent="onSubmit">
      <label class="form__field">
        <span class="form__label">Correo electrónico</span>
        <input
          v-model.trim="form.email"
          class="form__input"
          type="email"
          name="email"
          autocomplete="email"
          placeholder="tu@correo.com"
          required
        />
      </label>

      <label class="form__field">
        <span class="form__label">Contraseña</span>
        <input
          v-model="form.password"
          class="form__input"
          type="password"
          name="password"
          autocomplete="current-password"
          placeholder="••••••••"
          required
        />
      </label>

      <p v-if="error" class="form__error" role="alert">{{ error }}</p>

      <Button type="submit" variant="primary" :disabled="auth.loading">
        {{ auth.loading ? 'Entrando…' : 'Entrar' }}
      </Button>
    </form>

    <p class="auth-form__link">
      <RouterLink to="/recuperar-contrasena">¿Olvidaste tu contraseña?</RouterLink>
    </p>
    <p class="auth-form__link">
      ¿No tienes cuenta?
      <RouterLink to="/register">Créala gratis</RouterLink>
    </p>
  </div>
</template>

<style scoped>
.auth-form {
  text-align: center;
}

.auth-form__title {
  font-size: var(--font-size-lg);
  margin-bottom: var(--space-2);
}

.auth-form__lead {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
  margin-bottom: var(--space-5);
}

.auth-form__link {
  margin-top: var(--space-4);
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.auth-form__link a {
  color: var(--color-primary-soft);
}
</style>
