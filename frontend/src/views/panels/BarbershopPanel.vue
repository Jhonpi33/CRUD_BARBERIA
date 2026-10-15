<script setup>
import { useAuthStore } from '../../stores/auth'

const auth = useAuthStore()
</script>

<template>
  <div class="panel-view">
    <h1 class="panel-view__title">Hola, {{ auth.user?.name }} 👋</h1>
    <p class="panel-view__lead">
      Este es el panel de tu barbería: agendas del equipo, caja, productos e informes.
    </p>

    <div class="panel-view__cards">
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
