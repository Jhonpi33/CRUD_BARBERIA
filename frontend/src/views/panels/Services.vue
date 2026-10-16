<script setup>
import { reactive, ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { useServicesStore } from '../../stores/services'
import Button from '../../components/Button.vue'

const auth = useAuthStore()
const store = useServicesStore()

const emptyForm = { name: '', description: '', price: '', durationMinutes: 30 }
const form = reactive({ ...emptyForm })
const formErrors = ref({})
const editingId = ref(null) // id del servicio que se está editando
const editForm = reactive({ ...emptyForm })
const editErrors = ref({})
const confirmDeleteId = ref(null)
const success = ref('')

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
  void isEdit
  return e
}

function payload(target) {
  return {
    name: String(target.name).trim(),
    description: String(target.description || '').trim(),
    price: Number(target.price),
    durationMinutes: Number(target.durationMinutes),
  }
}

async function onCreate() {
  success.value = ''
  formErrors.value = validate(form, false)
  if (Object.keys(formErrors.value).length > 0) return
  try {
    await store.createService(payload(form))
    Object.assign(form, emptyForm)
    success.value = 'Servicio creado.'
  } catch (err) {
    // Error general del backend (store.error) o validaciones.
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
}

function cancelEdit() {
  editingId.value = null
  editErrors.value = {}
}

async function onSaveEdit(id) {
  editErrors.value = validate(editForm, true)
  if (Object.keys(editErrors.value).length > 0) return
  try {
    await store.updateService(id, payload(editForm))
    editingId.value = null
    success.value = 'Cambios guardados.'
  } catch {
    /* el error queda en store.error */
  }
}

async function onToggle(service) {
  success.value = ''
  try {
    await store.toggleStatus(service._id, !service.isActive)
  } catch {
    /* store.error */
  }
}

async function onDelete(id) {
  success.value = ''
  try {
    await store.removeService(id)
    confirmDeleteId.value = null
    success.value = 'Servicio eliminado.'
  } catch {
    /* store.error */
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
        ⬅ Volver al panel
      </RouterLink>
    </header>

    <!-- Estados globales -->
    <p v-if="store.loading" class="services__state">Cargando servicios…</p>

    <template v-else>
      <p v-if="store.error" class="form__error" role="alert">{{ store.error }}</p>
      <p v-if="success" class="form__info" role="status">{{ success }}</p>

      <!-- Crear servicio -->
      <section class="services__card">
        <h2 class="services__subtitle">Nuevo servicio</h2>
        <form class="services__form" novalidate @submit.prevent="onCreate">
          <label class="form__field">
            <span class="form__label">Nombre *</span>
            <input v-model="form.name" class="form__input" type="text" maxlength="80" placeholder="Ej. Corte clásico" />
            <span v-if="formErrors.name" class="form__error">{{ formErrors.name }}</span>
          </label>

          <label class="form__field">
            <span class="form__label">Descripción</span>
            <textarea
              v-model="form.description"
              class="form__input form__textarea"
              maxlength="500"
              rows="2"
              placeholder="Opcional: detalles del servicio"
            ></textarea>
            <span v-if="formErrors.description" class="form__error">{{ formErrors.description }}</span>
          </label>

          <div class="services__row">
            <label class="form__field">
              <span class="form__label">Precio (COP) *</span>
              <input v-model="form.price" class="form__input" type="number" min="0" step="0.01" placeholder="15000" />
              <span v-if="formErrors.price" class="form__error">{{ formErrors.price }}</span>
            </label>

            <label class="form__field">
              <span class="form__label">Duración (min) *</span>
              <input v-model.number="form.durationMinutes" class="form__input" type="number" min="10" max="240" step="5" />
              <span v-if="formErrors.durationMinutes" class="form__error">{{ formErrors.durationMinutes }}</span>
            </label>
          </div>

          <Button type="submit" variant="primary" :disabled="store.saving">
            {{ store.saving ? 'Guardando…' : 'Agregar servicio' }}
          </Button>
        </form>
      </section>

      <!-- Lista vacía -->
      <p v-if="store.services.length === 0" class="services__state">
        Aún no tienes servicios. Crea el primero arriba 👆
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
                </p>
              </div>
              <div class="service-item__actions">
                <button class="btn btn--secondary btn--sm" type="button" @click="startEdit(service)">Editar</button>
                <button class="btn btn--secondary btn--sm" type="button" :disabled="store.saving" @click="onToggle(service)">
                  Desactivar
                </button>
                <button
                  v-if="confirmDeleteId !== service._id"
                  class="btn btn--danger btn--sm"
                  type="button"
                  @click="confirmDeleteId = service._id"
                >
                  Eliminar
                </button>
                <template v-else>
                  <button class="btn btn--danger btn--sm" type="button" :disabled="store.saving" @click="onDelete(service._id)">
                    ¿Seguro?
                  </button>
                  <button class="btn btn--secondary btn--sm" type="button" @click="confirmDeleteId = null">No</button>
                </template>
              </div>
            </template>

            <!-- Modo edición -->
            <div v-else class="service-item__edit">
              <label class="form__field">
                <span class="form__label">Nombre *</span>
                <input v-model="editForm.name" class="form__input" type="text" maxlength="80" />
                <span v-if="editErrors.name" class="form__error">{{ editErrors.name }}</span>
              </label>
              <label class="form__field">
                <span class="form__label">Descripción</span>
                <textarea v-model="editForm.description" class="form__input form__textarea" maxlength="500" rows="2"></textarea>
                <span v-if="editErrors.description" class="form__error">{{ editErrors.description }}</span>
              </label>
              <div class="services__row">
                <label class="form__field">
                  <span class="form__label">Precio (COP) *</span>
                  <input v-model="editForm.price" class="form__input" type="number" min="0" step="0.01" />
                  <span v-if="editErrors.price" class="form__error">{{ editErrors.price }}</span>
                </label>
                <label class="form__field">
                  <span class="form__label">Duración (min) *</span>
                  <input v-model.number="editForm.durationMinutes" class="form__input" type="number" min="10" max="240" step="5" />
                  <span v-if="editErrors.durationMinutes" class="form__error">{{ editErrors.durationMinutes }}</span>
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
              </p>
            </div>
            <div class="service-item__actions">
              <button class="btn btn--secondary btn--sm" type="button" :disabled="store.saving" @click="onToggle(service)">
                Activar
              </button>
              <button
                v-if="confirmDeleteId !== service._id"
                class="btn btn--danger btn--sm"
                type="button"
                @click="confirmDeleteId = service._id"
              >
                Eliminar
              </button>
              <template v-else>
                <button class="btn btn--danger btn--sm" type="button" :disabled="store.saving" @click="onDelete(service._id)">
                  ¿Seguro?
                </button>
                <button class="btn btn--secondary btn--sm" type="button" @click="confirmDeleteId = null">No</button>
              </template>
            </div>
          </li>
        </ul>
      </section>
    </template>
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
  grid-template-columns: 1fr 1fr;
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
  background: rgba(52, 211, 153, 0.12);
  border: 1px solid rgba(52, 211, 153, 0.4);
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

@media (max-width: 560px) {
  .services__row {
    grid-template-columns: 1fr;
  }
}
</style>
