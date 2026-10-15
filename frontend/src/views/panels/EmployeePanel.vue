<script setup>
import { useAuthStore } from '../../stores/auth'

const auth = useAuthStore()
</script>

<template>
  <div class="panel-view">
    <h1 class="panel-view__title">Hola, {{ auth.user?.name }} 👋</h1>
    <p class="panel-view__lead">
      Este es tu panel de empleado. Verás los turnos que la barbería te asigne.
    </p>

    <div class="panel-view__cards">
      <article class="panel-card">
        <h2 class="panel-card__title">📅 Mis turnos</h2>
        <p class="panel-card__description">
          Tu agenda asignada por el dueño de la barbería, próximamente.
        </p>
      </article>
    </div>
  </div>
</template>
