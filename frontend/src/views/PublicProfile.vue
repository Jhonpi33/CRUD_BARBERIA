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
      <div v-else class="pub__photo pub__photo--placeholder" aria-hidden="true">💈</div>

      <p class="pub__type">{{ profile.type === 'barber' ? 'Barbero' : 'Barbería' }}</p>
      <h1 class="pub__title">{{ profile.professionalName || profile.businessName }}</h1>
      <p v-if="profile.ownerName && profile.type === 'barber'" class="pub__owner">
        Atiende {{ profile.ownerName }}
      </p>

      <p v-if="profile.description" class="pub__desc">{{ profile.description }}</p>

      <ul class="pub__meta">
        <li v-if="profile.location">📍 {{ profile.location }}</li>
        <li v-if="profile.phone">📞 {{ profile.phone }}</li>
        <li v-if="profile.settings">
          🕘 {{ profile.settings.openingTime }} – {{ profile.settings.closingTime }}
          · citas de {{ profile.settings.appointmentDuration }} min
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
  padding: var(--space-7) var(--space-4);
  text-align: center;
}

.pub__state {
  color: var(--color-text-muted);
}

.pub__state--error .pub__title {
  margin-bottom: var(--space-3);
}

.pub__state .btn {
  margin-top: var(--space-4);
}

.pub__card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  box-shadow: var(--shadow-md);
}

.pub__photo {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  object-fit: cover;
  margin: 0 auto var(--space-4);
  border: 2px solid var(--color-primary);
}

.pub__photo--placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.2rem;
  background: var(--color-surface-2);
}

.pub__type {
  font-size: var(--font-size-xs);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-primary-soft);
  margin-bottom: var(--space-2);
}

.pub__title {
  font-size: var(--font-size-xl);
  margin-bottom: var(--space-2);
}

.pub__owner {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
  margin-bottom: var(--space-3);
}

.pub__desc {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
  margin-bottom: var(--space-5);
}

.pub__meta {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  font-size: var(--font-size-sm);
  margin-bottom: var(--space-5);
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
  color: var(--color-text-muted);
}

.pub__brand a {
  color: var(--color-primary-soft);
}
</style>
