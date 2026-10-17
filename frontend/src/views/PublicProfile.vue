<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import api from '../services/api'

const route = useRoute()

const profile = ref(null)
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    const { data } = await api.get(`/profile/u/${encodeURIComponent(route.params.slug)}`)
    profile.value = data.profile
  } catch (err) {
    error.value =
      err?.response?.data?.message || 'No se pudo cargar este perfil.'
  } finally {
    loading.value = false
  }
})

function waLink(phone) {
  const digits = String(phone).replace(/[^\d]/g, '')
  return digits ? `https://wa.me/${digits}` : null
}
</script>

<template>
  <div class="pub">
    <div v-if="loading" class="pub__state">Cargando perfil…</div>

    <div v-else-if="error" class="pub__state pub__state--error">
      <h1 class="pub__title">Perfil no disponible</h1>
      <p>{{ error }}</p>
      <RouterLink class="btn btn--secondary" to="/">Volver al inicio</RouterLink>
    </div>

    <article v-else-if="profile" class="pub__card">
      <img
        v-if="profile.photoUrl || profile.logoUrl"
        class="pub__photo"
        :src="profile.photoUrl || profile.logoUrl"
        :alt="profile.professionalName || profile.businessName"
      />
      <div v-else class="pub__photo pub__photo--placeholder" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </div>

      <p class="pub__type">{{ profile.type === 'barber' ? 'Barbero' : 'Barbería' }}</p>
      <h1 class="pub__title">{{ profile.professionalName || profile.businessName }}</h1>
      <p v-if="profile.ownerName && profile.type === 'barber'" class="pub__owner">
        Atiende {{ profile.ownerName }}
      </p>

      <p v-if="profile.description" class="pub__desc">{{ profile.description }}</p>

      <ul class="pub__meta">
        <li v-if="profile.location">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          <span>{{ profile.location }}</span>
        </li>
        <li v-if="profile.phone">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          <span>{{ profile.phone }}</span>
        </li>
        <li v-if="profile.settings">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          <span>
            {{ profile.settings.openingTime }} – {{ profile.settings.closingTime }}
            · citas de {{ profile.settings.appointmentDuration }} min
          </span>
        </li>
      </ul>

      <RouterLink
        class="btn btn--primary pub__cta"
        :to="{ name: 'public-booking', params: { slug: route.params.slug } }"
      >
        Reservar cita en línea
      </RouterLink>

      <a
        v-if="waLink(profile.phone)"
        class="btn btn--secondary pub__cta pub__cta--wa"
        :href="waLink(profile.phone)"
        target="_blank"
        rel="noopener"
      >
        Reservar por WhatsApp
      </a>

      <p class="pub__brand">Impulsado por <RouterLink to="/">Elysia</RouterLink></p>
    </article>
  </div>
</template>

<style scoped>
.pub {
  max-width: 560px;
  margin: 0 auto;
  padding: clamp(32px, 6vw, 64px) var(--space-4);
  text-align: center;
}

.pub__state {
  color: var(--text-muted);
}

.pub__state--error .pub__title {
  margin-bottom: var(--space-3);
}

.pub__state .btn {
  margin-top: var(--space-4);
}

.pub__card {
  background: var(--surface);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-lg);
  padding: clamp(24px, 5vw, 40px);
  box-shadow: var(--shadow-md);
}

.pub__photo {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  object-fit: cover;
  margin: 0 auto var(--space-4);
  border: 3px solid var(--accent-soft);
  box-shadow: 0 0 0 1px var(--accent-border);
}

.pub__photo--placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--accent-soft);
  color: var(--accent);
}

.pub__photo--placeholder svg {
  width: 40px;
  height: 40px;
}

.pub__type {
  display: inline-block;
  font-size: var(--font-size-xs);
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--accent);
  background: var(--accent-soft);
  border: 1px solid var(--accent-border);
  border-radius: var(--radius-pill);
  padding: 4px 12px;
  margin-bottom: var(--space-3);
}

.pub__title {
  font-size: var(--font-size-xl);
  margin-bottom: var(--space-2);
}

.pub__owner {
  color: var(--text-muted);
  font-size: var(--font-size-sm);
  margin-bottom: var(--space-3);
}

.pub__desc {
  color: var(--text-muted);
  font-size: var(--font-size-sm);
  margin-bottom: var(--space-5);
}

.pub__meta {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  font-size: var(--font-size-sm);
  margin-bottom: var(--space-6);
  text-align: left;
  max-width: 320px;
  margin-left: auto;
  margin-right: auto;
}

.pub__meta li {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  color: var(--text-muted);
}

.pub__meta svg {
  width: 18px;
  height: 18px;
  flex: none;
  color: var(--accent);
}

.pub__cta {
  width: 100%;
}

.pub__cta--wa {
  margin-top: var(--space-3);
}

.pub__brand {
  margin-top: var(--space-5);
  font-size: var(--font-size-xs);
  color: var(--text-muted);
}

.pub__brand a {
  color: var(--accent);
}
</style>
