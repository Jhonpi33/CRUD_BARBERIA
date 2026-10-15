<script setup>
import { useRouter } from 'vue-router'
import { useAuthStore, ROLE_LABEL } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()

function onLogout() {
  auth.logout()
  router.push('/')
}
</script>

<template>
  <div class="panel">
    <header class="panel__topbar">
      <RouterLink class="panel__brand" to="/">Elysia</RouterLink>

      <div class="panel__meta">
        <span v-if="auth.role" class="panel__badge">
          {{ ROLE_LABEL[auth.role] || auth.role }}
        </span>
        <span class="panel__user">{{ auth.user?.name }}</span>
        <button class="btn btn--secondary btn--sm" type="button" @click="onLogout">
          Cerrar sesión
        </button>
      </div>
    </header>

    <main class="panel__body">
      <RouterView />
    </main>
  </div>
</template>
