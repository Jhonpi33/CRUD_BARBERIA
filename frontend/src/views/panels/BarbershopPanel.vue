<script setup>
import { computed } from 'vue'
import { useAuthStore } from '../../stores/auth'
import Icon from '../../components/Icon.vue'

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
        <h2 class="panel-card__title"><Icon name="scissors" :size="18" /> Servicios del negocio</h2>
        <p class="panel-card__description">
          Administra los servicios generales de la barbería con sus precios y duraciones.
        </p>
        <RouterLink class="panel-card__nav" :to="{ name: 'barbershop-services' }">
          Administrar servicios <Icon name="arrow-right" :size="15" />
        </RouterLink>
      </article>
      <article class="panel-card">
        <h2 class="panel-card__title"><Icon name="clock" :size="18" /> Horarios del negocio</h2>
        <p class="panel-card__description">
          Define los días y bloques de atención de la barbería y sus descansos.
        </p>
        <RouterLink class="panel-card__nav" :to="{ name: 'barbershop-schedule' }">
          Administrar horarios <Icon name="arrow-right" :size="15" />
        </RouterLink>
      </article>
      <article class="panel-card">
        <h2 class="panel-card__title"><Icon name="calendar" :size="18" /> Agenda</h2>
        <p class="panel-card__description">
          Consulta las citas del negocio por día o por semana y gestiona sus estados.
        </p>
        <RouterLink class="panel-card__nav" :to="{ name: 'barbershop-agenda' }">
          Ver la agenda <Icon name="arrow-right" :size="15" />
        </RouterLink>
      </article>
      <article v-if="p" class="panel-card">
        <h2 class="panel-card__title"><Icon name="store" :size="18" /> Tu negocio</h2>
        <p class="panel-card__description">
          <Icon name="map-pin" :size="15" /> {{ p.location }}<br />
          <Icon name="phone" :size="15" /> {{ p.phone }}<br />
          <Icon name="clock" :size="15" /> {{ p.settings?.openingTime }}–{{ p.settings?.closingTime }}
          · citas de {{ p.settings?.appointmentDuration }} min<br />
          <Icon name="money" :size="15" /> {{ p.settings?.currency }}
        </p>
      </article>
      <article class="panel-card">
        <h2 class="panel-card__title"><Icon name="users" :size="18" /> Equipo</h2>
        <p class="panel-card__description">
          Agrega barberos y reparte turnos entre ellos en la próxima fase.
        </p>
      </article>
      <article class="panel-card">
        <h2 class="panel-card__title"><Icon name="wallet" :size="18" /> Caja e informes</h2>
        <p class="panel-card__description">
          Abre la caja con fondo inicial, registra ingresos y egresos del día y cierra con
          cuadre. Los cobros desde la agenda quedan aquí registrados.
        </p>
        <RouterLink class="panel-card__nav" :to="{ name: 'barbershop-cash' }">
          Abrir la caja <Icon name="arrow-right" :size="15" />
        </RouterLink>
      </article>
      <article class="panel-card">
        <h2 class="panel-card__title"><Icon name="box" :size="18" /> Inventario</h2>
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
