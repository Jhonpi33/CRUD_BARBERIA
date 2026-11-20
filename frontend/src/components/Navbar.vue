<script setup>
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()

function goPanel() {
  router.push(auth.panelPath)
}

function onLogout() {
  auth.logout()
  router.push('/')
}
</script>

<template>
  <header class="navbar">
    <RouterLink class="navbar__brand" to="/">
      Elysia
      <span class="navbar__brand-tag">para barberías</span>
    </RouterLink>

    <nav class="navbar__links">
      <RouterLink to="/">Inicio</RouterLink>
      <RouterLink to="/funciones">Funciones</RouterLink>
      <RouterLink to="/precios">Precios</RouterLink>

      <template v-if="auth.isAuthenticated">
        <button class="navbar__link-btn" type="button" @click="goPanel">Mi panel</button>
        <button class="navbar__link-btn navbar__link-btn--muted" type="button" @click="onLogout">
          Cerrar sesión
        </button>
      </template>

      <template v-else>
        <RouterLink to="/login">Iniciar sesión</RouterLink>
        <RouterLink class="navbar__cta" to="/registro">Crear cuenta</RouterLink>
      </template>
    </nav>
  </header>
</template>
