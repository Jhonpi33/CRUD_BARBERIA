<script setup>
/*
  Directorio de clientes del panel.

  Los clientes se crean SOLOS cuando alguien reserva desde la página pública
  (el backend los deduplica por teléfono), por eso no hay formulario de alta:
  solo lectura, búsqueda y ficha.

  El backend trae en cada cliente un bloque `stats` (visitas, gasto total,
  última visita y próxima cita) calculado en UNA sola agregación, así la
  lista se pinta con datos reales sin una petición por cliente.
*/
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { useClientsStore } from '../../stores/clients'
import Icon from '../../components/Icon.vue'
import { waLink } from '../../utils/whatsapp'
import { moneyLabel, relativeDate, shortDate, timeOf } from '../../utils/datetime'

const auth = useAuthStore()
const store = useClientsStore()

const search = ref('')

onMounted(() => {
  store.fetchClients()
})

/** Lista filtrada por la búsqueda (el filtro vive en el store). */
const visible = computed(() => store.filtered)

function onSearch() {
  store.setQuery(search.value)
}

function phoneLabel(client) {
  return client.phone || client.phoneNormalized
}

/** Stats con valores por defecto por si el backend viene de una versión vieja. */
function stats(client) {
  return (
    client.stats || { total: 0, visits: 0, spent: 0, lastVisit: null, nextVisit: null }
  )
}

/** Nivel del cliente según visitas completadas (mismo criterio que su ficha). */
function level(client) {
  const n = stats(client).visits
  if (n >= 6) return { label: 'Cliente fiel', cls: 'loyal' }
  if (n >= 2) return { label: 'Habitual', cls: 'regular' }
  return { label: 'Nuevo', cls: 'new' }
}

function lastVisitLabel(client) {
  const last = stats(client).lastVisit
  return last ? relativeDate(last) : 'Sin visitas'
}

function nextVisitLabel(client) {
  const next = stats(client).nextVisit
  if (!next) return 'Sin citas'
  return `${shortDate(next)} · ${timeOf(next)}`
}

/** Resumen general del directorio (franja superior). */
const summary = computed(() => {
  const list = store.list
  return {
    total: list.length,
    visits: list.reduce((sum, c) => sum + (stats(c).visits || 0), 0),
    withNext: list.filter((c) => stats(c).nextVisit).length,
    spent: list.reduce((sum, c) => sum + (stats(c).spent || 0), 0),
  }
})
</script>

<template>
  <div class="clients">
    <header class="clients__header">
      <div>
        <h1 class="clients__title">Mis clientes</h1>
        <p class="clients__lead">
          Quien reserva desde tu perfil público se guarda aquí automáticamente, con su teléfono y su
          historial de citas. No hace falta que los registres tú.
        </p>
      </div>
      <RouterLink class="btn btn--secondary btn--sm" :to="auth.panelPath">
        <Icon name="arrow-left" :size="16" /> Volver al panel
      </RouterLink>
    </header>

    <p v-if="store.loading" class="clients__state">Cargando clientes…</p>

    <template v-else>
      <p v-if="store.error" class="form__error" role="alert">{{ store.error }}</p>

      <!-- Resumen del directorio -->
      <section v-if="summary.total" class="csummary">
        <div class="csummary__item">
          <span class="csummary__icon"><Icon name="users" :size="16" /></span>
          <span><strong>{{ summary.total }}</strong> clientes</span>
        </div>
        <div class="csummary__item">
          <span class="csummary__icon"><Icon name="check-circle" :size="16" /></span>
          <span><strong>{{ summary.visits }}</strong> visitas</span>
        </div>
        <div class="csummary__item">
          <span class="csummary__icon"><Icon name="calendar" :size="16" /></span>
          <span><strong>{{ summary.withNext }}</strong> con cita próxima</span>
        </div>
        <div class="csummary__item">
          <span class="csummary__icon"><Icon name="money" :size="16" /></span>
          <span><strong>{{ moneyLabel(summary.spent) }}</strong> facturado</span>
        </div>
      </section>

      <!-- Búsqueda -->
      <section class="clients__toolbar">
        <label class="form__field clients__search">
          <span class="form__label">Buscar</span>
          <span class="clients__searchbox">
            <Icon name="search" :size="16" />
            <input
              v-model="search"
              class="form__input"
              type="search"
              placeholder="Nombre o teléfono"
              autocomplete="off"
              @input="onSearch"
            />
          </span>
        </label>
        <p class="clients__count">
          {{ visible.length }}
          {{ visible.length === 1 ? 'cliente' : 'clientes' }}
        </p>
      </section>

      <!-- Lista vacía: explica de dónde salen -->
      <div v-if="store.list.length === 0" class="empty-state">
        <span class="empty-state__icon" aria-hidden="true">
          <Icon name="users" :size="38" />
        </span>
        <p class="empty-state__title">Aún no tienes clientes</p>
        <p class="empty-state__text">
          Aparecen solos en cuanto alguien reserve desde tu perfil público. Comparte tu perfil para
          que empiecen a llegar.
        </p>
        <RouterLink
          v-if="auth.profile?.slug"
          class="btn btn--primary btn--sm"
          :to="{ name: 'public-profile', params: { slug: auth.profile.slug } }"
        >
          Ver mi perfil
        </RouterLink>
      </div>

      <!-- Sin resultados para la búsqueda -->
      <p v-else-if="visible.length === 0" class="clients__state">
        Ningún cliente coincide con "{{ search }}".
      </p>

      <!-- Listado en tarjetas -->
      <ul v-else class="clients__grid">
        <li v-for="client in visible" :key="client._id" class="ccard">
          <RouterLink
            class="ccard__link"
            :to="{ name: 'client-detail', params: { id: client._id } }"
          >
            <div class="ccard__top">
              <span
                class="ccard__avatar"
                :class="`ccard__avatar--${level(client).cls}`"
                aria-hidden="true"
              >
                {{ (client.name || '?').charAt(0).toUpperCase() }}
              </span>
              <span class="ccard__id">
                <span class="ccard__name">{{ client.name }}</span>
                <span class="ccard__phone">
                  <Icon name="phone" :size="14" /> {{ phoneLabel(client) }}
                </span>
              </span>
              <span class="ccard__level" :class="`ccard__level--${level(client).cls}`">
                <Icon name="star" :size="12" /> {{ level(client).label }}
              </span>
            </div>

            <dl class="ccard__stats">
              <div class="ccard__stat">
                <dt><Icon name="check-circle" :size="13" /> Visitas</dt>
                <dd>{{ stats(client).visits }}</dd>
              </div>
              <div class="ccard__stat">
                <dt><Icon name="clock" :size="13" /> Última</dt>
                <dd>{{ lastVisitLabel(client) }}</dd>
              </div>
              <div class="ccard__stat" :class="{ 'ccard__stat--muted': !stats(client).nextVisit }">
                <dt><Icon name="calendar" :size="13" /> Próxima</dt>
                <dd>{{ nextVisitLabel(client) }}</dd>
              </div>
              <div class="ccard__stat">
                <dt><Icon name="money" :size="13" /> Gastado</dt>
                <dd>{{ moneyLabel(stats(client).spent) }}</dd>
              </div>
            </dl>
          </RouterLink>

          <div class="ccard__footer">
            <span class="ccard__cta">
              Ver ficha <Icon name="arrow-right" :size="14" />
            </span>
            <a
              v-if="waLink(client.phone)"
              class="ccard__wa"
              :href="waLink(client.phone)"
              target="_blank"
              rel="noopener"
              title="Escribir por WhatsApp"
              @click.stop
            >
              <Icon name="message" :size="16" />
            </a>
          </div>
        </li>
      </ul>
    </template>
  </div>
</template>

<style scoped>
.clients__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-4);
  flex-wrap: wrap;
  margin-bottom: var(--space-5);
}

.clients__title {
  font-size: clamp(1.3rem, 4vw, 1.8rem);
  margin-bottom: var(--space-2);
}

.clients__lead {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
  max-width: 620px;
}

.clients__state {
  color: var(--color-text-muted);
  text-align: center;
  padding: var(--space-6) 0;
}

/* ---------- Resumen del directorio ---------- */
.csummary {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
}

.csummary__item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  background: var(--color-surface);
  border: 1px solid var(--color-border-soft);
  border-radius: var(--radius-pill);
  padding: 6px 14px;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.csummary__item strong {
  color: var(--color-text);
  font-variant-numeric: tabular-nums;
}

.csummary__icon {
  display: inline-grid;
  place-items: center;
  color: var(--accent);
}

/* ---------- Toolbar / búsqueda ---------- */
.clients__toolbar {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-4);
  flex-wrap: wrap;
  background: var(--color-surface);
  border: 1px solid var(--color-border-soft);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  margin-bottom: var(--space-4);
}

.clients__search {
  flex: 1;
  min-width: 220px;
}

.clients__searchbox {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 0 var(--space-3);
  color: var(--color-text-muted);
  transition: border-color var(--motion-fast) ease;
}

.clients__searchbox:focus-within {
  border-color: var(--color-primary);
}

.clients__searchbox .form__input {
  border: 0;
  background: transparent;
  padding: 10px 0;
  flex: 1;
  min-width: 0;
}

.clients__searchbox .form__input:focus {
  outline: none;
  box-shadow: none;
}

.clients__count {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  padding-bottom: 10px;
  font-variant-numeric: tabular-nums;
}

/* ---------- Tarjetas de cliente ---------- */
.clients__grid {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--space-4);
}

.ccard {
  position: relative;
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
  border: 1px solid var(--color-border-soft);
  border-radius: var(--radius-md);
  overflow: hidden;
  transition:
    border-color var(--motion-fast) ease,
    box-shadow var(--motion-fast) ease,
    transform var(--motion-fast) ease;
}

.ccard:hover {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-sm);
  transform: translateY(-2px);
}

/* Toda la tarjeta es clicable; el pie queda encima para el botón de WhatsApp */
.ccard__link {
  display: block;
  padding: var(--space-4);
  text-decoration: none;
  color: inherit;
}

.ccard__link::after {
  content: '';
  position: absolute;
  inset: 0;
}

.ccard__top {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}

.ccard__avatar {
  flex: none;
  width: 46px;
  height: 46px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-full);
  font-weight: 700;
  font-size: var(--font-size-md);
}

.ccard__avatar--new {
  background: var(--info-soft);
  color: var(--info);
}

.ccard__avatar--regular {
  background: var(--accent-soft);
  color: var(--accent);
}

.ccard__avatar--loyal {
  background: var(--warning-soft);
  color: var(--warning);
}

.ccard__id {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ccard__name {
  font-weight: 700;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ccard__phone {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Nivel de fidelidad */
.ccard__level {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--font-size-xs);
  font-weight: 700;
  padding: 3px 9px;
  border-radius: var(--radius-pill);
  border: 1px solid transparent;
  white-space: nowrap;
}

.ccard__level--new {
  color: var(--info);
  background: var(--info-soft);
  border-color: var(--info-border);
}

.ccard__level--regular {
  color: var(--accent);
  background: var(--accent-soft);
  border-color: var(--accent-border);
}

.ccard__level--loyal {
  color: var(--warning);
  background: var(--warning-soft);
  border-color: var(--warning-border);
}

/* Métricas de la tarjeta */
.ccard__stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
  margin: 0;
  padding: var(--space-3);
  background: var(--surface-2);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-md);
}

.ccard__stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.ccard__stat dt {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

.ccard__stat dd {
  margin: 0;
  font-size: var(--font-size-sm);
  font-weight: 700;
  color: var(--color-text);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ccard__stat--muted dd {
  color: var(--color-text-muted);
  font-weight: 500;
}

/* Pie de la tarjeta */
.ccard__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  border-top: 1px solid var(--color-border-soft);
}

.ccard__cta {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: var(--font-size-sm);
  font-weight: 700;
  color: var(--color-primary);
}

.ccard__wa {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: var(--radius-full);
  background: rgba(37, 211, 102, 0.12);
  color: #15803d;
  border: 1px solid rgba(37, 211, 102, 0.35);
  transition: background var(--motion-fast) ease, color var(--motion-fast) ease;
}

.ccard__wa:hover {
  background: #25d366;
  color: #ffffff;
}

@media (max-width: 560px) {
  .clients__grid {
    grid-template-columns: 1fr;
  }
}
</style>
