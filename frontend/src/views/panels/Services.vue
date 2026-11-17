<script setup>
import { reactive, ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { useServicesStore } from '../../stores/services'
import { useToastsStore } from '../../stores/toasts'
import Button from '../../components/Button.vue'
import Icon from '../../components/Icon.vue'
import Modal from '../../components/Modal.vue'

const auth = useAuthStore()
const store = useServicesStore()
const toast = useToastsStore()

const emptyForm = { name: '', description: '', price: '', durationMinutes: 30, bufferMinutes: 10 }
const form = reactive({ ...emptyForm })
const formErrors = ref({})
const editingId = ref(null) // id del servicio que se está editando
const editForm = reactive({ ...emptyForm })
const editErrors = ref({})

// Confirmación de borrado: se abre como modal centrado.
const confirmService = ref(null)
// Errores de validación: se muestran juntos en un modal centrado.
const issues = ref([])

/** Etiqueta legible de cada campo para la lista de errores. */
const FIELD_LABELS = {
  name: 'Nombre',
  description: 'Descripción',
  price: 'Precio',
  durationMinutes: 'Duración',
  bufferMinutes: 'Margen de cambio',
}

/** { name: 'msg' } -> [{ field: 'Nombre', message: 'msg' }] */
function toIssueList(errors) {
  return Object.entries(errors).map(([key, message]) => ({
    field: FIELD_LABELS[key] || key,
    message,
  }))
}

const roleLabel = computed(() =>
  auth.role === 'barbershop_owner' ? 'de la barbería' : 'personal'
)

onMounted(() => {
  store.fetchServices()
})

/** Validación en espejo con el backend (el backend siempre revalida). */
function validate(target, isEdit) {
  const e = {}
  const name = String(target.name || '').trim()
  if (name.length < 2 || name.length > 80) e.name = 'El nombre debe tener entre 2 y 80 caracteres.'
  const desc = String(target.description || '')
  if (desc.length > 500) e.description = 'La descripción no puede superar 500 caracteres.'
  const price = Number(target.price)
  if (target.price === '' || target.price === null || Number.isNaN(price)) {
    e.price = 'El precio es obligatorio y debe ser un número.'
  } else if (price < 0) {
    e.price = 'El precio no puede ser negativo.'
  } else if (Math.abs(price * 100 - Math.round(price * 100)) >= 1e-6) {
    e.price = 'El precio admite máximo 2 decimales.'
  }
  const duration = Number(target.durationMinutes)
  if (!Number.isInteger(duration) || duration < 10 || duration > 240) {
    e.durationMinutes = 'La duración debe ser un entero entre 10 y 240 minutos.'
  }
  const buffer = Number(target.bufferMinutes)
  if (!Number.isInteger(buffer) || buffer < 0 || buffer > 120) {
    e.bufferMinutes = 'El margen debe ser un entero entre 0 y 120 minutos.'
  }
  void isEdit
  return e
}

function payload(target) {
  return {
    name: String(target.name).trim(),
    description: String(target.description || '').trim(),
    price: Number(target.price),
    durationMinutes: Number(target.durationMinutes),
    bufferMinutes: Number(target.bufferMinutes),
  }
}

async function onCreate() {
  store.clearError()
  formErrors.value = validate(form, false)
  if (Object.keys(formErrors.value).length > 0) {
    issues.value = toIssueList(formErrors.value)
    return
  }
  try {
    await store.createService(payload(form))
    Object.assign(form, emptyForm)
    toast.success('Servicio creado', 'Ya aparece en tu perfil para reservar.')
  } catch (err) {
    // Error general del backend (store.error) o validaciones.
    toast.error('No se pudo crear el servicio', store.error)
    void err
  }
}

function startEdit(service) {
  editingId.value = service._id
  editErrors.value = {}
  editForm.name = service.name
  editForm.description = service.description || ''
  editForm.price = service.price
  editForm.durationMinutes = service.durationMinutes
  editForm.bufferMinutes = Number.isInteger(service.bufferMinutes) ? service.bufferMinutes : 10
}

function cancelEdit() {
  editingId.value = null
  editErrors.value = {}
}

async function onSaveEdit(id) {
  editErrors.value = validate(editForm, true)
  if (Object.keys(editErrors.value).length > 0) {
    issues.value = toIssueList(editErrors.value)
    return
  }
  try {
    await store.updateService(id, payload(editForm))
    editingId.value = null
    toast.success('Cambios guardados')
  } catch {
    /* el error queda en store.error */
    toast.error('No se pudieron guardar los cambios', store.error)
  }
}

async function onToggle(service) {
  store.clearError()
  try {
    await store.toggleStatus(service._id, !service.isActive)
    toast.success(
      service.isActive ? 'Servicio desactivado' : 'Servicio activado',
      service.isActive ? 'Ya no se ofrece en tu perfil público.' : 'Ya vuelve a mostrarse en tu perfil.'
    )
  } catch {
    /* store.error */
    toast.error('No se pudo cambiar el estado', store.error)
  }
}

async function onDelete(id) {
  store.clearError()
  try {
    await store.removeService(id)
    confirmService.value = null
    toast.success('Servicio eliminado')
  } catch {
    /* store.error */
    confirmService.value = null
    toast.error('No se pudo eliminar el servicio', store.error)
  }
}

function priceLabel(value) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(value))
}
</script>

<template>
  <div class="services">
    <header class="services__header">
      <div>
        <h1 class="services__title">Mis servicios {{ roleLabel }}</h1>
        <p class="services__lead">
          Define qué ofreces, a cuánto y cuánto tarda cada servicio. Los inactivos no se
          ofrecen en la disponibilidad de reservas.
        </p>
      </div>
      <RouterLink class="btn btn--secondary btn--sm" :to="auth.panelPath">
        <Icon name="arrow-left" :size="16" /> Volver al panel
      </RouterLink>
    </header>

    <!-- Estados globales -->
    <p v-if="store.loading" class="services__state">Cargando servicios…</p>

    <template v-else>
      <!-- Crear servicio -->
      <section class="services__card">
        <h2 class="services__subtitle">Nuevo servicio</h2>
        <form class="services__form" novalidate @submit.prevent="onCreate">
          <label class="form__field">
            <span class="form__label">Nombre *</span>
            <input
              v-model="form.name"
              class="form__input"
              :class="{ 'form__input--invalid': formErrors.name }"
              type="text"
              maxlength="80"
              placeholder="Ej. Corte clásico"
              :aria-invalid="formErrors.name ? 'true' : undefined"
            />
          </label>

          <label class="form__field">
            <span class="form__label">Descripción</span>
            <textarea
              v-model="form.description"
              class="form__input form__textarea"
              :class="{ 'form__input--invalid': formErrors.description }"
              maxlength="500"
              rows="2"
              placeholder="Opcional: detalles del servicio"
              :aria-invalid="formErrors.description ? 'true' : undefined"
            ></textarea>
          </label>

          <div class="services__row">
            <label class="form__field">
              <span class="form__label">Precio (COP) *</span>
              <input
                v-model="form.price"
                class="form__input"
                :class="{ 'form__input--invalid': formErrors.price }"
                type="number"
                min="0"
                step="0.01"
                placeholder="15000"
                :aria-invalid="formErrors.price ? 'true' : undefined"
              />
            </label>

            <label class="form__field">
              <span class="form__label">Duración (min) *</span>
              <input
                v-model.number="form.durationMinutes"
                class="form__input"
                :class="{ 'form__input--invalid': formErrors.durationMinutes }"
                type="number"
                min="10"
                max="240"
                step="5"
                :aria-invalid="formErrors.durationMinutes ? 'true' : undefined"
              />
            </label>

            <label class="form__field">
              <span class="form__label">Cambio de turno (min)</span>
              <input
                v-model.number="form.bufferMinutes"
                class="form__input"
                :class="{ 'form__input--invalid': formErrors.bufferMinutes }"
                type="number"
                min="0"
                max="120"
                step="5"
                aria-describedby="buffer-hint"
                :aria-invalid="formErrors.bufferMinutes ? 'true' : undefined"
              />
              <span id="buffer-hint" class="form__hint">Aire tras la cita para cambiar de turno. 0 = sin margen.</span>
            </label>
          </div>

          <Button type="submit" variant="primary" :disabled="store.saving">
            {{ store.saving ? 'Guardando…' : 'Agregar servicio' }}
          </Button>
        </form>
      </section>

      <!-- Lista vacía -->
      <p v-if="store.services.length === 0" class="services__state">
        Aún no tienes servicios. Crea el primero arriba <Icon name="arrow-up" :size="15" />
      </p>

      <!-- Activos -->
      <section v-else-if="store.activeServices.length > 0" class="services__card">
        <h2 class="services__subtitle">
          Activos <span class="services__count">{{ store.activeServices.length }}</span>
        </h2>
        <ul class="services__list">
          <li v-for="service in store.activeServices" :key="service._id" class="service-item">
            <!-- Modo vista -->
            <template v-if="editingId !== service._id">
              <div class="service-item__info">
                <p class="service-item__name">
                  {{ service.name }}
                  <span class="badge badge--on">Activo</span>
                </p>
                <p v-if="service.description" class="service-item__desc">{{ service.description }}</p>
                <p class="service-item__meta">
                  {{ priceLabel(service.price) }} · {{ service.durationMinutes }} min
                  <template v-if="service.bufferMinutes > 0"> · {{ service.bufferMinutes }} min de cambio</template>
                </p>
              </div>
              <div class="service-item__actions">
                <button class="btn btn--secondary btn--sm" type="button" @click="startEdit(service)">Editar</button>
                <button class="btn btn--secondary btn--sm" type="button" :disabled="store.saving" @click="onToggle(service)">
                  Desactivar
                </button>
                <button class="btn btn--danger btn--sm" type="button" @click="confirmService = service">
                  <Icon name="trash" :size="15" /> Eliminar
                </button>
              </div>
            </template>

            <!-- Modo edición -->
            <div v-else class="service-item__edit">
              <label class="form__field">
                <span class="form__label">Nombre *</span>
                <input
                  v-model="editForm.name"
                  class="form__input"
                  :class="{ 'form__input--invalid': editErrors.name }"
                  type="text"
                  maxlength="80"
                  :aria-invalid="editErrors.name ? 'true' : undefined"
                />
              </label>
              <label class="form__field">
                <span class="form__label">Descripción</span>
                <textarea
                  v-model="editForm.description"
                  class="form__input form__textarea"
                  :class="{ 'form__input--invalid': editErrors.description }"
                  maxlength="500"
                  rows="2"
                  :aria-invalid="editErrors.description ? 'true' : undefined"
                ></textarea>
              </label>
              <div class="services__row">
                <label class="form__field">
                  <span class="form__label">Precio (COP) *</span>
                  <input
                    v-model="editForm.price"
                    class="form__input"
                    :class="{ 'form__input--invalid': editErrors.price }"
                    type="number"
                    min="0"
                    step="0.01"
                    :aria-invalid="editErrors.price ? 'true' : undefined"
                  />
                </label>
                <label class="form__field">
                  <span class="form__label">Duración (min) *</span>
                  <input
                    v-model.number="editForm.durationMinutes"
                    class="form__input"
                    :class="{ 'form__input--invalid': editErrors.durationMinutes }"
                    type="number"
                    min="10"
                    max="240"
                    step="5"
                    :aria-invalid="editErrors.durationMinutes ? 'true' : undefined"
                  />
                </label>
                <label class="form__field">
                  <span class="form__label">Cambio de turno (min)</span>
                  <input
                    v-model.number="editForm.bufferMinutes"
                    class="form__input"
                    :class="{ 'form__input--invalid': editErrors.bufferMinutes }"
                    type="number"
                    min="0"
                    max="120"
                    step="5"
                    :aria-invalid="editErrors.bufferMinutes ? 'true' : undefined"
                  />
                </label>
              </div>
              <div class="service-item__actions">
                <button class="btn btn--primary btn--sm" type="button" :disabled="store.saving" @click="onSaveEdit(service._id)">
                  {{ store.saving ? 'Guardando…' : 'Guardar' }}
                </button>
                <button class="btn btn--secondary btn--sm" type="button" @click="cancelEdit">Cancelar</button>
              </div>
            </div>
          </li>
        </ul>
      </section>

      <!-- Inactivos -->
      <section v-if="store.inactiveServices.length > 0" class="services__card services__card--muted">
        <h2 class="services__subtitle">
          Inactivos <span class="services__count">{{ store.inactiveServices.length }}</span>
        </h2>
        <p class="services__note">No se muestran en la disponibilidad de reservas.</p>
        <ul class="services__list">
          <li v-for="service in store.inactiveServices" :key="service._id" class="service-item">
            <div class="service-item__info">
              <p class="service-item__name">
                {{ service.name }}
                <span class="badge badge--off">Inactivo</span>
              </p>
              <p class="service-item__meta">
                {{ priceLabel(service.price) }} · {{ service.durationMinutes }} min
                <template v-if="service.bufferMinutes > 0"> · {{ service.bufferMinutes }} min de cambio</template>
              </p>
            </div>
            <div class="service-item__actions">
              <button class="btn btn--secondary btn--sm" type="button" :disabled="store.saving" @click="onToggle(service)">
                Activar
              </button>
              <button class="btn btn--danger btn--sm" type="button" @click="confirmService = service">
                <Icon name="trash" :size="15" /> Eliminar
              </button>
            </div>
          </li>
        </ul>
      </section>
    </template>

    <!-- Confirmación de borrado: modal centrado en vez del "¿Seguro?" de la fila -->
    <Modal
      :open="!!confirmService"
      title="¿Eliminar este servicio?"
      icon="trash"
      tone="danger"
      @close="confirmService = null"
    >
      <p>
        Se eliminará <strong>{{ confirmService?.name }}</strong> de tu perfil y de la
        disponibilidad de reservas. Esta acción no se puede deshacer.
      </p>
      <template #footer>
        <button class="btn btn--secondary" type="button" @click="confirmService = null">Cancelar</button>
        <button
          class="btn btn--danger"
          type="button"
          :disabled="store.saving"
          @click="onDelete(confirmService._id)"
        >
          {{ store.saving ? 'Eliminando…' : 'Eliminar' }}
        </button>
      </template>
    </Modal>

    <!-- Validación: modal centrado con todos los errores del formulario -->
    <Modal
      :open="issues.length > 0"
      title="Revisa el formulario"
      icon="alert"
      tone="warning"
      @close="issues = []"
    >
      <p>Corrige lo siguiente para poder guardar:</p>
      <ul class="issues">
        <li v-for="issue in issues" :key="issue.field">
          <strong class="issues__field">{{ issue.field }}:</strong> {{ issue.message }}
        </li>
      </ul>
      <template #footer>
        <button class="btn btn--primary" type="button" @click="issues = []">Entendido</button>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.services__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-4);
  flex-wrap: wrap;
  margin-bottom: var(--space-5);
}

.services__title {
  font-size: clamp(1.3rem, 4vw, 1.8rem);
  margin-bottom: var(--space-2);
}

.services__lead {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
  max-width: 560px;
}

.services__state {
  color: var(--color-text-muted);
  text-align: center;
  padding: var(--space-6) 0;
}

.services__card {
  background: var(--color-surface);
  border: 1px solid var(--color-border-soft);
  border-radius: var(--radius-md);
  padding: var(--space-5);
  margin-bottom: var(--space-5);
}

.services__card--muted {
  background: var(--color-surface-2);
}

.services__subtitle {
  font-size: var(--font-size-md);
  margin-bottom: var(--space-4);
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.services__count {
  font-family: var(--font-body);
  font-size: var(--font-size-xs);
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  padding: 2px 8px;
  color: var(--color-text-muted);
}

.services__note {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  margin-bottom: var(--space-3);
}

.services__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.services__row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-4);
}

.services__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.service-item {
  border: 1px solid var(--color-border-soft);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  display: flex;
  justify-content: space-between;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.service-item__name {
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.service-item__desc {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  margin-top: var(--space-1);
}

.service-item__meta {
  font-size: var(--font-size-sm);
  color: var(--color-primary-soft);
  margin-top: var(--space-2);
}

.service-item__actions {
  display: flex;
  gap: var(--space-2);
  align-items: flex-start;
  flex-wrap: wrap;
}

.service-item__edit {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.badge {
  font-size: var(--font-size-xs);
  font-weight: 700;
  border-radius: var(--radius-pill);
  padding: 2px 8px;
}

.badge--on {
  color: var(--color-accent);
  background: var(--success-soft);
  border: 1px solid var(--success-border);
}

.badge--off {
  color: var(--color-text-muted);
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
}

.form__textarea {
  resize: vertical;
  min-height: 56px;
}

/* Campo con error: el mensaje vive en el modal, aquí solo se resalta el borde */
.form__input--invalid {
  border-color: var(--danger);
}

.form__input--invalid:focus {
  border-color: var(--danger);
  box-shadow: 0 0 0 3px var(--danger-soft);
}

.issues {
  margin-top: var(--space-3);
  padding-left: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  color: var(--text);
}

.issues__field {
  color: var(--danger);
}

@media (max-width: 560px) {
  .services__row {
    grid-template-columns: 1fr;
  }
}
</style>
