<script setup>
/*
  Perfil público /u/:slug — lo que ve el cliente cuando le pasan el enlace.

  Dos peticiones públicas (ninguna necesita sesión):
  - /profile/u/:slug  → datos del perfil (nombre, descripción, foto, horario).
  - /public/booking/:slug → servicios activos con precio y duración.
  Si la segunda falla, la página se ve igual pero sin la lista de servicios.

  Estructura pensada por jerarquía: portada (quién es) → acciones (cómo reservar)
  → servicios (qué ofrece) → datos de contacto → CTA fijo en móvil.
*/
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import api from '../services/api'
import Icon from '../components/Icon.vue'
import { waMessageLink } from '../utils/whatsapp'
import { moneyLabel, durationLabel } from '../utils/datetime'

const route = useRoute()

const profile = ref(null)
const services = ref([])
const loading = ref(true)
const error = ref('')

const slug = computed(() => String(route.params.slug || ''))

const displayName = computed(
  () => profile.value?.professionalName || profile.value?.businessName || ''
)

const kindLabel = computed(() =>
  profile.value?.type === 'barber' ? 'Barbero' : 'Barbería'
)

const photoUrl = computed(() => profile.value?.photoUrl || profile.value?.logoUrl || null)

const bookingLink = computed(() => ({
  name: 'public-booking',
  params: { slug: slug.value },
}))

function serviceLink(serviceId) {
  return serviceId
    ? { name: 'public-booking', params: { slug: slug.value }, query: { serviceId } }
    : bookingLink.value
}

/** Enlace de WhatsApp con el mensaje de reserva precargado. */
const waUrl = computed(() => {
  const phone = profile.value?.phone
  if (!phone) return null
  const nombre = displayName.value
  return waMessageLink(
    phone,
    `Hola${nombre ? ` ${nombre}` : ''}, quiero reservar una cita. ¿Qué horarios tienes disponibles?`
  )
})

onMounted(async () => {
  try {
    const [profileRes, bookingRes] = await Promise.all([
      api.get(`/profile/u/${encodeURIComponent(slug.value)}`),
      api.get(`/public/booking/${encodeURIComponent(slug.value)}`).catch(() => null),
    ])
    profile.value = profileRes.data.profile
    services.value = bookingRes?.data?.services || []
  } catch (err) {
    error.value = err?.response?.data?.message || 'No se pudo cargar este perfil.'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="pub">
    <div v-if="loading" class="pub__state" role="status">Cargando perfil…</div>

    <div v-else-if="error" class="pub__state pub__state--error">
      <h1 class="pub__stateTitle">Perfil no disponible</h1>
      <p>{{ error }}</p>
      <RouterLink class="btn btn--secondary" to="/">Volver al inicio</RouterLink>
    </div>

    <article v-else-if="profile" class="pub__page">
      <!-- 1. Portada: quién es -->
      <header class="hero">
        <div class="hero__banner" aria-hidden="true"></div>

        <div class="hero__body">
          <img
            v-if="photoUrl"
            class="hero__photo"
            :src="photoUrl"
            :alt="displayName"
          />
          <div
            v-else
            class="hero__photo hero__photo--placeholder"
            aria-hidden="true"
          >
            <Icon :name="profile.type === 'barber' ? 'scissors' : 'store'" :size="30" />
          </div>

          <span class="hero__kind">{{ kindLabel }}</span>
          <h1 class="hero__name">{{ displayName }}</h1>
          <p v-if="profile.ownerName && profile.type === 'barber'" class="hero__owner">
            Atiende {{ profile.ownerName }}
          </p>

          <ul class="hero__facts">
            <li v-if="profile.location">
              <Icon name="map-pin" :size="16" />
              <span>{{ profile.location }}</span>
            </li>
            <li v-if="profile.phone">
              <Icon name="phone" :size="16" />
              <span>{{ profile.phone }}</span>
            </li>
            <li v-if="profile.settings">
              <Icon name="clock" :size="16" />
              <span>
                {{ profile.settings.openingTime }} – {{ profile.settings.closingTime }}
              </span>
            </li>
          </ul>
        </div>
      </header>

      <!-- 2. Acciones: cómo reservar -->
      <div class="cta">
        <RouterLink class="btn btn--primary cta__main" :to="bookingLink">
          <Icon name="calendar" :size="18" /> Reservar cita en línea
        </RouterLink>
        <a
          v-if="waUrl"
          class="btn btn--secondary cta__main"
          :href="waUrl"
          target="_blank"
          rel="noopener"
        >
          <Icon name="message" :size="18" /> Reservar por WhatsApp
        </a>
      </div>

      <!-- 3. Descripción -->
      <section v-if="profile.description" class="block">
        <h2 class="block__title">Acerca de</h2>
        <p class="block__text">{{ profile.description }}</p>
      </section>

      <!-- 4. Servicios -->
      <section class="block">
        <div class="block__head">
          <h2 class="block__title">Servicios</h2>
          <span class="block__count">{{ services.length }}</span>
        </div>

        <p v-if="services.length === 0" class="block__text">
          Este perfil aún no tiene servicios publicados.
        </p>

        <ul v-else class="svc">
          <li v-for="service in services" :key="service._id" class="svc__item">
            <div class="svc__info">
              <p class="svc__name">{{ service.name }}</p>
              <p v-if="service.description" class="svc__desc">{{ service.description }}</p>
              <p class="svc__meta">
                <Icon name="clock" :size="14" /> {{ durationLabel(service.durationMinutes) }}
              </p>
            </div>

            <div class="svc__buy">
              <span class="svc__price">{{ moneyLabel(service.price) }}</span>
              <RouterLink class="btn btn--secondary btn--sm" :to="serviceLink(service._id)">
                Reservar
              </RouterLink>
            </div>
          </li>
        </ul>
      </section>

      <!-- 5. Horario (barberías) -->
      <section v-if="profile.settings" class="block">
        <div class="block__head">
          <h2 class="block__title">Horario de atención</h2>
        </div>
        <ul class="hero__facts hero__facts--left">
          <li>
            <Icon name="clock" :size="16" />
            <span>
              Todos los días de {{ profile.settings.openingTime }} a
              {{ profile.settings.closingTime }}
            </span>
          </li>
          <li>
            <Icon name="calendar" :size="16" />
            <span>Citas de {{ durationLabel(profile.settings.appointmentDuration) }}</span>
          </li>
        </ul>
      </section>

      <p class="pub__brand">
        Impulsado por <RouterLink to="/">Elysia</RouterLink>
      </p>
    </article>

    <!-- CTA fijo en móvil: acompaña el scroll y se va con la página -->
    <div v-if="!loading && !error && profile" class="dock">
      <RouterLink class="btn btn--primary dock__cta" :to="bookingLink">
        <Icon name="calendar" :size="18" /> Reservar cita
      </RouterLink>
      <a
        v-if="waUrl"
        class="btn btn--secondary dock__wa"
        :href="waUrl"
        target="_blank"
        rel="noopener"
        aria-label="Reservar por WhatsApp"
      >
        <Icon name="message" :size="18" />
      </a>
    </div>
  </div>
</template>

<style scoped>
.pub {
  max-width: 680px;
  margin: 0 auto;
  padding: clamp(24px, 5vw, 48px) var(--space-4) var(--space-5);
}

.pub__state {
  color: var(--text-muted);
  text-align: center;
  padding: var(--space-7) 0;
}

.pub__stateTitle {
  font-size: var(--font-size-lg);
  margin-bottom: var(--space-3);
  color: var(--text);
}

.pub__state .btn {
  margin-top: var(--space-4);
}

/* ---------- 1. Portada ---------- */
.hero {
  background: var(--surface);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-md);
}

.hero__banner {
  height: 112px;
  background: linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 55%, var(--info) 100%);
}

.hero__body {
  padding: 0 var(--space-5) var(--space-5);
  text-align: center;
}

.hero__photo {
  width: 92px;
  height: 92px;
  border-radius: var(--radius-full);
  object-fit: cover;
  margin: -46px auto 0;
  display: block;
  background: var(--surface);
  border: 4px solid var(--surface);
  box-shadow: var(--shadow-sm);
}

.hero__photo--placeholder {
  display: grid;
  place-items: center;
  background: var(--accent-soft);
  color: var(--accent);
}

.hero__kind {
  display: inline-block;
  margin-top: var(--space-3);
  font-size: var(--font-size-xs);
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--accent);
  background: var(--accent-soft);
  border: 1px solid var(--accent-border);
  border-radius: var(--radius-pill);
  padding: 3px 12px;
}

.hero__name {
  font-family: var(--font-display);
  font-size: clamp(1.5rem, 6vw, 2rem);
  line-height: 1.2;
  margin-top: var(--space-3);
}

.hero__owner {
  color: var(--text-muted);
  font-size: var(--font-size-sm);
  margin-top: var(--space-1);
}

.hero__facts {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--space-2);
  margin-top: var(--space-4);
}

.hero__facts--left {
  justify-content: flex-start;
}

.hero__facts li {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  background: var(--surface-2);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-pill);
  padding: 5px 12px;
}

.hero__facts svg {
  color: var(--accent);
  flex: none;
}

/* ---------- 2. Acciones ---------- */
.cta {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-top: var(--space-5);
}

.cta__main {
  justify-content: center;
  width: 100%;
}

/* ---------- Bloques ---------- */
.block {
  margin-top: var(--space-6);
}

.block__head {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.block__title {
  font-family: var(--font-display);
  font-size: var(--font-size-md);
  margin-bottom: var(--space-3);
}

.block__head .block__title {
  margin-bottom: 0;
}

.block__count {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-pill);
  padding: 2px 9px;
}

.block__text {
  color: var(--text-muted);
  font-size: var(--font-size-sm);
  line-height: 1.65;
}

.block__head + .block__text,
.block__head + p {
  margin-top: var(--space-3);
}

/* ---------- Servicios ---------- */
.svc {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-top: var(--space-3);
}

.svc__item {
  display: flex;
  justify-content: space-between;
  gap: var(--space-4);
  background: var(--surface);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-md);
  padding: var(--space-4);
}

.svc__info {
  min-width: 0;
}

.svc__name {
  font-weight: 600;
}

.svc__desc {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
  margin-top: 2px;
}

.svc__meta {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: var(--font-size-xs);
  color: var(--accent);
  margin-top: var(--space-2);
}

.svc__buy {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--space-2);
  flex: none;
}

.svc__price {
  font-weight: 700;
  font-family: var(--font-display);
  white-space: nowrap;
}

/* ---------- Marca ---------- */
.pub__brand {
  margin-top: var(--space-7);
  text-align: center;
  font-size: var(--font-size-xs);
  color: var(--text-muted);
}

.pub__brand a {
  color: var(--accent);
}

/* ---------- CTA fijo (móvil) ---------- */
.dock {
  display: none;
  position: sticky;
  bottom: var(--space-3);
  z-index: 20;
  gap: var(--space-2);
  padding: var(--space-3);
  margin-top: var(--space-5);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
}

.dock__cta {
  flex: 1;
  justify-content: center;
}

.dock__wa {
  flex: none;
}

@media (max-width: 768px) {
  .dock {
    display: flex;
  }
}

@media (max-width: 480px) {
  .svc__item {
    flex-direction: column;
    gap: var(--space-3);
  }

  .svc__buy {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    width: 100%;
  }
}
</style>
