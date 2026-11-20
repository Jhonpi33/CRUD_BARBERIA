<script setup>
/*
  Panel del cliente (rol `client`).

  Un cliente no tiene agenda ni servicios: solo ve LAS CITAS QUE ÉL RESERVÓ.
  Como la reserva pública no pide cuenta, la única forma de relacionar una
  cita con esta cuenta es el TELÉFONO. Por eso, mientras no haya teléfono,
  el panel lo pide antes de mostrar nada.
*/
import { ref, computed, onMounted } from 'vue'
import api from '../../services/api'
import { useAuthStore, friendlyAuthError } from '../../stores/auth'
import { useToastsStore } from '../../stores/toasts'
import { STATUS_LABELS } from '../../stores/appointments'
import { longDate, timeOf, moneyLabel, toISODate } from '../../utils/datetime'
import Icon from '../../components/Icon.vue'

const auth = useAuthStore()
const toast = useToastsStore()

const loading = ref(true)
const loadError = ref('')
const needsPhone = ref(false)
const appointments = ref([])

const tab = ref('upcoming') // 'upcoming' | 'history'

// --- Mis datos ---
const nameInput = ref(auth.user?.name || '')
const phoneInput = ref(auth.user?.phone || '')
const savingData = ref(false)
const dataError = ref('')
const phoneField = ref(null)

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const { data } = await api.get('/client/appointments')
    needsPhone.value = Boolean(data.needsPhone)
    appointments.value = data.appointments || []
  } catch (err) {
    loadError.value = friendlyAuthError(err)
  } finally {
    loading.value = false
  }
}

onMounted(load)

/** Próximas: pendientes y confirmadas, de la más cercana a la más lejana. */
const upcoming = computed(() =>
  appointments.value
    .filter((a) => a.status === 'pending' || a.status === 'confirmed')
    .slice()
    .sort((a, b) => `${a.date} ${a.localStart}`.localeCompare(`${b.date} ${b.localStart}`))
)

/** Historial: terminadas, canceladas o a las que no llegó. */
const history = computed(() =>
  appointments.value.filter(
    (a) => a.status === 'completed' || a.status === 'cancelled' || a.status === 'no_show'
  )
)

const visibleAppointments = computed(() =>
  tab.value === 'upcoming' ? upcoming.value : history.value
)

/** 'Hoy' / 'Mañana' / fecha larga, para leer la lista de un vistazo. */
function dayLabel(date) {
  const today = toISODate()
  const tomorrow = toISODate(new Date(Date.now() + 24 * 60 * 60 * 1000))
  if (date === today) return 'Hoy'
  if (date === tomorrow) return 'Mañana'
  return longDate(date)
}

function digits(value) {
  return String(value || '').replace(/\D+/g, '')
}

function focusPhone() {
  phoneField.value?.focus()
}

async function saveData() {
  dataError.value = ''

  const phone = phoneInput.value.trim()
  if (phone && digits(phone).length < 7) {
    dataError.value = 'El teléfono debe tener al menos 7 dígitos.'
    return
  }

  savingData.value = true
  try {
    await auth.updateAccount({ name: nameInput.value.trim(), phone })
    toast.success(
      'Datos guardados',
      phone ? 'Si reservaste con este número, tus citas aparecerán aquí.' : ''
    )
    await load()
  } catch (err) {
    dataError.value = friendlyAuthError(err)
  } finally {
    savingData.value = false
  }
}
</script>

<template>
  <div class="panel-view">
    <h1 class="panel-view__title">Hola, {{ auth.user?.name }}</h1>
    <p class="panel-view__lead">
      Aquí ves las citas que reservaste con tu número de teléfono, en cualquier barbero o
      barbería de Elysia.
    </p>

    <!-- Sin teléfono no hay forma de saber cuáles son sus citas -->
    <section v-if="needsPhone" class="client-hint">
      <span class="client-hint__icon" aria-hidden="true">
        <Icon name="phone" :size="22" />
      </span>
      <div class="client-hint__body">
        <h2 class="client-hint__title">Agrega tu teléfono para ver tus citas</h2>
        <p class="client-hint__text">
          Cuando reservas desde el perfil de un barbero no necesitas cuenta: escribes tu
          nombre y tu número. Escribe aquí ese mismo número y tus citas aparecerán solas.
        </p>
        <button class="btn btn--primary btn--sm" type="button" @click="focusPhone">
          Agregar mi teléfono <Icon name="arrow-right" :size="15" />
        </button>
      </div>
    </section>

    <!-- Citas -->
    <section class="client-section">
      <div class="client-tabs" role="tablist" aria-label="Mis citas">
        <button
          class="client-tabs__tab"
          :class="{ 'is-active': tab === 'upcoming' }"
          type="button"
          role="tab"
          :aria-selected="tab === 'upcoming'"
          @click="tab = 'upcoming'"
        >
          Próximas
          <span v-if="upcoming.length" class="client-tabs__count">{{ upcoming.length }}</span>
        </button>
        <button
          class="client-tabs__tab"
          :class="{ 'is-active': tab === 'history' }"
          type="button"
          role="tab"
          :aria-selected="tab === 'history'"
          @click="tab = 'history'"
        >
          Historial
          <span v-if="history.length" class="client-tabs__count">{{ history.length }}</span>
        </button>
      </div>

      <p v-if="loadError" class="client-alert" role="alert">
        <Icon name="alert" :size="16" /> {{ loadError }}
      </p>

      <p v-else-if="loading" class="client-empty">Cargando tus citas…</p>

      <p v-else-if="visibleAppointments.length === 0" class="client-empty">
        <template v-if="tab === 'upcoming'">
          <template v-if="needsPhone">
            Aún no podemos buscar tus citas: primero agrega tu teléfono.
          </template>
          <template v-else>
            No tienes citas próximas. Cuando reserves desde el perfil de un barbero,
            aparecerá aquí.
          </template>
        </template>
        <template v-else>
          Todavía no hay citas anteriores.
        </template>
      </p>

      <ul v-else class="client-list">
        <li v-for="a in visibleAppointments" :key="a._id" class="client-appt">
          <div class="client-appt__when">
            <span class="client-appt__day">{{ dayLabel(a.date) }}</span>
            <span class="client-appt__time">
              {{ a.localStart }} – {{ a.localEnd }}
            </span>
          </div>

          <div class="client-appt__body">
            <div class="client-appt__head">
              <h3 class="client-appt__service">{{ a.service.name }}</h3>
              <span class="client-appt__status" :class="`is-${a.status}`">
                {{ STATUS_LABELS[a.status] || a.status }}
              </span>
            </div>

            <p class="client-appt__meta">
              <Icon name="store" :size="15" />
              <template v-if="a.business">{{ a.business.name }}</template>
              <template v-else>Negocio</template>
              <template v-if="a.service.durationMinutes">
                · {{ a.service.durationMinutes }} min
              </template>
              <template v-if="a.service.price"> · {{ moneyLabel(a.service.price) }}</template>
            </p>

            <p v-if="a.business?.location" class="client-appt__meta">
              <Icon name="map-pin" :size="15" /> {{ a.business.location }}
            </p>

            <div v-if="a.business?.slug" class="client-appt__actions">
              <RouterLink
                class="btn btn--ghost btn--sm"
                :to="`/u/${a.business.slug}`"
              >
                Ver perfil <Icon name="external" :size="14" />
              </RouterLink>
              <RouterLink
                v-if="a.status !== 'cancelled'"
                class="btn btn--ghost btn--sm"
                :to="`/u/${a.business.slug}/reservar`"
              >
                Reservar otra vez <Icon name="calendar" :size="14" />
              </RouterLink>
            </div>
          </div>
        </li>
      </ul>
    </section>

    <!-- Mis datos -->
    <section class="client-section">
      <h2 class="client-section__title"><Icon name="user" :size="18" /> Mis datos</h2>
      <p class="client-section__lead">
        Tu teléfono es la llave de tus citas. Si cambias de número, actualízalo aquí.
      </p>

      <form class="client-form" novalidate @submit.prevent="saveData">
        <label class="client-field">
          <span class="client-field__label">Nombre</span>
          <input
            v-model="nameInput"
            class="client-field__input"
            type="text"
            autocomplete="name"
            maxlength="60"
          />
        </label>

        <label class="client-field">
          <span class="client-field__label">Teléfono</span>
          <input
            ref="phoneField"
            v-model="phoneInput"
            class="client-field__input"
            type="tel"
            autocomplete="tel"
            inputmode="tel"
            maxlength="40"
            placeholder="300 111 2233"
          />
          <span class="client-field__help">
            Puede ir con indicativo: comparamos los últimos 10 dígitos.
          </span>
        </label>

        <label class="client-field">
          <span class="client-field__label">Correo</span>
          <input
            class="client-field__input"
            type="email"
            :value="auth.user?.email"
            readonly
            aria-readonly="true"
          />
          <span class="client-field__help">El correo de tu cuenta no se puede cambiar.</span>
        </label>

        <p v-if="dataError" class="client-alert" role="alert">
          <Icon name="alert" :size="16" /> {{ dataError }}
        </p>

        <button class="btn btn--primary btn--sm" type="submit" :disabled="savingData">
          {{ savingData ? 'Guardando…' : 'Guardar mis datos' }}
        </button>
      </form>
    </section>
  </div>
</template>

<style scoped>
/* Aviso para pedir el teléfono */
.client-hint {
  display: flex;
  gap: var(--space-4);
  align-items: flex-start;
  background: var(--accent-soft);
  border: 1px solid var(--accent-border);
  border-radius: var(--radius-lg);
  padding: var(--space-4) var(--space-5);
  margin-bottom: var(--space-5);
}

.client-hint__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  flex: none;
  border-radius: var(--radius-md);
  background: var(--surface);
  color: var(--accent);
}

.client-hint__title {
  font-size: var(--font-size-base);
  margin-bottom: var(--space-2);
}

.client-hint__text {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
  line-height: 1.5;
  margin-bottom: var(--space-3);
}

/* Secciones */
.client-section {
  background: var(--surface);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  margin-bottom: var(--space-5);
}

.client-section__title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--font-size-md);
  margin-bottom: var(--space-2);
}

.client-section__lead {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
  margin-bottom: var(--space-4);
}

/* Pestañas Próximas / Historial */
.client-tabs {
  display: flex;
  gap: var(--space-2);
  border-bottom: 1px solid var(--border-soft);
  margin-bottom: var(--space-4);
}

.client-tabs__tab {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-2);
  margin-bottom: -1px;
  border: none;
  border-bottom: 2px solid transparent;
  background: none;
  color: var(--text-muted);
  font-size: var(--font-size-sm);
  font-weight: 600;
  cursor: pointer;
}

.client-tabs__tab.is-active {
  color: var(--accent);
  border-bottom-color: var(--accent);
}

.client-tabs__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: var(--radius-full);
  background: var(--accent-soft);
  color: var(--accent);
  font-size: var(--font-size-xs);
}

/* Lista de citas */
.client-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  list-style: none;
  margin: 0;
  padding: 0;
}

.client-appt {
  display: flex;
  gap: var(--space-4);
  padding: var(--space-4);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-md);
  background: var(--bg);
}

.client-appt__when {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 116px;
  flex: none;
}

.client-appt__day {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--text);
}

.client-appt__time {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

.client-appt__body {
  flex: 1;
  min-width: 0;
}

.client-appt__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-1);
}

.client-appt__service {
  font-size: var(--font-size-base);
}

.client-appt__status {
  flex: none;
  padding: 2px 10px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: 600;
}

.client-appt__status.is-pending {
  background: var(--warning-soft);
  color: var(--warning);
}

.client-appt__status.is-confirmed {
  background: var(--success-soft);
  color: var(--success);
}

.client-appt__status.is-completed {
  background: var(--accent-soft);
  color: var(--accent);
}

.client-appt__status.is-cancelled,
.client-appt__status.is-no_show {
  background: var(--bg);
  color: var(--text-muted);
  border: 1px solid var(--border);
}

.client-appt__meta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
  font-size: var(--font-size-sm);
  color: var(--text-muted);
}

.client-appt__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-3);
}

/* Estados vacíos y errores */
.client-empty {
  padding: var(--space-5) 0;
  text-align: center;
  font-size: var(--font-size-sm);
  color: var(--text-muted);
}

.client-alert {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  background: var(--danger-soft, #fee2e2);
  color: var(--danger, #b91c1c);
  font-size: var(--font-size-sm);
}

/* Formulario de datos */
.client-form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--space-4);
  align-items: start;
}

.client-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.client-field__label {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--text);
}

.client-field__input {
  width: 100%;
  padding: 10px var(--space-3);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg);
  font-size: var(--font-size-sm);
  color: var(--text);
}

.client-field__input:focus {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

.client-field__input[readonly] {
  color: var(--text-muted);
  cursor: default;
}

.client-field__help {
  font-size: var(--font-size-xs, 0.75rem);
  color: var(--text-muted);
}

.client-form .client-alert,
.client-form .btn {
  grid-column: 1 / -1;
  justify-self: start;
}

@media (max-width: 560px) {
  .client-hint {
    flex-direction: column;
  }

  .client-appt {
    flex-direction: column;
    gap: var(--space-2);
  }

  .client-appt__when {
    flex-direction: row;
    align-items: baseline;
    gap: var(--space-2);
    min-width: 0;
  }
}
</style>
