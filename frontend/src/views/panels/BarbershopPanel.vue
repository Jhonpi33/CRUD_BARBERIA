<script setup>
import { computed } from 'vue'
import { useAuthStore } from '../../stores/auth'

const auth = useAuthStore()
// computed: el perfil puede llegar después de montar (fetchMe en el guard)
const p = computed(() => auth.profile)
</script>

<template>
  <div class="panel-view">
    <h1 class="panel-view__title">{{ p?.businessName || 'Tu barbería' }}</h1>
    <p class="panel-view__lead">
      Panel de la barbería: agendas del equipo, caja, productos e informes.
      <RouterLink class="panel-view__edit" :to="auth.onboardingPath">Editar perfil</RouterLink>
    </p>

    <div class="panel-view__cards">
      <article class="panel-card">
        <h2 class="panel-card__title">✂️ Servicios del negocio</h2>
        <p class="panel-card__description">
          Administra los servicios generales de la barbería con sus precios y duraciones.
        </p>
        <RouterLink class="panel-card__nav" :to="{ name: 'barbershop-services' }">
          Administrar servicios →
        </RouterLink>
      </article>
      <article class="panel-card">
        <h2 class="panel-card__title">🕒 Horarios del negocio</h2>
        <p class="panel-card__description">
          Define los días y bloques de atención de la barbería y sus descansos.
        </p>
        <RouterLink class="panel-card__nav" :to="{ name: 'barbershop-schedule' }">
          Administrar horarios →
        </RouterLink>
      </article>
      <article v-if="p" class="panel-card">
        <h2 class="panel-card__title">🏪 Tu negocio</h2>
        <p class="panel-card__description">
          📍 {{ p.location }}<br />
          📞 {{ p.phone }}<br />
          🕘 {{ p.settings?.openingTime }}–{{ p.settings?.closingTime }}
          · citas de {{ p.settings?.appointmentDuration }} min<br />
          💱 {{ p.settings?.currency }}
        </p>
      </article>
      <article class="panel-card">
        <h2 class="panel-card__title">💈 Equipo</h2>
        <p class="panel-card__description">
          Agrega barberos y reparte turnos entre ellos en la próxima fase.
        </p>
      </article>
      <article class="panel-card">
        <h2 class="panel-card__title">💰 Caja e informes</h2>
        <p class="panel-card__description">
          Cierre de caja, comisiones y reportes de ingresos, próximamente.
        </p>
      </article>
      <article class="panel-card">
        <h2 class="panel-card__title">📦 Inventario</h2>
        <p class="panel-card__description">
          Control de productos y alertas de stock, próximamente.
        </p>
      </article>
    </div>
  </div>
</template>

<style scoped>
.panel-view__edit {
  color: var(--color-primary-soft);
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
