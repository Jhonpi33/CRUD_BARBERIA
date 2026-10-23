<script setup>
import { computed } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { waShareLink } from '../../utils/whatsapp'

const auth = useAuthStore()

const publicLink = computed(() => {
  const slug = auth.profile?.slug
  return slug ? `${window.location.origin}/u/${slug}` : null
})

// Enlace para compartir la agenda por WhatsApp (selector de chats).
const shareWa = computed(() =>
  waShareLink(
    publicLink.value
      ? `Reserva tu cita conmigo en línea: ${publicLink.value}`
      : ''
  )
)
</script>

<template>
  <div class="panel-view">
    <h1 class="panel-view__title">Hola, {{ auth.user?.name }} 👋</h1>
    <p class="panel-view__lead">
      Este es tu panel de barbero. Tu agenda, tus clientes y tus cobros vivirán aquí.
    </p>

    <!-- Tu página: la tarjeta principal. De aquí salen las reservas. -->
    <article v-if="publicLink" class="page-card">
      <div class="page-card__body">
        <h2 class="page-card__title">🌐 Tu página</h2>
        <p class="page-card__description">
          Tus clientes entran a tu página, ven tu perfil y reservan ahí mismo.
          No necesitan cuenta ni contraseña: tú no haces nada, la cita aparece
          sola en tu agenda.
        </p>
        <div class="page-card__actions">
          <a class="btn btn--primary btn--sm" :href="publicLink" target="_blank" rel="noopener">
            Abrir mi página
          </a>
          <a
            v-if="shareWa"
            class="btn btn--secondary btn--sm"
            :href="shareWa"
            target="_blank"
            rel="noopener"
          >
            Compartir por WhatsApp
          </a>
        </div>
        <a class="page-card__url" :href="publicLink" target="_blank" rel="noopener">
          {{ publicLink }}
        </a>
      </div>
    </article>

    <div class="panel-view__cards">
      <article class="panel-card">
        <h2 class="panel-card__title">📅 Agenda</h2>
        <p class="panel-card__description">
          Aquí llegan las citas que tus clientes reservan solos. Confirma,
          completa o cancela cada una.
        </p>
        <RouterLink class="panel-card__nav" :to="{ name: 'barber-agenda' }">
          Ver mi agenda →
        </RouterLink>
      </article>
      <article class="panel-card">
        <h2 class="panel-card__title">✂️ Mis servicios</h2>
        <p class="panel-card__description">
          Crea tus servicios, define precios y duración, actívalos o desactívalos.
          Son los que se muestran en tu página.
        </p>
        <RouterLink class="panel-card__nav" :to="{ name: 'barber-services' }">
          Administrar servicios →
        </RouterLink>
      </article>
      <article class="panel-card">
        <h2 class="panel-card__title">🕒 Mis horarios</h2>
        <p class="panel-card__description">
          Configura tus días, bloques de atención y descansos. De aquí salen los
          huecos que ve tu cliente.
        </p>
        <RouterLink class="panel-card__nav" :to="{ name: 'barber-schedule' }">
          Administrar horarios →
        </RouterLink>
      </article>
      <article class="panel-card panel-card--soon">
        <h2 class="panel-card__title">👤 Clientes</h2>
        <p class="panel-card__description">
          Quien reserva desde tu página se guarda automáticamente como tu cliente,
          con su historial de citas. La ficha completa llega en la próxima fase.
        </p>
      </article>
      <article class="panel-card panel-card--soon">
        <h2 class="panel-card__title">💰 Caja</h2>
        <p class="panel-card__description">
          Registro de cobros y cierre de caja diario, próximamente.
        </p>
      </article>
    </div>
  </div>
</template>

<style scoped>
/* Tarjeta principal: tu página (la fuente de las reservas). */
.page-card {
  background: linear-gradient(135deg, var(--accent-soft), transparent 70%);
  border: 1px solid var(--accent-border);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  margin-bottom: var(--space-5);
}

.page-card__title {
  font-size: var(--font-size-md);
  margin-bottom: var(--space-2);
}

.page-card__description {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
  max-width: 620px;
  margin-bottom: var(--space-4);
}

.page-card__actions {
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
  margin-bottom: var(--space-3);
}

/* La URL a la que se lleva el cliente: se ve, pero sin robar protagonismo. */
.page-card__url {
  display: block;
  font-size: var(--font-size-xs);
  color: var(--color-primary-soft);
  word-break: break-all;
}

/* Tarjeta de módulo aún no disponible: misma caja, sin acción. */
.panel-card--soon {
  opacity: 0.72;
  border-style: dashed;
}

.panel-card__nav {
  display: inline-block;
  margin-top: var(--space-3);
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-primary-soft);
}

.panel-card__nav:hover {
  color: var(--color-primary);
}
</style>
