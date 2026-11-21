<script setup>
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import Icon from './Icon.vue'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const menuOpen = ref(false)

function goPanel() {
  menuOpen.value = false
  router.push(auth.panelPath)
}

watch(() => route.fullPath, () => { menuOpen.value = false })
</script>

<template>
  <header class="navbar">
    <RouterLink class="navbar__brand" to="/">
      Elysia
      <span class="navbar__brand-tag">para barberías</span>
    </RouterLink>

    <button
      class="navbar__menu-toggle"
      type="button"
      :aria-expanded="menuOpen"
      aria-controls="public-navigation"
      :aria-label="menuOpen ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'"
      @click="menuOpen = !menuOpen"
    >
      <Icon :name="menuOpen ? 'x' : 'menu'" :size="22" />
      <span>Menú</span>
    </button>

    <nav id="public-navigation" class="navbar__links" :class="{ 'is-open': menuOpen }" aria-label="Navegación principal">
      <RouterLink to="/">Inicio</RouterLink>
      <RouterLink to="/funciones">Funciones</RouterLink>
      <RouterLink to="/precios">Precios</RouterLink>

      <template v-if="auth.isAuthenticated">
        <button class="navbar__link-btn" type="button" @click="goPanel">Mi panel</button>
      </template>

      <template v-else>
        <RouterLink to="/login">Iniciar sesión</RouterLink>
        <RouterLink class="navbar__cta" to="/registro">Crear cuenta</RouterLink>
      </template>
    </nav>
  </header>
</template>
