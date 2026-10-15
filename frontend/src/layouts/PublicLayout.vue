<script setup>
import Navbar from '../components/Navbar.vue'
import Footer from '../components/Footer.vue'
</script>

<template>
  <div class="layout-public">
    <Navbar />
    <main class="layout-public__main">
      <RouterView />
    </main>
    <Footer />
  </div>
</template>
