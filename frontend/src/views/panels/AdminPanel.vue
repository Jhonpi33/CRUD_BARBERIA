<script setup>
import { useAuthStore } from '../../stores/auth'

const auth = useAuthStore()
</script>

<template>
  <div class="panel-view">
    <h1 class="panel-view__title">Administración de Elysia</h1>
    <p class="panel-view__lead">
      Hola {{ auth.user?.name }}, este panel es solo para cuentas administrativas autorizadas.
    </p>

    <div class="panel-view__cards">
      <article class="panel-card">
        <h2 class="panel-card__title">👥 Usuarios</h2>
        <p class="panel-card__description">
          Gestión de usuarios y asignación controlada de roles, próximamente.
        </p>
      </article>
      <article class="panel-card">
        <h2 class="panel-card__title">⚙️ Sistema</h2>
        <p class="panel-card__description">
          Estado del servicio y métricas internas, próximamente.
        </p>
      </article>
    </div>
  </div>
</template>
