<script setup>
import { computed, onMounted, ref } from 'vue'
import api from '../../services/api'
import Icon from '../../components/Icon.vue'

const users = ref([])
const total = ref(0)
const search = ref('')
const loading = ref(false)
const error = ref('')

const pendingVerification = computed(() => users.value.filter((user) => !user.emailVerified).length)

function roleLabel(role) {
  return {
    barber: 'Barbero',
    barbershop_owner: 'Dueño de barbería',
    barber_employee: 'Empleado',
    admin: 'Administrador',
    client: 'Cliente',
  }[role] || 'Sin perfil'
}

function formatDate(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Bogota',
  }).format(new Date(value))
}

async function loadUsers() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.get('/admin/users', {
      params: { limit: 100, ...(search.value ? { search: search.value } : {}) },
    })
    users.value = data.users
    total.value = data.total
  } catch (err) {
    error.value = err?.response?.data?.message || 'No pudimos cargar las cuentas. Intenta de nuevo.'
  } finally {
    loading.value = false
  }
}

onMounted(loadUsers)
</script>

<template>
  <div class="panel-view admin-view">
    <header class="admin-view__header">
      <div>
        <p class="admin-view__eyebrow">Administración</p>
        <h1 class="panel-view__title">Cuentas registradas</h1>
        <p class="panel-view__lead">Revisa quién se ha registrado y si ya verificó su correo.</p>
      </div>
      <button class="btn btn--secondary" type="button" :disabled="loading" @click="loadUsers">
        <Icon name="refresh" :size="16" /> {{ loading ? 'Actualizando…' : 'Actualizar' }}
      </button>
    </header>

    <section class="admin-view__summary" aria-label="Resumen de registros">
      <article class="admin-view__metric">
        <span class="admin-view__metric-label">Cuentas encontradas</span>
        <strong>{{ total }}</strong>
      </article>
      <article class="admin-view__metric">
        <span class="admin-view__metric-label">Pendientes en esta lista</span>
        <strong>{{ pendingVerification }}</strong>
      </article>
    </section>

    <form class="admin-view__search" role="search" @submit.prevent="loadUsers">
      <label class="admin-view__search-label" for="admin-user-search">Buscar por nombre o correo</label>
      <div class="admin-view__search-row">
        <input
          id="admin-user-search"
          v-model.trim="search"
          class="form__input"
          type="search"
          maxlength="80"
          placeholder="Ej. barbero@correo.com"
        />
        <button class="btn btn--primary" type="submit" :disabled="loading">Buscar</button>
      </div>
    </form>

    <p v-if="error" class="form__error" role="alert">{{ error }}</p>
    <p v-else-if="loading && users.length === 0" class="admin-view__empty" role="status">Cargando cuentas…</p>
    <p v-else-if="!loading && users.length === 0" class="admin-view__empty">No encontramos cuentas con esa búsqueda.</p>

    <div v-else class="admin-view__list" aria-live="polite">
      <article v-for="user in users" :key="user.id" class="admin-user">
        <div class="admin-user__identity">
          <span class="admin-user__avatar" aria-hidden="true"><Icon name="user" :size="18" /></span>
          <div class="admin-user__text">
            <h2>{{ user.name }}</h2>
            <a :href="`mailto:${user.email}`">{{ user.email }}</a>
          </div>
        </div>
        <div class="admin-user__details">
          <span class="admin-user__role">{{ roleLabel(user.role) }}</span>
          <span class="admin-user__verification" :class="{ 'admin-user__verification--pending': !user.emailVerified }">
            {{ user.emailVerified ? 'Correo verificado' : 'Verificación pendiente' }}
          </span>
          <time :datetime="user.createdAt">Registro: {{ formatDate(user.createdAt) }}</time>
        </div>
      </article>
    </div>

    <p class="admin-view__privacy">Por seguridad, esta vista no muestra contraseñas ni datos de autenticación.</p>
  </div>
</template>

<style scoped>
.admin-view { max-width: 1040px; }
.admin-view__header { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-4); margin-bottom: var(--space-5); }
.admin-view__eyebrow { color: var(--accent); font-size: var(--font-size-xs); letter-spacing: .12em; text-transform: uppercase; margin-bottom: var(--space-2); }
.admin-view__header .panel-view__title { margin-bottom: var(--space-2); }
.admin-view__header .btn { display: inline-flex; align-items: center; gap: var(--space-2); flex-shrink: 0; }
.admin-view__summary { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-3); margin-bottom: var(--space-5); }
.admin-view__metric { display: grid; gap: var(--space-2); padding: var(--space-4); background: var(--surface); border: 1px solid var(--border-soft); border-radius: var(--radius-md); }
.admin-view__metric-label { color: var(--text-muted); font-size: var(--font-size-xs); }
.admin-view__metric strong { font-size: var(--font-size-lg); }
.admin-view__search { margin-bottom: var(--space-4); }
.admin-view__search-label { display: block; margin-bottom: var(--space-2); font-size: var(--font-size-sm); font-weight: 600; }
.admin-view__search-row { display: flex; gap: var(--space-2); }
.admin-view__search-row .form__input { flex: 1; min-width: 0; }
.admin-view__empty { padding: var(--space-6); text-align: center; color: var(--text-muted); background: var(--surface); border: 1px dashed var(--border); border-radius: var(--radius-md); }
.admin-view__list { display: grid; gap: var(--space-3); }
.admin-user { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); padding: var(--space-4); background: var(--surface); border: 1px solid var(--border-soft); border-radius: var(--radius-md); }
.admin-user__identity { display: flex; align-items: center; gap: var(--space-3); min-width: 0; }
.admin-user__avatar { display: grid; place-items: center; width: 40px; height: 40px; flex: 0 0 auto; border-radius: 50%; color: var(--accent); background: var(--surface-2); }
.admin-user__text { min-width: 0; }
.admin-user__text h2 { font-size: var(--font-size-sm); margin-bottom: 4px; }
.admin-user__text a { color: var(--text-muted); font-size: var(--font-size-xs); overflow-wrap: anywhere; }
.admin-user__details { display: flex; align-items: flex-end; flex-direction: column; gap: 5px; flex: 0 0 auto; font-size: var(--font-size-xs); color: var(--text-muted); }
.admin-user__role { color: var(--text); font-weight: 600; }
.admin-user__verification { color: var(--success, #15803d); }
.admin-user__verification--pending { color: var(--warning, #b45309); }
.admin-view__privacy { margin-top: var(--space-4); color: var(--text-muted); font-size: var(--font-size-xs); }
@media (max-width: 640px) {
  .admin-view__header { flex-direction: column; }
  .admin-view__summary { grid-template-columns: 1fr 1fr; }
  .admin-user { align-items: flex-start; flex-direction: column; }
  .admin-user__details { align-items: flex-start; padding-left: 52px; }
}
</style>
