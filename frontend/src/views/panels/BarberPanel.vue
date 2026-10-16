<script setup>
import { computed } from 'vue'
import { useAuthStore } from '../../stores/auth'

const auth = useAuthStore()

const publicLink = computed(() => {
  const slug = auth.profile?.slug
  return slug ? `${window.location.origin}/u/${slug}` : null
})
</script>

<template>
  <div class="panel-view">
    <h1 class="panel-view__title">Hola, {{ auth.user?.name }} 👋</h1>
    <p class="panel-view__lead">
      Este es tu panel de barbero. Tu agenda, tus clientes y tus cobros vivirán aquí.
    </p>

    <div class="panel-view__cards">
      <article class="panel-card">
        <h2 class="panel-card__title">✂️ Mis servicios</h2>
        <p class="panel-card__description">
          Crea tus servicios, define precios y duración, actívalos o desactívalos.
        </p>
        <RouterLink class="panel-card__nav" :to="{ name: 'barber-services' }">
          Administrar servicios →
        </RouterLink>
      </article>
      <article class="panel-card">
        <h2 class="panel-card__title">🕒 Mis horarios</h2>
        <p class="panel-card__description">
          Configura tus días, bloques de atención y descansos de la semana.
        </p>
        <RouterLink class="panel-card__nav" :to="{ name: 'barber-schedule' }">
          Administrar horarios →
        </RouterLink>
      </article>
      <article v-if="publicLink" class="panel-card">
        <h2 class="panel-card__title">🔗 Tu enlace público</h2>
        <p class="panel-card__description">
          Compártelo para que te encuentren y reserven.
        </p>
        <a class="panel-card__link" :href="publicLink" target="_blank" rel="noopener">
          {{ publicLink }}
        </a>
      </article>
      <article class="panel-card">
        <h2 class="panel-card__title">📅 Agenda</h2>
        <p class="panel-card__description">
          Consulta tus citas por día o por semana y confirma, completa o cancela cada una.
        </p>
        <RouterLink class="panel-card__nav" :to="{ name: 'barber-agenda' }">
          Ver mi agenda →
        </RouterLink>
      </article>
      <article class="panel-card">
        <h2 class="panel-card__title">👤 Clientes</h2>
        <p class="panel-card__description">
          La ficha de tus clientes con historial y preferencias llegará en la próxima fase.
        </p>
      </article>
      <article class="panel-card">
        <h2 class="panel-card__title">💰 Caja</h2>
        <p class="panel-card__description">
          Registro de cobros y cierre de caja diario, próximamente.
        </p>
      </article>
    </div>
  </div>
</template>

<style scoped>
.panel-card__link {
  display: block;
  margin-top: var(--space-3);
  font-size: var(--font-size-sm);
  color: var(--color-primary-soft);
  word-break: break-all;
}

.panel-card__nav {
  display: inline-block;
  margin-top: var(--space-3);
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-primary-soft);
}

.panel-card__nav:hover {
  color: var(--color-primary);
}
</style>
