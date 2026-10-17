<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore, friendlyAuthError } from '../stores/auth'
import Button from '../components/Button.vue'
import PasswordField from '../components/PasswordField.vue'

const router = useRouter()
const auth = useAuthStore()

const form = reactive({ name: '', email: '', password: '', confirm: '' })
const error = ref('')

async function onSubmit() {
  error.value = ''

  if (form.password !== form.confirm) {
    error.value = 'Las contraseñas no coinciden.'
    return
  }

  try {
    // El rol NO se envía aquí: el backend lo deja pendiente y se elige en /seleccionar-rol.
    await auth.register({
      name: form.name,
      email: form.email,
      password: form.password,
    })
    router.push('/seleccionar-rol')
  } catch (err) {
    error.value = friendlyAuthError(err)
  }
}
</script>

<template>
  <div class="auth-form">
    <h1 class="auth-form__title">Crear cuenta</h1>
    <p class="auth-form__lead">Empieza gratis, sin tarjeta de crédito.</p>

    <form class="form" novalidate @submit.prevent="onSubmit">
      <label class="form__field">
        <span class="form__label">Nombre</span>
        <input
          v-model.trim="form.name"
          class="form__input"
          type="text"
          name="name"
          autocomplete="name"
          placeholder="Tu nombre"
          minlength="2"
          maxlength="60"
          required
        />
      </label>

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
        <PasswordField
          v-model="form.password"
          name="password"
          autocomplete="new-password"
          placeholder="Mínimo 8 caracteres"
          :minlength="8"
        />
      </label>

      <label class="form__field">
        <span class="form__label">Confirmar contraseña</span>
        <PasswordField
          v-model="form.confirm"
          name="confirm"
          autocomplete="new-password"
          placeholder="Repite tu contraseña"
          :minlength="8"
        />
      </label>

      <p v-if="error" class="form__error" role="alert">{{ error }}</p>

      <Button type="submit" variant="primary" :disabled="auth.loading">
        {{ auth.loading ? 'Creando cuenta…' : 'Crear cuenta' }}
      </Button>
    </form>

    <p class="auth-form__link">
      ¿Ya tienes cuenta?
      <RouterLink to="/login">Inicia sesión</RouterLink>
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
