<script setup>
import { reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore, friendlyAuthError } from '../stores/auth'
import Button from '../components/Button.vue'

const auth = useAuthStore()
const route = useRoute()

const initialToken = typeof route.query.token === 'string' ? route.query.token : ''
const step = ref(initialToken ? 2 : 1) // 1: pedir correo · 2: token + nueva contraseña
const form = reactive({ email: '', token: initialToken, password: '' })
const info = ref('')
const devToken = ref('')
const error = ref('')

async function onRequestToken() {
  error.value = ''
  info.value = ''
  try {
    const data = await auth.forgotPassword(form.email)
    info.value = data.message
    // Solo en desarrollo: el backend devuelve el token mientras no hay servicio de correo.
    if (data.devToken) {
      devToken.value = data.devToken
      form.token = data.devToken
      step.value = 2
    }
  } catch (err) {
    error.value = friendlyAuthError(err)
  }
}

async function onResetPassword() {
  error.value = ''
  try {
    await auth.resetPassword({ token: form.token, password: form.password })
    info.value = 'Contraseña actualizada. Ya puedes iniciar sesión.'
    step.value = 3
  } catch (err) {
    error.value = friendlyAuthError(err)
  }
}
</script>

<template>
  <div class="auth-form">
    <h1 class="auth-form__title">Recuperar contraseña</h1>
    <p class="auth-form__lead">
      Te enviaremos los pasos para restablecer tu contraseña.
    </p>

    <!-- Paso 1: correo -->
    <form v-if="step === 1" class="form" novalidate @submit.prevent="onRequestToken">
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

      <p v-if="info" class="form__info" role="status">{{ info }}</p>
      <p v-if="error" class="form__error" role="alert">{{ error }}</p>

      <Button type="submit" variant="primary" :disabled="auth.loading">
        {{ auth.loading ? 'Enviando…' : 'Enviar instrucciones' }}
      </Button>
    </form>

    <!-- Paso 2: token + nueva contraseña -->
    <form v-else-if="step === 2" class="form" novalidate @submit.prevent="onResetPassword">
      <p v-if="route.query.token" class="form__info">
        Crea una contraseña nueva para recuperar el acceso a tu cuenta.
      </p>
      <p v-else-if="devToken" class="form__info">
        Modo desarrollo: token de prueba <code>{{ devToken }}</code>.
      </p>

      <label v-if="!route.query.token && !devToken" class="form__field">
        <span class="form__label">Token de recuperación</span>
        <input
          v-model.trim="form.token"
          class="form__input"
          type="text"
          name="token"
          placeholder="Pégalo aquí"
          required
        />
      </label>

      <label class="form__field">
        <span class="form__label">Nueva contraseña</span>
        <input
          v-model="form.password"
          class="form__input"
          type="password"
          name="password"
          autocomplete="new-password"
          placeholder="Mínimo 8 caracteres"
          minlength="8"
          required
        />
      </label>

      <p v-if="error" class="form__error" role="alert">{{ error }}</p>

      <Button type="submit" variant="primary" :disabled="auth.loading">
        {{ auth.loading ? 'Guardando…' : 'Guardar nueva contraseña' }}
      </Button>
    </form>

    <!-- Paso 3: listo -->
    <div v-else class="form">
      <p class="form__info">{{ info }}</p>
      <RouterLink class="btn btn--primary" to="/login">Ir a iniciar sesión</RouterLink>
    </div>

    <p v-if="step !== 3" class="auth-form__link">
      <RouterLink to="/login">Volver a iniciar sesión</RouterLink>
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

code {
  word-break: break-all;
  color: var(--color-primary-soft);
}
</style>
