<script setup>
import ToastHost from './components/ToastHost.vue'
</script>

<template>
  <RouterView />
  <!-- Alertas flotantes: un solo host para toda la app -->
  <ToastHost />
</template>
