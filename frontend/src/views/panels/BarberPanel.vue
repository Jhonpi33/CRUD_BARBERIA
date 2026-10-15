<script setup>
import { useAuthStore } from '../../stores/auth'

const auth = useAuthStore()
</script>

<template>
  <div class="panel-view">
    <h1 class="panel-view__title">Hola, {{ auth.user?.name }} 👋</h1>
    <p class="panel-view__lead">
      Este es tu panel de barbero. Tu agenda, tus clientes y tus cobros vivirán aquí.
    </p>

    <div class="panel-view__cards">
      <article class="panel-card">
        <h2 class="panel-card__title">📅 Agenda</h2>
        <p class="panel-card__description">
          Módulo de agenda en construcción. Pronto podrás recibir turnos en línea.
        </p>
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
