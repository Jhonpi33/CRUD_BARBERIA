<script setup>
/*
  Ficha de un cliente + su historial de citas.

  El backend devuelve { client, appointments } y SIEMPRE filtra por el dueño
  del token: ver una ficha ajena responde 404, nunca datos de otro barbero.

  Además del historial, aquí se calcula el "valor" del cliente con datos que
  ya vienen del servidor (sin llamadas extra): nivel de fidelidad, última
  visita, frecuencia de corte, servicio favorito y cliente desde cuándo.
*/
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { useClientsStore } from '../../stores/clients'
import { useToastsStore } from '../../stores/toasts'
import Icon from '../../components/Icon.vue'
import { STATUS_LABELS } from '../../stores/appointments'
import { waLink, waMessageLink } from '../../utils/whatsapp'
import { mapsLink } from '../../utils/maps'
import { dayjs, shortDate, moneyLabel } from '../../utils/datetime'

const route = useRoute()
const auth = useAuthStore()
const store = useClientsStore()
const toast = useToastsStore()

const client = ref(null)
const appointments = ref([])
const notFound = ref('')

const id = computed(() => String(route.params.id || ''))

/* ---------------- Ficha técnica (notas privadas) ---------------- */
const editingNotes = ref(false)
const notesDraft = ref('')
const savingNotes = ref(false)

function startEditNotes() {
  notesDraft.value = client.value?.notes || ''
  editingNotes.value = true
}

function cancelEditNotes() {
  editingNotes.value = false
  notesDraft.value = ''
}

async function saveNotes() {
  const notes = notesDraft.value.trim()
  if (notes.length > 500) {
    toast.error('Notas muy largas', 'Máximo 500 caracteres.')
    return
  }
  savingNotes.value = true
  try {
    const updated = await store.updateNotes(id.value, notes)
    if (client.value) client.value.notes = updated.notes
    editingNotes.value = false
    toast.success(
      'Ficha actualizada',
      'Estas notas solo las ves tú desde tu panel: no aparecen en tu perfil público.'
    )
  } catch {
    toast.error('No se pudieron guardar las notas', store.error)
  } finally {
    savingNotes.value = false
  }
}

onMounted(async () => {
  try {
    const data = await store.fetchClient(id.value)
    client.value = data.client
    appointments.value = data.appointments ?? []
  } catch {
    // El mensaje ya quedó en store.error (404 de una ficha ajena, etc.)
    notFound.value = store.error || 'No se pudo cargar el cliente.'
  }
})

/** Más citas primero (el backend ya las ordena, aquí solo asegura el orden). */
const history = computed(() =>
  [...appointments.value].sort((a, b) => new Date(b.startUtc) - new Date(a.startUtc))
)

/** Próximas citas, de la más cercana a la más lejana. */
const upcoming = computed(() => {
  const now = Date.now()
  return history.value
    .filter(
      (a) => ['pending', 'confirmed'].includes(a.status) && new Date(a.startUtc).getTime() >= now
    )
    .sort((a, b) => new Date(a.startUtc) - new Date(b.startUtc))
})

/** La cita más cercana: la que sale en el resumen y la del recordatorio. */
const nearestUpcoming = computed(() => upcoming.value[0] || null)

const past = computed(() => {
  const now = Date.now()
  return history.value.filter(
    (a) => !['pending', 'confirmed'].includes(a.status) || new Date(a.startUtc).getTime() < now
  )
})

const stats = computed(() => {
  const completed = history.value.filter((a) => a.status === 'completed')
  const noShow = history.value.filter((a) => a.status === 'no_show')
  return {
    total: history.value.length,
    completed: completed.length,
    noShow: noShow.length,
    spent: completed.reduce((sum, a) => sum + (a.serviceSnapshot?.price || 0), 0),
  }
})

/* ---------------- Fidelidad (todo calculado con lo que ya llega) ---------------- */
const fidelity = computed(() => {
  const completed = history.value.filter((a) => a.status === 'completed')

  // Última visita realizada (history viene ordenado descendente).
  const last = completed[0] || null
  const daysSince = last
    ? Math.max(0, Math.floor((Date.now() - new Date(last.startUtc).getTime()) / 86400000))
    : null

  // Frecuencia promedio entre visitas consecutivas (necesita ≥ 2 visitas).
  let avgDays = null
  if (completed.length >= 2) {
    let sum = 0
    for (let i = 0; i < completed.length - 1; i += 1) {
      sum += (new Date(completed[i].startUtc) - new Date(completed[i + 1].startUtc)) / 86400000
    }
    avgDays = Math.max(1, Math.round(sum / (completed.length - 1)))
  }

  // Servicio más pedido entre las visitas completadas.
  const counts = {}
  for (const a of completed) {
    const name = a.serviceSnapshot?.name
    if (name) counts[name] = (counts[name] || 0) + 1
  }
  const favorite = Object.entries(counts).sort((x, y) => y[1] - x[1])[0] || null

  const since = client.value?.createdAt ? new Date(client.value.createdAt) : null

  return { last, daysSince, avgDays, favorite, since }
})

/** Nivel del cliente según visitas completadas. */
const level = computed(() => {
  const n = stats.value.completed
  if (n >= 6) return { label: 'Cliente fiel', cls: 'client__level--loyal' }
  if (n >= 2) return { label: 'Habitual', cls: 'client__level--regular' }
  return { label: 'Nuevo', cls: 'client__level--new' }
})

const lastVisitLabel = computed(() => {
  if (!fidelity.value.last) return 'Sin visitas'
  const d = fidelity.value.daysSince
  if (d <= 0) return 'Hoy'
  if (d === 1) return 'Ayer'
  if (d < 30) return `Hace ${d} días`
  const months = Math.round(d / 30)
  return `Hace ${months} ${months === 1 ? 'mes' : 'meses'}`
})

const nextVisitLabel = computed(() => {
  const a = nearestUpcoming.value
  return a ? `${shortDate(a.date)} · ${a.localStart}` : 'Sin citas'
})

const favoriteLabel = computed(() => {
  const f = fidelity.value.favorite
  if (!f) return '—'
  return `${f[0]} (${f[1]} ${f[1] === 1 ? 'vez' : 'veces'})`
})

const sinceLabel = computed(() => {
  const s = fidelity.value.since
  if (!s) return '—'
  return dayjs(s).format('MMMM [de] YYYY') // ej. 'octubre de 2026'
})

const avgSpendLabel = computed(() =>
  stats.value.completed > 0 ? moneyLabel(stats.value.spent / stats.value.completed) : '—'
)

const frequencyLabel = computed(() =>
  fidelity.value.avgDays ? `cada ${fidelity.value.avgDays} días` : '—'
)

/** Enlace para que el barbero cree una cita por el cliente (enlace público). */
const bookingLink = computed(() => {
  const slug = auth.profile?.slug
  return slug ? `/u/${slug}/reservar` : null
})

const callLink = computed(() =>
  client.value?.phone ? `tel:${client.value.phone.replace(/\s+/g, '')}` : null
)

/* Fechas y dinero: dayjs + Intl viven en utils/datetime.js (shortDate, moneyLabel). */

function statusClass(status) {
  return (
    {
      pending: 'badge-warning',
      confirmed: 'badge-info',
      completed: 'badge-success',
      cancelled: 'badge-muted',
      no_show: 'badge-danger',
    }[status] || 'badge-muted'
  )
}

/* ---------------- Mensajes de WhatsApp ---------------- */

/** Dirección del local (para el recordatorio con mapa). */
const barberLocation = computed(() => (auth.profile?.location || '').trim())

function withMap(msg) {
  if (!barberLocation.value) return msg
  const link = mapsLink(barberLocation.value)
  return `${msg}\n\n📍 Ubicación: ${barberLocation.value}${link ? `\n${link}` : ''}`
}

/** Recordatorio de una cita futura: fecha, hora y ubicación en mapa. */
function waRemindLink(appt) {
  const msg = `¡Hola ${client.value?.name}! Te recuerdo tu cita de ${appt.serviceSnapshot.name} el ${shortDate(appt.date)} a las ${appt.localStart}. ¡Te esperamos!`
  return waMessageLink(client.value?.phone, withMap(msg))
}

function waInviteLink(phone, clientName) {
  const barber =
    auth.profile?.professionalName ||
    auth.profile?.businessName ||
    auth.user?.name ||
    'tu barbero'
  const msg = `¡Hola ${clientName}! 👋 Te saludamos de ${barber}. ¿Te gustaría agendar tu próximo corte con nosotros?`
  return waMessageLink(phone, msg)
}

/** Copia el teléfono al portapapeles (útil para pegarlo en otra app). */
async function copyPhone() {
  try {
    await navigator.clipboard.writeText(client.value.phone)
    toast.success('Teléfono copiado', client.value.phone)
  } catch {
    toast.error('No se pudo copiar', 'Copia el número manualmente.')
  }
}
</script>

<template>
  <div class="client">
    <header class="client__header">
      <RouterLink class="btn btn--secondary btn--sm" :to="{ name: 'clients' }">
        <Icon name="arrow-left" :size="16" /> Mis clientes
      </RouterLink>
    </header>

    <p v-if="store.loading" class="client__state">Cargando ficha…</p>

    <div v-else-if="notFound" class="empty-state">
      <p class="empty-state__title">Cliente no encontrado</p>
      <p class="empty-state__text">{{ notFound }}</p>
      <RouterLink class="btn btn--primary btn--sm" :to="{ name: 'clients' }">
        Volver a mis clientes
      </RouterLink>
    </div>

    <template v-else-if="client">
      <!-- ======== Hero: identidad + datos clave + acciones grandes ======== -->
      <section class="client__card client__hero">
        <div class="client__hero-head">
          <span class="client__avatar" aria-hidden="true">
            {{ (client.name || '?').charAt(0).toUpperCase() }}
          </span>
          <div class="client__identity">
            <div class="client__name-row">
              <h1 class="client__name">{{ client.name }}</h1>
              <span class="client__level" :class="level.cls">
                <Icon name="star" :size="13" /> {{ level.label }}
              </span>
            </div>
            <p class="client__phone">
              <Icon name="phone" :size="15" /> {{ client.phone }}
              <button
                class="client__copy"
                type="button"
                title="Copiar teléfono"
                @click="copyPhone"
              >
                <Icon name="clipboard" :size="13" /> Copiar
              </button>
            </p>
            <p v-if="client.email" class="client__email">
              <Icon name="mail" :size="15" /> {{ client.email }}
            </p>
          </div>
        </div>

        <!-- Datos rápidos del cliente -->
        <ul class="client__facts">
          <li class="fact">
            <span class="fact__label"><Icon name="clock" :size="14" /> Última visita</span>
            <strong class="fact__value">{{ lastVisitLabel }}</strong>
          </li>
          <li class="fact">
            <span class="fact__label"><Icon name="calendar" :size="14" /> Próxima cita</span>
            <strong class="fact__value">{{ nextVisitLabel }}</strong>
          </li>
          <li class="fact">
            <span class="fact__label"><Icon name="scissors" :size="14" /> Corte favorito</span>
            <strong class="fact__value">{{ favoriteLabel }}</strong>
          </li>
          <li class="fact">
            <span class="fact__label"><Icon name="user" :size="14" /> Cliente desde</span>
            <strong class="fact__value">{{ sinceLabel }}</strong>
          </li>
        </ul>

        <!-- Acciones principales (grandes: son las de uso diario) -->
        <div class="client__actions">
          <a
            v-if="waLink(client.phone)"
            class="btn client__cta client__cta--wa"
            :href="waLink(client.phone)"
            target="_blank"
            rel="noopener"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
            Chat de WhatsApp
          </a>
          <a v-if="callLink" class="btn btn--secondary client__cta" :href="callLink">
            <Icon name="phone" :size="18" /> Llamar
          </a>
          <a
            v-if="bookingLink"
            class="btn btn--primary client__cta"
            :href="bookingLink"
            target="_blank"
            rel="noopener"
            title="Agendar una cita para este cliente"
          >
            <Icon name="calendar" :size="18" /> Agendar cita
          </a>
          <a
            v-if="nearestUpcoming && waRemindLink(nearestUpcoming)"
            class="btn client__cta client__cta--remind"
            :href="waRemindLink(nearestUpcoming)"
            target="_blank"
            rel="noopener"
            title="Enviar recordatorio con fecha, hora y ubicación"
          >
            <Icon name="bell" :size="18" /> Recordar cita
          </a>
          <a
            v-if="waInviteLink(client.phone, client.name)"
            class="btn btn--ghost client__cta client__cta--ghost"
            :href="waInviteLink(client.phone, client.name)"
            target="_blank"
            rel="noopener"
            title="Enviar mensaje de saludo para invitar a agendar"
          >
            <Icon name="message" :size="18" /> Invitar a agendar
          </a>
        </div>
      </section>

      <!-- ======== Resumen de fidelidad ======== -->
      <section class="client__stats">
        <div class="stat">
          <span class="stat__icon"><Icon name="calendar" :size="18" /></span>
          <strong class="stat__value">{{ stats.total }}</strong>
          <span class="stat__label">Citas totales</span>
        </div>
        <div class="stat">
          <span class="stat__icon stat__icon--ok"><Icon name="check-circle" :size="18" /></span>
          <strong class="stat__value">{{ stats.completed }}</strong>
          <span class="stat__label">Completadas</span>
        </div>
        <div class="stat">
          <span class="stat__icon stat__icon--warn"><Icon name="alert" :size="18" /></span>
          <strong class="stat__value">{{ stats.noShow }}</strong>
          <span class="stat__label">Inasistencias</span>
        </div>
        <div class="stat">
          <span class="stat__icon"><Icon name="money" :size="18" /></span>
          <strong class="stat__value">{{ moneyLabel(stats.spent) }}</strong>
          <span class="stat__label">Total gastado</span>
        </div>
        <div class="stat">
          <span class="stat__icon"><Icon name="wallet" :size="18" /></span>
          <strong class="stat__value">{{ avgSpendLabel }}</strong>
          <span class="stat__label">Promedio por cita</span>
        </div>
        <div class="stat">
          <span class="stat__icon"><Icon name="clock" :size="18" /></span>
          <strong class="stat__value stat__value--text">{{ frequencyLabel }}</strong>
          <span class="stat__label">Frecuencia de corte</span>
        </div>
      </section>

      <!-- ======== Ficha técnica ======== -->
      <section class="client__card">
        <div class="client__notes-head">
          <h2 class="client__subtitle client__subtitle--tight">
            <Icon name="clipboard" :size="17" /> Ficha técnica
            <span class="client__notes-private">Notas privadas</span>
          </h2>
          <button
            v-if="!editingNotes"
            class="btn btn--ghost btn--sm"
            type="button"
            @click="startEditNotes"
          >
            <template v-if="client.notes"><Icon name="pencil" :size="15" /> Editar notas</template>
            <template v-else><Icon name="plus" :size="15" /> Añadir notas</template>
          </button>
        </div>

        <template v-if="editingNotes">
          <label class="form__label" for="client-notes">
            Preferencias, alergias y detalles del corte (solo tú los ves)
          </label>
          <textarea
            id="client-notes"
            v-model="notesDraft"
            class="form__input client__notes-input"
            rows="4"
            maxlength="500"
            placeholder="Ej. Fade con la 0.5, raya izquierda, piel sensible al afeitar…"
          ></textarea>
          <p class="input-hint">{{ notesDraft.length }}/500 caracteres</p>
          <div class="client__notes-actions">
            <button
              class="btn btn--primary"
              type="button"
              :disabled="savingNotes"
              @click="saveNotes"
            >
              {{ savingNotes ? 'Guardando…' : 'Guardar ficha' }}
            </button>
            <button
              class="btn btn--ghost"
              type="button"
              :disabled="savingNotes"
              @click="cancelEditNotes"
            >
              Cancelar
            </button>
          </div>
        </template>

        <p v-else-if="client.notes" class="client__notes-body">{{ client.notes }}</p>
        <p v-else class="client__empty">
          Sin notas todavía. Anota su fade favorito, alergias o cualquier detalle para el
          próximo corte: aparecerá aquí y en cada cita de tu agenda.
        </p>
      </section>

      <!-- ======== Próximas citas ======== -->
      <section class="client__card">
        <h2 class="client__subtitle">
          <Icon name="calendar" :size="17" /> Próximas citas
        </h2>
        <p v-if="upcoming.length === 0" class="client__empty">Sin citas programadas.</p>
        <ul v-else class="client__list">
          <li v-for="a in upcoming" :key="a._id" class="appt" :class="`appt--${a.status}`">
            <div class="appt__when">
              <strong>{{ shortDate(a.date) }}</strong>
              <span>{{ a.localStart }} – {{ a.localEnd }}</span>
            </div>
            <div class="appt__what">
              <span class="appt__service">{{ a.serviceSnapshot.name }}</span>
              <span class="appt__meta">
                {{ a.serviceSnapshot.durationMinutes }} min ·
                {{ moneyLabel(a.serviceSnapshot.price) }}
              </span>
            </div>
            <span class="badge" :class="statusClass(a.status)">{{ STATUS_LABELS[a.status] }}</span>
            <a
              v-if="waLink(client.phone) && waRemindLink(a)"
              class="appt__remind"
              :href="waRemindLink(a)"
              target="_blank"
              rel="noopener"
              title="Recordatorio con fecha, hora y ubicación"
            >
              <Icon name="bell" :size="14" /> Recordar
            </a>
          </li>
        </ul>
      </section>

      <!-- ======== Historial ======== -->
      <section class="client__card">
        <h2 class="client__subtitle"><Icon name="clock" :size="17" /> Historial</h2>
        <p v-if="past.length === 0" class="client__empty">Todavía no tiene citas cerradas.</p>
        <ul v-else class="client__list">
          <li v-for="a in past" :key="a._id" class="appt" :class="`appt--${a.status}`">
            <div class="appt__when">
              <strong>{{ shortDate(a.date) }}</strong>
              <span>{{ a.localStart }} – {{ a.localEnd }}</span>
            </div>
            <div class="appt__what">
              <span class="appt__service">{{ a.serviceSnapshot.name }}</span>
              <span class="appt__meta">
                {{ a.serviceSnapshot.durationMinutes }} min ·
                {{ moneyLabel(a.serviceSnapshot.price) }}
              </span>
            </div>
            <span class="badge" :class="statusClass(a.status)">{{ STATUS_LABELS[a.status] }}</span>
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>

<style scoped>
.client__header {
  margin-bottom: var(--space-4);
}

.client__state {
  color: var(--color-text-muted);
  text-align: center;
  padding: var(--space-6) 0;
}

.client__card {
  background: var(--color-surface);
  border: 1px solid var(--color-border-soft);
  border-radius: var(--radius-md);
  padding: var(--space-5);
  margin-bottom: var(--space-4);
}

.client__hero {
  background: linear-gradient(180deg, var(--accent-soft) 0%, var(--color-surface) 42%);
}

.client__hero-head {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.client__avatar {
  flex: none;
  width: 76px;
  height: 76px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-full);
  background: var(--accent);
  color: #ffffff;
  font-size: var(--font-size-lg);
  font-weight: 700;
  box-shadow: 0 6px 18px rgba(37, 99, 235, 0.35);
}

.client__identity {
  flex: 1;
  min-width: 200px;
}

.client__name-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
  margin-bottom: var(--space-1);
}

.client__name {
  font-size: clamp(1.3rem, 4vw, 1.7rem);
}

/* Badge de nivel (Nuevo / Habitual / Cliente fiel) */
.client__level {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--font-size-xs);
  font-weight: 700;
  padding: 3px 10px;
  border-radius: var(--radius-pill);
  border: 1px solid transparent;
}

.client__level--new {
  color: var(--info);
  background: var(--info-soft);
  border-color: var(--info-border);
}

.client__level--regular {
  color: var(--accent);
  background: var(--accent-soft);
  border-color: var(--accent-border);
}

.client__level--loyal {
  color: var(--warning);
  background: var(--warning-soft);
  border-color: var(--warning-border);
}

.client__phone {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--font-size-sm);
  color: var(--color-text);
  font-weight: 600;
}

.client__copy {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 1px solid var(--color-border-soft);
  background: var(--color-surface);
  border-radius: var(--radius-pill);
  padding: 2px 8px;
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-text-muted);
  cursor: pointer;
}

.client__copy:hover {
  color: var(--accent);
  border-color: var(--accent-border);
}

.client__email {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  margin-top: var(--space-1);
}

/* Datos rápidos */
.client__facts {
  list-style: none;
  margin: var(--space-4) 0 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: var(--space-2);
}

.fact {
  background: var(--surface-2);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.fact__label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

.fact__value {
  font-size: var(--font-size-sm);
  font-weight: 700;
  color: var(--color-text);
}

/* Acciones principales GRANDES */
.client__actions {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
  margin-top: var(--space-4);
}

.client__cta {
  padding: 13px 22px;
  font-size: var(--font-size-base);
  font-weight: 700;
  border-radius: var(--radius-md);
}

.client__cta svg {
  width: 18px;
  height: 18px;
  flex: none;
}

.client__cta--wa {
  background: #25d366;
  border-color: #25d366;
  color: #ffffff;
}

.client__cta--wa:hover {
  background: #1eb457;
  border-color: #1eb457;
  color: #ffffff;
}

.client__cta--remind {
  background: rgba(37, 211, 102, 0.12);
  border-color: rgba(37, 211, 102, 0.45);
  color: #15803d;
}

.client__cta--remind:hover {
  background: #25d366;
  border-color: #25d366;
  color: #ffffff;
}

.client__cta--ghost {
  padding: 12px 18px;
}

/* Resumen: tarjetas con icono */
.client__stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.stat {
  background: var(--color-surface);
  border: 1px solid var(--color-border-soft);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  background: var(--accent-soft);
  color: var(--accent);
  margin-bottom: var(--space-1);
}

.stat__icon--ok {
  background: var(--success-soft);
  color: var(--success);
}

.stat__icon--warn {
  background: var(--warning-soft);
  color: var(--warning);
}

.stat__value {
  font-family: var(--font-display);
  font-size: var(--font-size-md);
  color: var(--color-primary);
  font-variant-numeric: tabular-nums;
}

.stat__value--text {
  font-size: var(--font-size-sm);
  text-transform: capitalize;
}

.stat__label {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

.client__subtitle {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--font-size-md);
  margin-bottom: var(--space-3);
}

.client__subtitle--tight {
  margin-bottom: 0;
}

/* Ficha técnica (notas privadas) */
.client__notes-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  flex-wrap: wrap;
  margin-bottom: var(--space-3);
}

.client__notes-private {
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: var(--accent);
  background: var(--accent-soft);
  border: 1px solid var(--accent-border);
  border-radius: var(--radius-pill);
  padding: 2px 10px;
  margin-left: var(--space-2);
  vertical-align: middle;
}

.client__notes-input {
  width: 100%;
  min-height: 96px;
  resize: vertical;
  line-height: 1.5;
  font-family: inherit;
}

.client__notes-actions {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
  margin-top: var(--space-2);
}

.client__notes-body {
  font-size: var(--font-size-sm);
  color: var(--color-text);
  line-height: 1.6;
  white-space: pre-wrap;
  background: var(--surface-2);
  border: 1px dashed var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
}

.client__empty {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.client__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.appt {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  flex-wrap: wrap;
  border: 1px solid var(--color-border-soft);
  border-left: 3px solid var(--color-border-soft);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
}

/* Color del estado al costado: se lee de un vistazo */
.appt--pending {
  border-left-color: var(--warning);
}

.appt--confirmed {
  border-left-color: var(--info);
}

.appt--completed {
  border-left-color: var(--success);
}

.appt--cancelled {
  border-left-color: var(--color-text-muted);
}

.appt--no_show {
  border-left-color: var(--danger);
}

.appt__when {
  display: flex;
  flex-direction: column;
  min-width: 120px;
  font-variant-numeric: tabular-nums;
}

.appt__when span {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

.appt__what {
  flex: 1;
  min-width: 160px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.appt__service {
  font-weight: 600;
}

.appt__meta {
  font-size: var(--font-size-sm);
  color: var(--color-primary-soft);
}

/* Recordatorio por cita */
.appt__remind {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: rgba(37, 211, 102, 0.12);
  color: #15803d;
  border: 1px solid rgba(37, 211, 102, 0.35);
  border-radius: var(--radius-full);
  padding: 4px 12px;
  font-size: var(--font-size-xs);
  font-weight: 700;
  text-decoration: none;
  white-space: nowrap;
}

.appt__remind:hover {
  background: #25d366;
  color: #ffffff;
}

@media (max-width: 560px) {
  .client__hero-head {
    flex-direction: column;
    align-items: flex-start;
    text-align: left;
  }

  /* En celular las acciones son botones grandes a todo el ancho */
  .client__cta {
    flex: 1 1 100%;
  }

  .appt {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
