<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import Navbar from '../components/Navbar.vue'
import Footer from '../components/Footer.vue'

const route = useRoute()

/**
 * Rutas marcadas con `meta: chromeless` (la reserva pública del cliente) no
 * muestran el menú de marketing ni el footer: la página es del cliente, solo
 * necesita la marca y su propio botón de volver.
 */
const chromeless = computed(() => route.matched.some((r) => r.meta?.chromeless))
</script>

<template>
  <div class="layout-public" :class="{ 'layout-public--chromeless': chromeless }">
    <Navbar v-if="!chromeless" />
    <main class="layout-public__main">
      <RouterView />
    </main>
    <Footer v-if="!chromeless" />
  </div>
</template>

<style scoped>
/* Reserva sin chrome: el contenido ocupa toda la ventana (celular primero). */
.layout-public--chromeless .layout-public__main {
  min-height: 100vh;
}
</style>
