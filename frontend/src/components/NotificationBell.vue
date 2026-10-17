<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useNotificationsStore } from '../stores/notifications'

const props = defineProps({
  /** Si la campana está en la mitad inferior, el panel abre hacia arriba. */
  up: {
    type: Boolean,
    default: false,
  },
})

const notifs = useNotificationsStore()

const open = ref(false)
const panel = ref(null)

// Fecha legible en español (día y hora corta).
function whenLabel(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString('es-CO', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

async function toggle() {
  open.value = !open.value
  if (open.value) {
    // Al abrir, trae la lista más reciente y el contador real.
    await notifs.fetch({ limit: 15 })
  }
}

function onRead(n) {
  if (!n.readAt) notifs.markRead(n._id)
}

async function onReadAll() {
  await notifs.markAllRead()
}

// Cierra el panel al hacer clic fuera (y Escape para accesibilidad).
function onClickOutside(e) {
  if (open.value && panel.value && !panel.value.contains(e.target)) {
    open.value = false
  }
}
function onKey(e) {
  if (e.key === 'Escape') open.value = false
}

onMounted(async () => {
  document.addEventListener('click', onClickOutside, true)
  document.addEventListener('keydown', onKey)
  await notifs.fetchUnreadCount()
})
onUnmounted(() => {
  document.removeEventListener('click', onClickOutside, true)
  document.removeEventListener('keydown', onKey)
})
</script>

<template>
  <div ref="panel" class="bell" :class="{ 'bell--up': props.up }">
    <button
      class="bell__btn"
      type="button"
      :aria-expanded="open"
      aria-label="Notificaciones"
      @click="toggle"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.7 21a2 2 0 0 1-3.4 0" />
      </svg>
      <!-- Contador: número + color (nunca solo color) -->
      <span v-if="notifs.unreadCount > 0" class="bell__count" aria-hidden="true">
        {{ notifs.unreadCount > 9 ? '9+' : notifs.unreadCount }}
      </span>
    </button>

    <div v-if="open" class="bell__panel" role="dialog" aria-label="Notificaciones">
      <header class="bell__head">
        <h3 class="bell__title">Notificaciones</h3>
        <button
          v-if="notifs.unreadCount > 0"
          class="bell__readall"
          type="button"
          @click="onReadAll"
        >
          Marcar todas como leídas
        </button>
      </header>

      <p v-if="notifs.loading" class="bell__state">Cargando…</p>
      <p v-else-if="notifs.error" class="bell__state bell__state--error" role="alert">
        {{ notifs.error }}
      </p>
      <p v-else-if="notifs.items.length === 0" class="bell__state">
        No tienes notificaciones todavía.
      </p>

      <ul v-else class="bell__list">
        <li
          v-for="n in notifs.items"
          :key="n._id"
          class="bell__item"
          :class="{ 'bell__item--unread': !n.readAt }"
        >
          <button class="bell__item-btn" type="button" @click="onRead(n)">
            <span class="bell__item-top">
              <!-- Punto + etiqueta "Nueva": no depender solo del color -->
              <span v-if="!n.readAt" class="bell__dot" aria-hidden="true"></span>
              <strong class="bell__item-title">{{ n.title }}</strong>
              <small v-if="!n.readAt" class="bell__unread-tag">Nueva</small>
            </span>
            <span class="bell__item-msg">{{ n.message }}</span>
            <span class="bell__item-time">{{ whenLabel(n.createdAt) }}</span>
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.bell {
  position: relative;
}

.bell__btn {
  position: relative;
  display: inline-grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border: 1px solid var(--border);
  border-radius: var(--radius-full);
  background: var(--surface);
  color: var(--text-muted);
  cursor: pointer;
  transition: color var(--motion-fast) ease, border-color var(--motion-fast) ease;
}

.bell__btn:hover {
  color: var(--accent);
  border-color: var(--accent-border);
}

.bell__btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.bell__btn svg {
  width: 20px;
  height: 20px;
}

/* Contador (número sobre fondo danger) */
.bell__count {
  position: absolute;
  top: -6px;
  right: -6px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  display: inline-grid;
  place-items: center;
  font-size: 0.64rem;
  font-weight: 700;
  color: var(--on-solid);
  background: var(--danger);
  border: 2px solid var(--surface);
  border-radius: var(--radius-full);
}

.bell__panel {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 60;
  width: min(340px, calc(100vw - 32px));
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

/* Cuando la campana está en la mitad inferior, el panel abre hacia arriba
   para no salirse del viewport. Además se alinea a la izquierda de la
   campana para que crezca hacia el área de contenido (la barra lateral
   es más estrecha que el panel). */
.bell--up .bell__panel {
  top: auto;
  bottom: calc(100% + 8px);
  right: auto;
  left: 0;
}

.bell__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border-soft);
}

.bell__title {
  font-family: var(--font-display);
  font-size: var(--font-size-sm);
}

.bell__readall {
  font: inherit;
  font-size: var(--font-size-xs);
  background: none;
  border: none;
  color: var(--accent);
  cursor: pointer;
  padding: 0;
}

.bell__readall:hover {
  color: var(--accent-hover);
  text-decoration: underline;
}

.bell__state {
  padding: var(--space-5) var(--space-4);
  font-size: var(--font-size-sm);
  color: var(--text-muted);
  text-align: center;
}

.bell__state--error {
  color: var(--danger);
}

.bell__list {
  max-height: 360px;
  overflow-y: auto;
}

.bell__item {
  border-bottom: 1px solid var(--border-soft);
}

.bell__item:last-child {
  border-bottom: none;
}

.bell__item-btn {
  font: inherit;
  width: 100%;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: var(--space-3) var(--space-4);
  background: none;
  border: none;
  cursor: pointer;
  transition: background-color var(--motion-fast) ease;
}

.bell__item-btn:hover {
  background: var(--surface-2);
}

/* No leída: fondo accent-soft + etiqueta "Nueva" (no solo color) */
.bell__item--unread {
  background: var(--accent-soft);
}

.bell__item-top {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.bell__dot {
  width: 8px;
  height: 8px;
  flex: none;
  border-radius: var(--radius-full);
  background: var(--accent);
}

.bell__item-title {
  font-size: var(--font-size-sm);
  font-weight: 600;
}

.bell__unread-tag {
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--accent);
  background: var(--surface);
  border: 1px solid var(--accent-border);
  border-radius: var(--radius-pill);
  padding: 1px 6px;
}

.bell__item-msg {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  line-height: 1.4;
}

.bell__item-time {
  font-size: 0.64rem;
  color: var(--text-faint);
}
</style>
