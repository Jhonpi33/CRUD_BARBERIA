<script setup>
/*
  Caja del barbero: sesión con apertura (fondo inicial), registro de
  ingresos/egresos y cierre con cuadre (conteo real vs. esperado).

  Todo el cálculo del saldo lo hace el backend; aquí solo se pinta la
  respuesta y se envían los datos que escribe el barbero. Los cobros de
  citas hechos desde la Agenda aparecen aquí como ingresos vinculados.
*/
import { ref, computed, onMounted } from 'vue'
import { useCashStore } from '../../stores/cash'
import { useToastsStore } from '../../stores/toasts'
import Icon from '../../components/Icon.vue'

const store = useCashStore()
const toast = useToastsStore()

const METHOD_LABELS = { cash: 'Efectivo', transfer: 'Transferencia', card: 'Tarjeta' }

/** Fecha local -> 'YYYY-MM-DD' (nunca toISOString: corre en UTC). */
function toISODate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDays(iso, n) {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + n)
  return toISODate(date)
}

const today = toISODate(new Date())

onMounted(async () => {
  await store.fetchCurrent(true)
  // Últimos 30 días de sesiones para el historial/cuadres.
  await store.fetchHistory({ from: addDays(today, -29), to: today })
})

const isOpen = computed(() => Boolean(store.session))

/** Formato de dinero (COP sin decimales, como en toda la app). */
function priceLabel(value) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)
}

/** '2026-10-23' -> 'vie 23 oct 2026' */
const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const DAYS_SHORT = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
function dayLabel(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || '')) return iso || ''
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return `${DAYS_SHORT[date.getDay()]} ${d} ${MONTHS_SHORT[m - 1]} ${y}`
}

/** '2026-10-23T15:04:00Z' -> '3:04 p. m.' (hora local del dispositivo). */
function timeLabel(isoDate) {
  if (!isoDate) return ''
  return new Date(isoDate).toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Convierte el texto del input a número con máx. 2 decimales (o null). */
function parseMoney(raw) {
  const s = String(raw ?? '').trim().replace(/\s+/g, '')
  if (!s) return null
  const n = Number(s)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * 100) / 100
}

/** Movimientos más recientes primero. */
const recentMovements = computed(() => [...store.movements].reverse())

/* ---------------- Apertura de caja ---------------- */
const openingBalance = ref('')
const openingNote = ref('')

async function openBox() {
  const value = parseMoney(openingBalance.value)
  if (value === null) {
    toast.error('Fondo inicial inválido', 'Escribe un número igual o mayor que cero.')
    return
  }
  try {
    await store.openCash({ openingBalance: value, note: openingNote.value.trim() })
    openingBalance.value = ''
    openingNote.value = ''
    toast.success('Caja abierta', `Fondo inicial: ${priceLabel(value)}`)
    await store.fetchHistory({ from: addDays(today, -29), to: today })
  } catch {
    toast.error('No se pudo abrir la caja', store.error)
  }
}

/* ---------------- Registro de movimientos ---------------- */
const movType = ref('income')
const movAmount = ref('')
const movConcept = ref('')
const movMethod = ref('cash')

async function addMovement() {
  const amount = parseMoney(movAmount.value)
  if (amount === null || amount <= 0) {
    toast.error('Valor inválido', 'Escribe un valor mayor que cero.')
    return
  }
  const concept = movConcept.value.trim()
  if (concept.length < 2) {
    toast.error('Concepto requerido', 'Describe de qué es este movimiento (mín. 2 letras).')
    return
  }

  try {
    await store.addMovement({
      type: movType.value,
      amount,
      concept,
      method: movMethod.value,
    })
    toast.success(
      movType.value === 'income' ? 'Ingreso registrado' : 'Egreso registrado',
      `${concept} · ${priceLabel(amount)}`
    )
    movAmount.value = ''
    movConcept.value = ''
  } catch {
    toast.error('No se pudo registrar', store.error)
  }
}

async function removeMovement(movement) {
  const ok = window.confirm(
    `¿Eliminar "${movement.concept}" de ${priceLabel(movement.amount)}? Esta acción solo está disponible mientras la caja siga abierta.`
  )
  if (!ok) return
  try {
    await store.removeMovement(movement._id)
    toast.info('Registro eliminado', 'El saldo se recalculó con los movimientos restantes.')
  } catch {
    toast.error('No se pudo eliminar', store.error)
  }
}

/* ---------------- Cierre y cuadre ---------------- */
const showCloseForm = ref(false)
const closingBalance = ref('')
const closingNote = ref('')

/** Vista previa del cuadre: positivo = sobró, negativo = faltó. */
const closePreview = computed(() => {
  const counted = parseMoney(closingBalance.value)
  if (counted === null) return null
  return Math.round((counted - store.totals.expected) * 100) / 100
})

async function closeBox() {
  const counted = parseMoney(closingBalance.value)
  if (counted === null) {
    toast.error('Conteo inválido', 'Cuenta el dinero en caja y escribe ese valor.')
    return
  }

  try {
    // El backend devuelve la sesión ya cuadrada (diferencia calculada
    // con los totales ANTES de cerrar): no dependemos del store aquí.
    const closed = await store.closeCash({ closingBalance: counted, note: closingNote.value.trim() })
    const diff = closed?.difference ?? 0
    showCloseForm.value = false
    closingBalance.value = ''
    closingNote.value = ''
    toast.success(
      'Caja cerrada',
      diff === 0
        ? 'Cuadre perfecto: el conteo coincide con los registros.'
        : diff > 0
          ? `Sobraron ${priceLabel(diff)} respecto a los registros.`
          : `Faltaron ${priceLabel(Math.abs(diff))} respecto a los registros.`
    )
    await store.fetchHistory({ from: addDays(today, -29), to: today })
  } catch {
    toast.error('No se pudo cerrar la caja', store.error)
  }
}
</script>

<template>
  <div class="panel-view cash">
    <header class="cash__header">
      <div>
        <h1 class="panel-view__title"><Icon name="wallet" :size="22" /> Caja</h1>
        <p class="panel-view__lead">
          Abre con tu fondo inicial, registra ingresos y egresos del día, cobra desde la agenda
          y cierra con el conteo real para cuadrar.
        </p>
      </div>
      <span
        class="cash__status"
        :class="isOpen ? 'cash__status--on' : 'cash__status--off'"
        aria-live="polite"
      >
        <Icon :name="isOpen ? 'dot' : 'circle'" :size="12" />
        {{ isOpen ? 'Caja abierta' : 'Caja cerrada' }}
      </span>
    </header>

    <p v-if="store.loading" class="cash__state">Cargando caja…</p>

    <template v-else>
      <p v-if="store.error" class="form__error" role="alert">{{ store.error }}</p>

      <!-- Resumen del dinero -->
      <section class="cash__summary">
        <div class="cash__balance">
          <span class="cash__balance-label">
            {{ isOpen ? 'Saldo esperado en caja' : 'Saldo de la última sesión' }}
          </span>
          <strong class="cash__balance-value">{{ priceLabel(store.totals.expected) }}</strong>
          <span v-if="isOpen" class="cash__balance-hint">
            {{ store.totals.count }} movimiento{{ store.totals.count === 1 ? '' : 's' }} registrado{{ store.totals.count === 1 ? '' : 's' }}
          </span>
        </div>
        <div class="cash__kpis">
          <div class="cash__kpi">
            <strong class="cash__kpi-value cash__kpi-value--in">+ {{ priceLabel(store.totals.income) }}</strong>
            <span class="cash__kpi-label">Ingresos</span>
          </div>
          <div class="cash__kpi">
            <strong class="cash__kpi-value cash__kpi-value--out">− {{ priceLabel(store.totals.expense) }}</strong>
            <span class="cash__kpi-label">Egresos</span>
          </div>
          <div class="cash__kpi">
            <strong class="cash__kpi-value">{{ priceLabel(store.session?.openingBalance ?? 0) }}</strong>
            <span class="cash__kpi-label">Fondo inicial</span>
          </div>
        </div>
      </section>

      <!-- Último cuadre (tras cerrar) -->
      <section v-if="!isOpen && store.lastClosed" class="cash__card cash__card--result">
        <h2 class="cash__subtitle">Cuadre de la última caja</h2>
        <ul class="cash__result">
          <li><span>Contado por ti</span><strong>{{ priceLabel(store.lastClosed.closingBalance) }}</strong></li>
          <li><span>Esperado según registros</span><strong>{{ priceLabel(store.lastClosed.expectedBalance) }}</strong></li>
          <li
            class="cash__result-diff"
            :class="{
              'cash__result-diff--ok': store.lastClosed.difference === 0,
              'cash__result-diff--over': store.lastClosed.difference > 0,
              'cash__result-diff--short': store.lastClosed.difference < 0,
            }"
          >
            <span>Diferencia</span>
            <strong>
              {{ store.lastClosed.difference === 0 ? 'Cuadró perfecto'
                : store.lastClosed.difference > 0 ? 'Sobró ' + priceLabel(store.lastClosed.difference)
                : 'Faltó ' + priceLabel(Math.abs(store.lastClosed.difference)) }}
              <Icon v-if="store.lastClosed.difference === 0" name="check" :size="14" />
            </strong>
          </li>
          <li v-if="store.lastClosed.closingNote"><span>Nota de cierre</span><strong>{{ store.lastClosed.closingNote }}</strong></li>
        </ul>
      </section>

      <!-- Apertura (caja cerrada) -->
      <section v-if="!isOpen" class="cash__card">
        <h2 class="cash__subtitle">Abrir caja de hoy</h2>
        <form class="cash__form" novalidate @submit.prevent="openBox">
          <div class="form__field">
            <label class="form__label" for="cash-opening">Fondo inicial (COP)</label>
            <input
              id="cash-opening"
              v-model="openingBalance"
              class="form__input"
              type="number"
              inputmode="decimal"
              min="0"
              step="0.01"
              placeholder="0"
            />
            <p class="input-hint">Dinero con el que inicias el día (puede ser 0).</p>
          </div>
          <div class="form__field">
            <label class="form__label" for="cash-opening-note">Nota (opcional)</label>
            <input
              id="cash-opening-note"
              v-model="openingNote"
              class="form__input"
              type="text"
              maxlength="200"
              placeholder="Ej. Cajero turno mañana"
            />
          </div>
          <button class="btn btn--primary" type="submit" :disabled="store.saving">
            <template v-if="store.saving">Abriendo…</template>
            <template v-else><Icon name="unlock" :size="16" /> Abrir caja</template>
          </button>
        </form>
      </section>

      <!-- Sesión abierta -->
      <template v-else>
        <!-- Registrar movimiento -->
        <section class="cash__card">
          <h2 class="cash__subtitle">Registrar movimiento</h2>
          <form class="cash__form cash__form--grid" novalidate @submit.prevent="addMovement">
            <div class="form__field">
              <span class="form__label">Tipo</span>
              <div class="cash__toggle" role="group" aria-label="Tipo de movimiento">
                <button
                  type="button"
                  class="cash__toggle-btn"
                  :class="{ 'cash__toggle-btn--on': movType === 'income' }"
                  :aria-pressed="movType === 'income'"
                  @click="movType = 'income'"
                >
                  <Icon name="arrow-up" :size="15" /> Ingreso
                </button>
                <button
                  type="button"
                  class="cash__toggle-btn"
                  :class="{ 'cash__toggle-btn--on': movType === 'expense' }"
                  :aria-pressed="movType === 'expense'"
                  @click="movType = 'expense'"
                >
                  <Icon name="arrow-down" :size="15" /> Egreso
                </button>
              </div>
            </div>

            <div class="form__field">
              <label class="form__label" for="cash-amount">Valor (COP)</label>
              <input
                id="cash-amount"
                v-model="movAmount"
                class="form__input"
                type="number"
                inputmode="decimal"
                min="0.01"
                step="0.01"
                placeholder="0"
                required
              />
            </div>

            <div class="form__field">
              <label class="form__label" for="cash-concept">Concepto</label>
              <input
                id="cash-concept"
                v-model="movConcept"
                class="form__input"
                type="text"
                maxlength="140"
                placeholder="Ej. Alquiler local, compra de toallas…"
                required
              />
            </div>

            <div class="form__field">
              <label class="form__label" for="cash-method">Medio de pago</label>
              <select id="cash-method" v-model="movMethod" class="form__input">
                <option value="cash">Efectivo</option>
                <option value="transfer">Transferencia</option>
                <option value="card">Tarjeta</option>
              </select>
            </div>

            <button class="btn btn--primary cash__submit" type="submit" :disabled="store.saving">
              {{ store.saving ? 'Registrando…' : '＋ Registrar' }}
            </button>
          </form>
        </section>

        <!-- Movimientos del día -->
        <section class="cash__card">
          <div class="cash__card-head">
            <h2 class="cash__subtitle">Movimientos de la sesión</h2>
            <span class="cash__count">{{ store.movements.length }}</span>
          </div>

          <p v-if="store.movements.length === 0" class="cash__empty">
            Sin movimientos todavía. Cobra una cita desde la agenda o registra un ingreso/egreso aquí.
          </p>

          <ul v-else class="cash__list">
            <li v-for="m in recentMovements" :key="m._id" class="cash__move" :class="`cash__move--${m.type}`">
              <span class="cash__move-sign" aria-hidden="true">
                <Icon :name="m.type === 'income' ? 'arrow-up' : 'arrow-down'" :size="15" />
              </span>
              <div class="cash__move-body">
                <p class="cash__move-concept">
                  {{ m.concept }}
                  <span class="cash__move-method">{{ METHOD_LABELS[m.method] || m.method }}</span>
                </p>
                <p class="cash__move-meta">
                  {{ timeLabel(m.createdAt) }}
                  <span v-if="m.appointment" class="cash__move-from"><Icon name="link" :size="13" /> Cobro de cita</span>
                </p>
              </div>
              <strong class="cash__move-amount">
                {{ m.type === 'income' ? '+' : '−' }} {{ priceLabel(m.amount) }}
              </strong>
              <button
                class="cash__move-del"
                type="button"
                title="Eliminar registro"
                aria-label="Eliminar registro"
                :disabled="store.saving"
                @click="removeMovement(m)"
              >
                <Icon name="trash" :size="16" />
              </button>
            </li>
          </ul>
        </section>

        <!-- Cierre -->
        <section class="cash__card">
          <template v-if="!showCloseForm">
            <div class="cash__card-head">
              <h2 class="cash__subtitle">Cerrar y cuadrar</h2>
            </div>
            <p class="cash__hint">
              Cuenta el dinero que hay en la caja y anótalo: te decimos si cuadró o qué faltó/sobró.
            </p>
            <button class="btn btn--secondary" type="button" @click="showCloseForm = true">
              Cerrar caja <Icon name="arrow-right" :size="15" />
            </button>
          </template>

          <form v-else class="cash__form" novalidate @submit.prevent="closeBox">
            <div class="form__field">
              <label class="form__label" for="cash-closing">Dinero contado en caja (COP)</label>
              <input
                id="cash-closing"
                v-model="closingBalance"
                class="form__input"
                type="number"
                inputmode="decimal"
                min="0"
                step="0.01"
                placeholder="0"
                required
              />
              <p class="input-hint">
                Esperado según registros: <strong>{{ priceLabel(store.totals.expected) }}</strong>
              </p>
            </div>

            <div
              v-if="closePreview !== null"
              class="cash__preview"
              :class="{
                'cash__preview--ok': closePreview === 0,
                'cash__preview--over': closePreview > 0,
                'cash__preview--short': closePreview < 0,
              }"
            >
              {{ closePreview === 0 ? 'Cuadrará perfecto'
                : closePreview > 0 ? 'Sobrará ' + priceLabel(closePreview)
                : 'Faltará ' + priceLabel(Math.abs(closePreview)) }}
              <Icon v-if="closePreview === 0" name="check" :size="14" />
            </div>

            <div class="form__field">
              <label class="form__label" for="cash-closing-note">Nota de cierre (opcional)</label>
              <input
                id="cash-closing-note"
                v-model="closingNote"
                class="form__input"
                type="text"
                maxlength="200"
                placeholder="Ej. Dejé dinero para el cambio"
              />
            </div>

            <div class="cash__form-actions">
              <button class="btn btn--primary" type="submit" :disabled="store.saving">
                <template v-if="store.saving">Cerrando…</template>
                <template v-else><Icon name="lock" :size="16" /> Cerrar caja</template>
              </button>
              <button class="btn btn--ghost" type="button" @click="showCloseForm = false">
                Seguir registrando
              </button>
            </div>
          </form>
        </section>
      </template>

      <!-- Historial de sesiones (reporte) -->
      <section class="cash__card">
        <h2 class="cash__subtitle">Historial de cajas (últimos 30 días)</h2>

        <p v-if="store.history.length === 0" class="cash__empty">
          Todavía no hay sesiones registradas.
        </p>

        <div v-else class="cash__history">
          <article v-for="s in store.history" :key="s._id" class="cash__session">
            <header class="cash__session-head">
              <strong class="cash__session-date">{{ dayLabel(s.date) }}</strong>
              <span
                class="cash__session-status"
                :class="s.status === 'open' ? 'cash__session-status--on' : 'cash__session-status--off'"
              >
                <Icon :name="s.status === 'open' ? 'dot' : 'circle'" :size="11" />
                {{ s.status === 'open' ? 'Abierta' : 'Cerrada' }}
              </span>
            </header>

            <div class="cash__session-nums">
              <span class="cash__session-in">+ {{ priceLabel(s.totals.income) }}</span>
              <span class="cash__session-out">− {{ priceLabel(s.totals.expense) }}</span>
              <span class="cash__session-expected">
                Esperado {{ priceLabel(s.totals.expected) }}
              </span>
            </div>

            <footer v-if="s.status === 'closed'" class="cash__session-foot">
              <span>Contado: <strong>{{ priceLabel(s.closingBalance) }}</strong></span>
              <span
                class="cash__session-diff"
                :class="{
                  'cash__session-diff--ok': s.difference === 0,
                  'cash__session-diff--over': s.difference > 0,
                  'cash__session-diff--short': s.difference < 0,
                }"
              >
                {{ s.difference === 0 ? 'Cuadró'
                  : s.difference > 0 ? 'Sobró ' + priceLabel(s.difference)
                  : 'Faltó ' + priceLabel(Math.abs(s.difference)) }}
                <Icon v-if="s.difference === 0" name="check" :size="13" />
              </span>
            </footer>
          </article>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.cash__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-4);
  flex-wrap: wrap;
  margin-bottom: var(--space-5);
}

.cash__status {
  font-size: var(--font-size-xs);
  font-weight: 700;
  border-radius: var(--radius-pill);
  padding: 6px 12px;
  border: 1px solid transparent;
  white-space: nowrap;
}

.cash__status--on {
  color: var(--success);
  background: var(--success-soft);
  border-color: var(--success-border);
}

.cash__status--off {
  color: var(--text-muted);
  background: var(--surface-2);
  border-color: var(--border);
}

.cash__state,
.cash__empty,
.cash__hint {
  color: var(--text-muted);
  font-size: var(--font-size-sm);
}

.cash__state {
  text-align: center;
  padding: var(--space-6) 0;
}

/* ---------- Resumen ---------- */
.cash__summary {
  display: flex;
  gap: var(--space-4);
  align-items: stretch;
  flex-wrap: wrap;
  background: var(--surface);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  margin-bottom: var(--space-4);
  box-shadow: var(--shadow-sm);
}

.cash__balance {
  flex: 1;
  min-width: 200px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.cash__balance-label {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.cash__balance-value {
  font-family: var(--font-display);
  font-size: clamp(1.6rem, 5vw, 2.4rem);
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}

.cash__balance-hint {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
}

.cash__kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  gap: var(--space-3);
  align-items: center;
}

.cash__kpi {
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: var(--surface-2);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-md);
  padding: var(--space-3);
}

.cash__kpi-value {
  font-size: var(--font-size-md);
  font-variant-numeric: tabular-nums;
}

.cash__kpi-value--in { color: var(--success); }
.cash__kpi-value--out { color: var(--danger); }

.cash__kpi-label {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
}

/* ---------- Tarjetas ---------- */
.cash__card {
  background: var(--surface);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  margin-bottom: var(--space-4);
}

.cash__card--result {
  border-color: var(--accent-border);
  background: var(--accent-soft);
}

.cash__card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.cash__subtitle {
  font-size: var(--font-size-md);
  margin-bottom: var(--space-3);
}

.cash__count {
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: var(--accent);
  background: var(--accent-soft);
  border: 1px solid var(--accent-border);
  border-radius: var(--radius-pill);
  padding: 2px 10px;
}

/* ---------- Formularios ---------- */
.cash__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  max-width: 560px;
}

.cash__form--grid {
  max-width: 720px;
}

.cash__form-actions {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.cash__submit {
  align-self: flex-start;
}

.cash__toggle {
  display: inline-flex;
  gap: var(--space-2);
}

.cash__toggle-btn {
  font: inherit;
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--text-muted);
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-pill);
  padding: 8px 14px;
  cursor: pointer;
}

.cash__toggle-btn--on {
  color: var(--accent);
  border-color: var(--accent);
  background: var(--accent-soft);
}

/* ---------- Movimientos ---------- */
.cash__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.cash__move {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  border: 1px solid var(--border-soft);
  border-left-width: 3px;
  border-radius: var(--radius-md);
  padding: var(--space-3);
}

.cash__move--income { border-left-color: var(--success); }
.cash__move--expense { border-left-color: var(--danger); }

.cash__move-sign {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-full);
  font-weight: 700;
  flex: none;
}

.cash__move--income .cash__move-sign {
  color: var(--success);
  background: var(--success-soft);
}

.cash__move--expense .cash__move-sign {
  color: var(--danger);
  background: var(--danger-soft);
}

.cash__move-body {
  flex: 1;
  min-width: 0;
}

.cash__move-concept {
  font-size: var(--font-size-sm);
  font-weight: 600;
  display: flex;
  gap: var(--space-2);
  align-items: center;
  flex-wrap: wrap;
}

.cash__move-method {
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--text-muted);
  background: var(--surface-2);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-pill);
  padding: 1px 8px;
}

.cash__move-meta {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  display: flex;
  gap: var(--space-2);
  align-items: center;
  flex-wrap: wrap;
}

.cash__move-from {
  color: var(--accent);
}

.cash__move-amount {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.cash__move--income .cash__move-amount { color: var(--success); }
.cash__move--expense .cash__move-amount { color: var(--danger); }

.cash__move-del {
  font: inherit;
  background: transparent;
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-sm);
  padding: 4px 8px;
  cursor: pointer;
  opacity: 0.7;
}

.cash__move-del:hover {
  opacity: 1;
  border-color: var(--danger-border);
  background: var(--danger-soft);
}

/* ---------- Cuadre ---------- */
.cash__result {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.cash__result li {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  font-size: var(--font-size-sm);
  font-variant-numeric: tabular-nums;
}

.cash__result li span {
  color: var(--text-muted);
}

.cash__result-diff strong.cash__result-diff--ok,
.cash__preview--ok { color: var(--success); }
.cash__result-diff--over strong,
.cash__preview--over { color: var(--warning); }
.cash__result-diff--short strong,
.cash__preview--short { color: var(--danger); }

.cash__preview {
  font-size: var(--font-size-sm);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

/* ---------- Historial ---------- */
.cash__history {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--space-3);
}

.cash__session {
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.cash__session-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-2);
}

.cash__session-date {
  font-size: var(--font-size-sm);
}

.cash__session-status {
  font-size: var(--font-size-xs);
  font-weight: 700;
}

.cash__session-status--on { color: var(--success); }
.cash__session-status--off { color: var(--text-muted); }

.cash__session-nums {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: var(--font-size-xs);
  font-variant-numeric: tabular-nums;
  color: var(--text-muted);
}

.cash__session-in { color: var(--success); font-weight: 600; }
.cash__session-out { color: var(--danger); font-weight: 600; }

.cash__session-foot {
  display: flex;
  justify-content: space-between;
  gap: var(--space-2);
  flex-wrap: wrap;
  font-size: var(--font-size-xs);
  border-top: 1px dashed var(--border-soft);
  padding-top: var(--space-2);
}

.cash__session-diff { font-weight: 700; }
.cash__session-diff--ok { color: var(--success); }
.cash__session-diff--over { color: var(--warning); }
.cash__session-diff--short { color: var(--danger); }

@media (max-width: 560px) {
  .cash__summary {
    flex-direction: column;
  }

  .cash__move {
    flex-wrap: wrap;
  }

  .cash__move-amount {
    margin-left: auto;
  }
}
</style>
