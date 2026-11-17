<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { useAppointmentsStore } from '../../stores/appointments'
import { useToastsStore } from '../../stores/toasts'
import { waShareLink } from '../../utils/whatsapp'
import Icon from '../../components/Icon.vue'

const auth = useAuthStore()
const appointments = useAppointmentsStore()
const toast = useToastsStore()

const copied = ref(false)

function toISODate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const todayIso = toISODate(new Date())

onMounted(() => {
  appointments.fetchRange(todayIso, todayIso)
})

const todayAppointments = computed(() => appointments.byDate[todayIso] || [])
const todayPending = computed(
  () => todayAppointments.value.filter((a) => a.status === 'pending').length
)
const todayConfirmed = computed(
  () => todayAppointments.value.filter((a) => a.status === 'confirmed').length
)

const publicLink = computed(() => {
  const slug = auth.profile?.slug
  return slug ? `${window.location.origin}/u/${slug}` : null
})

// Enlace para compartir el perfil y reservas por WhatsApp (selector de chats).
const shareWa = computed(() =>
  waShareLink(
    publicLink.value
      ? `¡Hola! Reserva tu cita conmigo en línea aquí: ${publicLink.value}`
      : ''
  )
)

async function copyLink() {
  if (!publicLink.value) return
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(publicLink.value)
    } else {
      const input = document.createElement('input')
      input.value = publicLink.value
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
    }
    copied.value = true
    toast.success('Enlace copiado', 'Pégalo en WhatsApp o redes para recibir reservas.')
    setTimeout(() => {
      copied.value = false
    }, 2500)
  } catch {
    toast.error('No se pudo copiar', 'Copia el enlace manualmente desde la caja de texto.')
  }
}
</script>

<template>
  <div class="panel-view">
    <h1 class="panel-view__title">Hola, {{ auth.user?.name }}</h1>
    <p class="panel-view__lead">
      Este es tu panel de barbero. Tu agenda, tus clientes y tus cobros vivirán aquí.
    </p>

    <!-- Compartir perfil: la tarjeta principal para captar reservas -->
    <article v-if="publicLink" class="share-card">
      <div class="share-card__badge">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="share-card__badge-icon" aria-hidden="true">
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <polyline points="16 6 12 2 8 6" />
          <line x1="12" y1="2" x2="12" y2="15" />
        </svg>
        <span>Tu enlace de reservas</span>
      </div>

      <div class="share-card__body">
        <h2 class="share-card__title"><Icon name="share" :size="18" /> Compartir perfil</h2>
        <p class="share-card__description">
          Comparte tu enlace directo por WhatsApp, Instagram o redes. Tus clientes entran a tu perfil,
          eligen servicio y fecha, y reservan en segundos sin necesidad de registrarse.
        </p>

        <!-- Caja de enlace con botón rápido de copiado -->
        <div class="share-card__box">
          <input
            class="share-card__input"
            type="text"
            readonly
            :value="publicLink"
            aria-label="Enlace a tu perfil público"
            @focus="$event.target.select()"
          />
          <button
            type="button"
            class="btn btn--primary btn--sm share-card__btn-copy"
            @click="copyLink"
          >
            <svg v-if="!copied" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>{{ copied ? '¡Copiado!' : 'Copiar enlace' }}</span>
          </button>
        </div>

        <div class="share-card__actions">
          <a
            v-if="shareWa"
            class="btn btn--secondary btn--sm share-card__btn-wa"
            :href="shareWa"
            target="_blank"
            rel="noopener"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
            Compartir por WhatsApp
          </a>
          <a class="btn btn--ghost btn--sm" :href="publicLink" target="_blank" rel="noopener">
            Ver mi perfil <Icon name="external" :size="15" />
          </a>
          <RouterLink class="btn btn--ghost btn--sm" :to="{ name: 'barber-onboarding' }">
            <Icon name="pencil" :size="15" /> Editar perfil
          </RouterLink>
        </div>
      </div>
    </article>

    <!-- Estado si aún no tiene perfil completado o slug -->
    <article v-else class="share-card share-card--pending">
      <div class="share-card__body">
        <h2 class="share-card__title"><Icon name="alert" :size="18" /> Activa tu perfil para reservas</h2>
        <p class="share-card__description">
          Aún no has completado la información de tu perfil de barbero. Complétala para generar tu
          enlace personalizado y empezar a compartirlo con tus clientes.
        </p>
        <RouterLink class="btn btn--primary btn--sm" :to="{ name: 'barber-onboarding' }">
          Completar mi perfil <Icon name="arrow-right" :size="15" />
        </RouterLink>
      </div>
    </article>

    <!-- Resumen de citas de hoy -->
    <section class="today-banner">
      <div class="today-banner__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </div>
      <div class="today-banner__body">
        <h3 class="today-banner__title">Citas de hoy</h3>
        <p v-if="todayAppointments.length === 0" class="today-banner__text">
          No tienes citas programadas para hoy. Comparte tu perfil para llenar tu día.
        </p>
        <p v-else class="today-banner__text">
          Tienes <strong>{{ todayAppointments.length }} {{ todayAppointments.length === 1 ? 'cita programada' : 'citas programadas' }}</strong> para hoy
          <span v-if="todayPending > 0" class="today-banner__pending">
            ({{ todayPending }} pendiente{{ todayPending > 1 ? 's' : '' }} por confirmar)
          </span>.
        </p>
      </div>
      <RouterLink class="btn btn--secondary btn--sm today-banner__action" :to="{ name: 'barber-agenda' }">
        Ver agenda de hoy <Icon name="arrow-right" :size="15" />
      </RouterLink>
    </section>

    <div class="panel-view__cards">
      <article class="panel-card">
        <h2 class="panel-card__title"><Icon name="calendar" :size="18" /> Agenda</h2>
        <p class="panel-card__description">
          Aquí llegan las citas que tus clientes reservan solos desde tu perfil. Confirma,
          completa o cancela cada una.
        </p>
        <RouterLink class="panel-card__nav" :to="{ name: 'barber-agenda' }">
          Ver mi agenda <Icon name="arrow-right" :size="15" />
        </RouterLink>
      </article>
      <article class="panel-card">
        <h2 class="panel-card__title"><Icon name="scissors" :size="18" /> Mis servicios</h2>
        <p class="panel-card__description">
          Crea tus servicios, define precios y duración. Son los que se muestran en tu
          perfil para reservar.
        </p>
        <RouterLink class="panel-card__nav" :to="{ name: 'barber-services' }">
          Administrar servicios <Icon name="arrow-right" :size="15" />
        </RouterLink>
      </article>
      <article class="panel-card">
        <h2 class="panel-card__title"><Icon name="clock" :size="18" /> Mis horarios</h2>
        <p class="panel-card__description">
          Configura tus días, bloques de atención y descansos. De aquí salen los
          huecos libres para tus clientes.
        </p>
        <RouterLink class="panel-card__nav" :to="{ name: 'barber-schedule' }">
          Administrar horarios <Icon name="arrow-right" :size="15" />
        </RouterLink>
      </article>
      <article class="panel-card">
        <h2 class="panel-card__title"><Icon name="user" :size="18" /> Clientes</h2>
        <p class="panel-card__description">
          Quien reserva desde tu perfil público se guarda aquí solo, con su teléfono y su historial
          de citas.
        </p>
        <RouterLink class="panel-card__nav" :to="{ name: 'clients' }">
          Ver mis clientes <Icon name="arrow-right" :size="15" />
        </RouterLink>
      </article>
      <article class="panel-card">
        <h2 class="panel-card__title"><Icon name="settings" :size="18" /> Mi perfil</h2>
        <p class="panel-card__description">
          Actualiza tu nombre profesional, foto, descripción bio, teléfono y dirección del local.
        </p>
        <RouterLink class="panel-card__nav" :to="{ name: 'barber-onboarding' }">
          Editar mi perfil <Icon name="arrow-right" :size="15" />
        </RouterLink>
      </article>
      <article class="panel-card">
        <h2 class="panel-card__title"><Icon name="wallet" :size="18" /> Caja</h2>
        <p class="panel-card__description">
          Abre la caja con tu fondo inicial, cobra citas en un clic desde la agenda, registra
          ingresos y egresos, y cierra el día con el cuadre del dinero.
        </p>
        <RouterLink class="panel-card__nav" :to="{ name: 'cash' }">
          Abrir mi caja <Icon name="arrow-right" :size="15" />
        </RouterLink>
      </article>
    </div>
  </div>
</template>

<style scoped>
/* Tarjeta principal: Compartir perfil (captación de reservas). */
.share-card {
  background: var(--surface);
  border: 1px solid var(--accent-border);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  margin-bottom: var(--space-5);
  box-shadow: var(--shadow-sm);
  position: relative;
  overflow: hidden;
}

.share-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, var(--accent), #60a5fa);
}

.share-card--pending {
  border-color: var(--warning-border);
  background: var(--warning-soft);
}

.share-card--pending::before {
  background: var(--warning);
}

.share-card__badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  background: var(--accent-soft);
  color: var(--accent);
  border: 1px solid var(--accent-border);
  border-radius: var(--radius-full);
  padding: 4px var(--space-3);
  font-size: var(--font-size-xs);
  font-weight: 600;
  margin-bottom: var(--space-3);
}

.share-card__badge-icon {
  width: 14px;
  height: 14px;
}

.share-card__title {
  font-size: var(--font-size-md);
  color: var(--text);
  margin-bottom: var(--space-2);
}

.share-card__description {
  color: var(--text-muted);
  font-size: var(--font-size-sm);
  max-width: 680px;
  line-height: 1.5;
  margin-bottom: var(--space-4);
}

/* Caja de enlace con input readonly y botón integrado */
.share-card__box {
  display: flex;
  align-items: stretch;
  gap: var(--space-2);
  max-width: 680px;
  margin-bottom: var(--space-4);
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 4px;
}

.share-card__input {
  flex: 1;
  min-width: 0;
  background: transparent;
  border: none;
  padding: var(--space-2) var(--space-3);
  font-size: var(--font-size-sm);
  color: var(--accent);
  font-family: monospace;
  outline: none;
}

.share-card__input:focus {
  background: var(--surface);
  border-radius: var(--radius-sm);
}

.share-card__btn-copy {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  white-space: nowrap;
}

.share-card__btn-copy svg {
  width: 16px;
  height: 16px;
}

.share-card__actions {
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
  align-items: center;
}

.share-card__btn-wa {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

.share-card__btn-wa svg {
  width: 16px;
  height: 16px;
  color: #25d366;
}

/* Resumen de citas del día */
.today-banner {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--space-4) var(--space-5);
  margin-bottom: var(--space-5);
  box-shadow: var(--shadow-sm);
}

.today-banner__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  background: var(--accent-soft);
  color: var(--accent);
  flex-shrink: 0;
}

.today-banner__icon svg {
  width: 22px;
  height: 22px;
}

.today-banner__body {
  flex: 1;
  min-width: 0;
}

.today-banner__title {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--text);
  margin-bottom: 2px;
}

.today-banner__text {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
}

.today-banner__pending {
  color: var(--warning);
  font-weight: 600;
}

.today-banner__action {
  flex-shrink: 0;
}

@media (max-width: 640px) {
  .today-banner {
    flex-direction: column;
    align-items: flex-start;
  }
  .today-banner__action {
    width: 100%;
    text-align: center;
  }
}

/* Tarjeta de módulo aún no disponible */
.panel-card--soon {
  opacity: 0.72;
  border-style: dashed;
}

.panel-card__nav {
  display: inline-block;
  margin-top: var(--space-3);
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--accent);
}

.panel-card__nav:hover {
  text-decoration: underline;
}

@media (max-width: 580px) {
  .share-card__box {
    flex-direction: column;
  }
  .share-card__btn-copy {
    justify-content: center;
    width: 100%;
  }
}
</style>
