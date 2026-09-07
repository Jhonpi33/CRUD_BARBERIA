<script setup>
import { ref, computed } from 'vue'
import { useLocalStorage } from '@vueuse/core'

const servicios = useLocalStorage('servicios-barberia', [])
const barberos = ['Ramiro', 'Julian', 'Mario']
const tiposServicio = [
  'Corte Clasico',
  'Corte Moderno',
  'Corte Degradado',
  'Corte Infantil',
  'Barba',
  'Diseño De Barba',
  'Corte + barba',
  'Cejas',
  'Limpieza Facial'
]

const preciosServicio = {
  'Corte Clasico': 15000,
  'Corte Moderno': 18000,
  'Corte Degradado': 20000,
  'Corte Infantil': 12000,
  'Barba': 10000,
  'Diseño De Barba': 15000,
  'Corte + barba': 25000,
  'Cejas': 8000,
  'Limpieza Facial': 20000
}

const duracionServicio = {
  'Corte Clasico': 30,
  'Corte Moderno': 40,
  'Corte Degradado': 45,
  'Corte Infantil': 25,
  'Barba': 20,
  'Diseño De Barba': 30,
  'Corte + barba': 50,
  'Cejas': 10,
  'Limpieza Facial': 35
}

const descansobarbero = {
  'Ramiro': [1, 2],
  'Julian': [3, 4],
  'Mario': [5, 0]
}

const formulario = ref({
  id: null,
  cliente: '',
  telefono: '',
  tipoServicio: '',
  barbero: '',
  fecha: '',
  hora: '',
  precio: 0,
  metodoPago: '',
  estadoPago: '',
  montoAbonado: 0,
  calificacion: 0,
  observaciones: '',
  finalizado: false
})

const mostrarmodal = ref(false)
const idEditando = ref(null)
const mostrarConfirmacion = ref(false)
const idEliminar = ref(null)
const mensajeEror = ref('')
const guardando = ref(false)
const mostrarModalFinalizar = ref(false)
const idFinalizando = ref(null)
const calificacionFinal = ref(0)
const observacionesFinal = ref('')
const guardandoFinalizacion = ref(false)
const filtroBarbero = ref('Todos')

const resumenDia = computed(() => {
  let total = 0
  const hoy = obtenerFechaHoy()

  for (let i = 0; i < servicios.value.length; i++) {
    const servicio = servicios.value[i]

    if (servicio.fecha === hoy) {
      if (servicio.estadoPago === 'Pagado') {
        total += Number(servicio.precio || 0)
      } else if (servicio.estadoPago === 'abonado') {
        total += Number(servicio.montoAbonado || 0)
      }
    }
  }

  return total
})

const serviciosHechosHoy = computed(() => {
  let cantidad = 0
  const hoy = obtenerFechaHoy()

  for (let i = 0; i < servicios.value.length; i++) {
    const servicio = servicios.value[i]

    if (servicio.fecha === hoy && servicio.finalizado === true) {
      cantidad++
    }
  }

  return cantidad
})

const serviciosReservaHoy = computed(() => {
  let cantidad = 0
  const hoy = obtenerFechaHoy()

  for (let i = 0; i < servicios.value.length; i++) {
    const servicio = servicios.value[i]

    if (servicio.fecha === hoy && servicio.finalizado !== true) {
      cantidad++
    }
  }

  return cantidad
})

function obtenerListaVisible() {
  if (filtroBarbero.value === 'Todos') {
    return servicios.value
  }

  return servicios.value.filter(function(s) {
    return s.barbero === filtroBarbero.value
  })
}

function obtenerServicioFinalizando() {
  return servicios.value.find(function(s) {
    return s.id === idFinalizando.value
  }) || null
}

function inicialesCliente(nombre) {
  return nombre.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
}

function actualizarPrecio() {
  formulario.value.precio = preciosServicio[formulario.value.tipoServicio] || 0
}

function formatearPrecio(precio) {
  return Number(precio || 0).toLocaleString('es-CO')
}

function calcularSaldoPendiente(servicio) {
  return Number(servicio.precio || 0) - Number(servicio.montoAbonado || 0)
}

function esFechaPasada(fechaTexto, horaTexto) {
  const fechaSeleccionada = new Date(fechaTexto + 'T' + horaTexto)
  const ahora = new Date()
  return fechaSeleccionada < ahora
}

function obtenerFechaMinima() {
  const hoy = new Date()
  const anio = hoy.getFullYear()
  const mes = String(hoy.getMonth() + 1).padStart(2, '0')
  const dia = String(hoy.getDate()).padStart(2, '0')
  return anio + '-' + mes + '-' + dia
}

function obtenerFechaHoy() {
  const hoy = new Date()
  const anio = hoy.getFullYear()
  const mes = String(hoy.getMonth() + 1).padStart(2, '0')
  const dia = String(hoy.getDate()).padStart(2, '0')
  return anio + '-' + mes + '-' + dia
}

function barberodescansaesedia(barbero, fechaTexto) {
  const fecha = new Date(fechaTexto + 'T00:00:00')
  const diasemana = fecha.getDay()
  return descansobarbero[barbero].includes(diasemana)
}

function horaaminutos(horaTexto) {
  const partes = horaTexto.split(':')
  return Number(partes[0]) * 60 + Number(partes[1])
}

function obtenerbloqueshorario(diasemana) {
  if (diasemana === 0) {
    return [{ inicio: '09:00', fin: '12:30' }]
  }

  if (diasemana === 6) {
    return [{ inicio: '09:00', fin: '16:00' }]
  }

  return [
    { inicio: '08:30', fin: '12:30' },
    { inicio: '14:00', fin: '18:00' }
  ]
}

function obtenerHoraMinima() {
  if (formulario.value.fecha === '') {
    return '00:00'
  }

  const dia = new Date(formulario.value.fecha + 'T00:00:00').getDay()
  const bloques = obtenerbloqueshorario(dia)
  return bloques[0].inicio
}

function obtenerHoraMaxima() {
  if (formulario.value.fecha === '') {
    return '23:59'
  }

  const dia = new Date(formulario.value.fecha + 'T00:00:00').getDay()
  const bloques = obtenerbloqueshorario(dia)
  return bloques[bloques.length - 1].fin
}

function validarHorario() {
  if (barberodescansaesedia(formulario.value.barbero, formulario.value.fecha)) {
    return formulario.value.barbero + ' descansa ese día'
  }

  const fecha = new Date(formulario.value.fecha + 'T00:00:00')
  const diasemana = fecha.getDay()
  const bloques = obtenerbloqueshorario(diasemana)
  const duracion = duracionServicio[formulario.value.tipoServicio]
  const inicioMinutos = horaaminutos(formulario.value.hora)
  const finMinutos = inicioMinutos + duracion
  let cabeEnAlgunBloque = false

  for (let i = 0; i < bloques.length; i++) {
    const inicioBloque = horaaminutos(bloques[i].inicio)
    const finBloque = horaaminutos(bloques[i].fin)

    if (inicioMinutos >= inicioBloque && finMinutos <= finBloque) {
      cabeEnAlgunBloque = true
      break
    }
  }

  if (!cabeEnAlgunBloque) {
    return 'La hora no cabe en el horario de atención de ese día'
  }

  return ''
}

function guardarServicio() {
  mensajeEror.value = ''

  if (!formulario.value.cliente.trim()) {
    mensajeEror.value = 'Ingrese el nombre del cliente'
    return
  }

  if (!formulario.value.telefono.trim()) {
    mensajeEror.value = 'Ingrese el teléfono del cliente'
    return
  }

  if (!formulario.value.tipoServicio) {
    mensajeEror.value = 'Seleccione un servicio'
    return
  }

  if (!formulario.value.barbero) {
    mensajeEror.value = 'Seleccione un barbero'
    return
  }

  if (!formulario.value.fecha) {
    mensajeEror.value = 'Seleccione una fecha'
    return
  }

  if (!formulario.value.hora) {
    mensajeEror.value = 'Seleccione una hora'
    return
  }

  if (!formulario.value.metodoPago) {
    mensajeEror.value = 'Seleccione el método de pago'
    return
  }

  if (!formulario.value.estadoPago) {
    mensajeEror.value = 'Seleccione el estado del pago'
    return
  }

  if (esFechaPasada(formulario.value.fecha, formulario.value.hora)) {
    mensajeEror.value = 'No puede seleccionar una fecha u hora pasada'
    return
  }

  if (formulario.value.estadoPago === 'abonado' && Number(formulario.value.montoAbonado || 0) <= 0) {
    mensajeEror.value = 'Ingrese el valor del abono'
    return
  }

  if (formulario.value.estadoPago === 'abonado' && Number(formulario.value.montoAbonado) >= Number(formulario.value.precio)) {
    mensajeEror.value = 'El abono debe ser menor al precio total'
    return
  }

  const errorHorario = validarHorario()

  if (errorHorario) {
    mensajeEror.value = errorHorario
    return
  }

  guardando.value = true

  setTimeout(() => {
    if (formulario.value.estadoPago !== 'abonado') {
      formulario.value.montoAbonado = 0
    }

    if (idEditando.value === null) {
      const nuevoServicio = {
        ...formulario.value,
        id: Date.now(),
        finalizado: false
      }

      servicios.value.push(nuevoServicio)
    } else {
      for (let i = 0; i < servicios.value.length; i++) {
        if (servicios.value[i].id === idEditando.value) {
          servicios.value[i] = {
            ...formulario.value,
            id: idEditando.value
          }
          break
        }
      }
    }

    guardando.value = false
    mostrarmodal.value = false
    limpiarFormulario()
  }, 2000)
}

function limpiarFormulario() {
  formulario.value = {
    id: null,
    cliente: '',
    telefono: '',
    tipoServicio: '',
    barbero: '',
    fecha: '',
    hora: '',
    precio: 0,
    metodoPago: '',
    estadoPago: '',
    montoAbonado: 0,
    calificacion: 0,
    observaciones: '',
    finalizado: false
  }

  idEditando.value = null
  mensajeEror.value = ''
}

function abrirModalNuevo() {
  limpiarFormulario()
  formulario.value.fecha = obtenerFechaMinima()
  mostrarmodal.value = true
}

function abrirModalEditar(servicio) {
  formulario.value = { ...servicio }
  idEditando.value = servicio.id
  mensajeEror.value = ''
  mostrarmodal.value = true
}

function cerrarModal() {
  mostrarmodal.value = false
  limpiarFormulario()
}

function abrirConfirmacion(id) {
  idEliminar.value = id
  mostrarConfirmacion.value = true
}

function confirmarEliminacion() {
  for (let i = 0; i < servicios.value.length; i++) {
    if (servicios.value[i].id === idEliminar.value) {
      servicios.value.splice(i, 1)
      break
    }
  }

  mostrarConfirmacion.value = false
  idEliminar.value = null
}

function abrirFinalizar(servicio) {
  idFinalizando.value = servicio.id
  calificacionFinal.value = servicio.calificacion || 0
  observacionesFinal.value = servicio.observaciones || ''
  mostrarModalFinalizar.value = true
}

function ponerCalificacion(estrella) {
  calificacionFinal.value = estrella
}

function cerrarFinalizar() {
  mostrarModalFinalizar.value = false
  idFinalizando.value = null
  calificacionFinal.value = 0
  observacionesFinal.value = ''
}

function guardarFinalizacion() {
  guardandoFinalizacion.value = true

  setTimeout(() => {
    for (let i = 0; i < servicios.value.length; i++) {
      if (servicios.value[i].id === idFinalizando.value) {
        servicios.value[i].calificacion = calificacionFinal.value
        servicios.value[i].observaciones = observacionesFinal.value
        servicios.value[i].finalizado = true
        break
      }
    }

    guardandoFinalizacion.value = false
    mostrarModalFinalizar.value = false
    idFinalizando.value = null
  }, 1500)
}
</script>

<template>

  <div class="gale-app">

    <aside class="sidebar">

      <div class="brand">

        <div class="brand-mark">✂</div>

        <div>
          <h1 class="serif">GALÉ</h1>
          <p>Barber Studio</p>
        </div>

      </div>

      <div class="turno-activo">
        <span class="dot"></span>
        Turno activo
        <span class="time">10:00–20:00</span>
      </div>

      <nav class="nav-list">
        <div class="nav-item active">▦ Panel de Servicios</div>
      </nav>

      <div class="sidebar-foot">

        <div class="capacidad-label">
          <span>Sillones ocupados</span>
          <span>4/5</span>
        </div>

        <div class="capacidad-bar">
          <div class="capacidad-fill"></div>
        </div>

      </div>

    </aside>

    <!-- MAIN -->

    <main class="main">

      <div class="topbar">

        <div class="pill">
          📅 Hoy,
          {{ new Date().toLocaleDateString('es-CO', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          }) }}
        </div>

        <div class="pill mint">
          ⏱ Pico de afluencia: 17:30–19:30
        </div>

        <div class="topbar-spacer"></div>

        <div class="icon-btn">🔍</div>

        <div class="icon-btn">🔔</div>

        <div class="profile">

          <div class="profile-avatar">MG</div>

          <div>
            <div class="profile-name">Marcello Galé</div>
            <div class="profile-role">Head Barber / Admin</div>
          </div>

        </div>

      </div>

      <div class="header-row">

        <div>

          <p class="header-eyebrow">
            CONSOLA DE ADMINISTRACIÓN
          </p>

          <h2 class="serif">
            Gestiona los servicios de
            <em>tu barbería</em>
          </h2>

          <p class="sub">
            Reservas, cobros y calidad de atención, todo en un mismo panel, fácil y rápido.
          </p>

        </div>

        <button
          class="btn-nuevo"
          @click="abrirModalNuevo"
        >
          + Nuevo Servicio
        </button>

      </div>

      <div class="stats-row">

        <div class="stat-card">

          <div class="stat-top">

            <span class="stat-label">
              Servicios de hoy
            </span>

            <div class="stat-icon">
              📈
            </div>

          </div>

          <div class="stat-value">
            {{ serviciosHechosHoy }}
            <small>completados</small>
          </div>

        </div>

        <div class="stat-card">

          <div class="stat-top">

            <span class="stat-label">
              En reserva hoy
            </span>

            <div class="stat-icon">
              ⏱
            </div>

          </div>

          <div class="stat-value">
            {{ serviciosReservaHoy }}
            <small>en espera</small>
          </div>

        </div>

        <div class="stat-card">

          <div class="stat-top">

            <span class="stat-label">
              Total vendido hoy
            </span>

            <div class="stat-icon">
              💰
            </div>

          </div>

          <div class="stat-money">
            ${{ formatearPrecio(resumenDia) }}

            <small style="font-size:0.8rem;color:var(--text-dim)">
              COP
            </small>
          </div>

        </div>

      </div>

      <div class="section-head">

        <h3 class="serif">
          Servicios Registrados

          <span class="count">
            {{ obtenerListaVisible().length }}
            de
            {{ servicios.length }}
          </span>

        </h3>

        <div class="filtros">

          <button
            v-for="b in ['Todos', ...barberos]"
            :key="b"
            class="filtro-btn"
            :class="{ active: filtroBarbero === b }"
            @click="filtroBarbero = b"
          >
            {{ b }}
          </button>

        </div>

      </div>

      <p
        class="sin-registros"
        v-if="obtenerListaVisible().length === 0"
      >
        Aún no hay servicios registrados para este filtro.
        ¡Agrega el primero!
      </p>

      <div class="servicios-grid">

        <div
          v-for="servicio in obtenerListaVisible()"
          :key="servicio.id"
          class="tarjeta"
          :class="{
            pendiente: servicio.estadoPago === 'Pendiente',
            abonado: servicio.estadoPago === 'abonado',
            pagado: servicio.estadoPago === 'Pagado'
          }"
        >

          <div class="tarjeta-header">

            <h4 class="serif">
              {{ servicio.cliente }}
            </h4>

            <span
              class="badge badge-pagado"
              v-if="servicio.estadoPago === 'Pagado'"
            >
              Pagado
            </span>

            <span
              class="badge badge-pendiente"
              v-else-if="servicio.estadoPago === 'Pendiente'"
            >
              Pendiente
            </span>

            <span
              class="badge badge-abonado"
              v-else-if="servicio.estadoPago === 'abonado'"
            >
              Abonado
            </span>

          </div>

          <div class="tarjeta-row">
            📞 {{ servicio.telefono }}
          </div>

          <div class="tarjeta-row">
            ✂
            <b>{{ servicio.tipoServicio }}</b>
            · {{ servicio.barbero }}
          </div>

          <div class="tarjeta-row">
            📅 {{ servicio.fecha }} · {{ servicio.hora }}
          </div>

          <div
            class="tarjeta-row"
            v-if="servicio.metodoPago"
          >
            Pago con
            {{ servicio.metodoPago === 'Trasferencia'
              ? 'Transferencia'
              : servicio.metodoPago }}
          </div>

          <div class="tarjeta-precio serif">
            ${{ formatearPrecio(servicio.precio) }}

            <small
              style="font-size:0.7rem;color:var(--text-dim);font-family:'Plus Jakarta Sans',sans-serif"
            >
              COP
            </small>
          </div>

          <!-- si esta abonado, muestro cuanto abono y cuanto falta -->

          <div
            v-if="servicio.estadoPago === 'abonado'"
            class="info-abono"
          >
            Abonó ${{ formatearPrecio(servicio.montoAbonado) }} COP

            <div class="falta">
              Falta ${{ formatearPrecio(calcularSaldoPendiente(servicio)) }} COP
            </div>

          </div>

          <div
            v-if="!servicio.finalizado"
            class="en-curso"
          >

            <span>
              Servicio en curso
            </span>

            <button
              class="btn-finalizar"
              @click="abrirFinalizar(servicio)"
            >
              Finalizar
            </button>

          </div>

          <div
            v-else
            class="resultado-final"
          >

            <span
              v-if="servicio.calificacion <= 2"
              class="calificacion-baja"
            >
              ⚠ Calificación baja
              ({{ servicio.calificacion }}/5)
            </span>

            <span
              v-else
              class="calificacion-alta"
            >
              ★ {{ servicio.calificacion }}/5
            </span>

          </div>

          <p
            v-if="servicio.finalizado && servicio.observaciones"
            class="observaciones"
          >
            {{ servicio.observaciones }}
          </p>

          <div class="acciones">

            <button
              @click="abrirModalEditar(servicio)"
            >
              ✎ Editar
            </button>

            <button
              class="eliminar"
              @click="abrirConfirmacion(servicio.id)"
            >
              🗑 Eliminar
            </button>

          </div>

        </div>

      </div>

      <div class="promo-banner">

        <div>

          <p class="eyebrow">
            EXCELENCIA BARBER STUDIO
          </p>

          <h3 class="serif">
            Detalle, estilo y precisión en cada cita.
          </h3>

          <p>
            Cada corte registrado queda archivado con métricas de productividad por barbero,
            asegurando la fidelidad de nuestros clientes VIP.
          </p>

        </div>

        <div class="promo-stats">

          <div>
            <b>4.9/5.0</b>
            <span>Satisfacción</span>
          </div>

          <div>
            <b>32 min</b>
            <span>Tiempo promedio</span>
          </div>

          <div>
            <b>✨</b>
            <span>Servicio VIP</span>
          </div>

        </div>

      </div>

    </main>

    <!-- MODAL: REGISTRAR / EDITAR -->

    <div
      v-if="mostrarmodal"
      class="overlay"
      @click.self="cerrarModal"
    >

      <div class="modal">

        <button
          class="modal-close"
          @click="cerrarModal"
        >
          ✕
        </button>

        <p class="modal-eyebrow">
          Atención de barbería
        </p>

        <h2 class="serif">
          {{ idEditando === null
            ? 'Registrar Servicio'
            : 'Editar Servicio' }}
        </h2>

        <p class="desc">
          Ingresa los detalles de la atención para control de turnos y facturación.
        </p>

        <form @submit.prevent="guardarServicio">

          <label>Nombre del cliente</label>

          <input
            type="text"
            v-model="formulario.cliente"
            :disabled="guardando"
            placeholder="Ej. Alejandro Restrepo"
          >

          <label>Teléfono del cliente</label>

          <input
            type="tel"
            v-model="formulario.telefono"
            :disabled="guardando"
            placeholder="Ej: 3001234567"
          >

          <label>Tipo de servicio</label>

          <select
            v-model="formulario.tipoServicio"
            @change="actualizarPrecio"
            :disabled="guardando"
          >

            <option value="">
              Seleccione un servicio
            </option>

            <option
              v-for="tipo in tiposServicio"
              :key="tipo"
              :value="tipo"
            >
              {{ tipo }}
            </option>

          </select>

          <label>Barbero asignado</label>

          <select
            v-model="formulario.barbero"
            :disabled="guardando"
          >

            <option value="">
              Seleccione un barbero
            </option>

            <option
              v-for="barbero in barberos"
              :key="barbero"
              :value="barbero"
            >
              {{ barbero }}
            </option>

          </select>

          <div class="fila-doble">

            <div>

              <label>Fecha</label>

              <input
                type="date"
                v-model="formulario.fecha"
                :min="obtenerFechaMinima()"
                :disabled="guardando"
              >

            </div>

            <div>

              <label>Hora</label>

              <input
                type="time"
                v-model="formulario.hora"
                :min="obtenerHoraMinima()"
                :max="obtenerHoraMaxima()"
                :disabled="guardando"
              >

            </div>

          </div>

          <label>Precio</label>

          <input
            type="number"
            v-model="formulario.precio"
            :disabled="guardando"
          >

          <p
            v-if="formulario.precio > 0"
            class="precio-preview"
          >
            Se guardará como:
            ${{ formatearPrecio(formulario.precio) }} COP
          </p>

          <label>Método de pago</label>

          <select
            v-model="formulario.metodoPago"
            :disabled="guardando"
          >

            <option value="">
              Seleccione un método
            </option>

            <option value="Efectivo">
              Efectivo
            </option>

            <option value="Trasferencia">
              Transferencia
            </option>

            <option value="Tarjeta">
              Tarjeta
            </option>

          </select>

          <label>Estado del pago</label>

          <div class="estado-pago-grupo">

            <button
              type="button"
              :disabled="guardando"
              class="estado-btn"
              :class="{
                selected: formulario.estadoPago === 'Pagado',
                'pagado-sel': formulario.estadoPago === 'Pagado'
              }"
              @click="formulario.estadoPago = 'Pagado'"
            >
              Pagado
            </button>

            <button
              type="button"
              :disabled="guardando"
              class="estado-btn"
              :class="{
                selected: formulario.estadoPago === 'Pendiente',
                'pendiente-sel': formulario.estadoPago === 'Pendiente'
              }"
              @click="formulario.estadoPago = 'Pendiente'"
            >
              Pendiente
            </button>

            <button
              type="button"
              :disabled="guardando"
              class="estado-btn"
              :class="{
                selected: formulario.estadoPago === 'abonado',
                'abonado-sel': formulario.estadoPago === 'abonado'
              }"
              @click="formulario.estadoPago = 'abonado'"
            >
              Abonado
            </button>

          </div>

          <!-- este bloque solo aparece si escogieron "abonado" -->

          <div v-if="formulario.estadoPago === 'abonado'">

            <label>
              ¿Cuánto abonó?
            </label>

            <input
              type="number"
              v-model="formulario.montoAbonado"
              :disabled="guardando"
            >

          </div>

          <p
            v-if="mensajeEror"
            class="msg-error"
          >
            ⚠ {{ mensajeEror }}
          </p>

          <p
            v-if="guardando"
            class="msg-guardando"
          >
            <span class="spinner"></span>
            Guardando el servicio, un momento...
          </p>

          <div class="botones-form">

            <button
              type="submit"
              class="btn-guardar"
              :disabled="guardando"
            >
              {{ guardando
                ? 'Guardando...'
                : 'Guardar Servicio' }}
            </button>

            <button
              type="button"
              class="btn-cancelar"
              @click="cerrarModal"
              :disabled="guardando"
            >
              Cancelar
            </button>

          </div>

        </form>

      </div>

    </div>

    <!-- MODAL: FINALIZAR -->

    <div
      v-if="mostrarModalFinalizar && obtenerServicioFinalizando()"
      class="overlay"
      @click.self="cerrarFinalizar"
    >

      <div class="modal">

        <button
          class="modal-close"
          @click="cerrarFinalizar"
        >
          ✕
        </button>

        <p class="modal-eyebrow">
          Cierre de ticket
        </p>

        <h2 class="serif">
          Finalizar Servicio
        </h2>

        <p class="desc">
          Registra cómo quedó el cliente y completa la auditoría de calidad de la atención.
        </p>

        <div class="ticket-box">

          <div class="ticket-left">

            <div class="cliente-avatar">
              {{ inicialesCliente(obtenerServicioFinalizando().cliente) }}
            </div>

            <div>

              <b>
                {{ obtenerServicioFinalizando().cliente }}
              </b>

              <span>
                {{ obtenerServicioFinalizando().tipoServicio }}
                · Atendido por
                {{ obtenerServicioFinalizando().barbero }}
              </span>

            </div>

          </div>

          <div class="monto">

            <span>
              Monto total
            </span>

            <b>
              ${{ formatearPrecio(obtenerServicioFinalizando().precio) }}
            </b>

          </div>

        </div>

        <label
          style="margin-top:0;text-align:center;display:block"
        >
          Calificación del cliente
        </label>

        <div class="estrellas">

          <button
            type="button"
            v-for="estrella in 5"
            :key="estrella"
            @click="ponerCalificacion(estrella)"
          >

            <span
              :class="{
                filled: estrella <= calificacionFinal
              }"
            >
              ★
            </span>

          </button>

        </div>

        <p class="calif-caption">
          Pulsa sobre una estrella para calificar
        </p>

        <label>
          Observaciones (opcional)
        </label>

        <textarea
          v-model="observacionesFinal"
          :disabled="guardandoFinalizacion"
          placeholder="Detalles del corte, estilo preferido o notas para su próxima visita..."
        ></textarea>

        <p
          v-if="guardandoFinalizacion"
          class="msg-guardando"
        >
          <span class="spinner"></span>
          Guardando...
        </p>

        <div class="botones-form">

          <button
            type="button"
            class="btn-guardar"
            :disabled="guardandoFinalizacion"
            @click="guardarFinalizacion"
          >
            {{ guardandoFinalizacion
              ? 'Guardando...'
              : 'Guardar y Finalizar' }}
          </button>

          <button
            type="button"
            class="btn-cancelar"
            :disabled="guardandoFinalizacion"
            @click="cerrarFinalizar"
          >
            Cancelar
          </button>

        </div>

      </div>

    </div>

    <!-- MODAL: CONFIRMAR ELIMINACIÓN -->

    <div
      v-if="mostrarConfirmacion"
      class="overlay"
      @click.self="mostrarConfirmacion = false"
    >

      <div class="modal confirm-modal">

        <div class="confirm-icon"></div>

        <h2 class="serif">
          ¿Eliminar servicio?
        </h2>

        <p class="desc">
          ¿Estás seguro de eliminar este servicio?
          Esta acción no se puede deshacer.
        </p>

        <div class="botones-form">

          <button
            class="btn-guardar btn-danger"
            @click="confirmarEliminacion"
          >
            Sí, eliminar
          </button>

          <button
            class="btn-cancelar"
            @click="mostrarConfirmacion = false"
          >
            Cancelar
          </button>

        </div>

      </div>

    </div>

  </div>

</template>
<style>
@import url('https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,wght@0,400..900;1,400..900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
body{
  padding: 0;
}
.gale-app {
  --gold: #D4AF37;
  --gold-soft: #E9CE86;
  --bronze: #C59A6F;
  --mint: #34D399;
  --coral: #E2725B;
  --panel-1: #17171B;
  --panel-2: #1D1D22;
  --line: #2A2A30;
  --line-soft: #232328;
  --text: #ECE8DF;
  --text-dim: #9C9AA3;
  font-family: 'Plus Jakarta Sans', sans-serif;
  background: radial-gradient(ellipse at top left, #17151B 0%, #0B0B0D 55%, #08080A 100%);
  color: var(--text);
  min-height: 100vh;
  display: flex;
  position: relative;
  
}
.gale-app * { box-sizing: border-box; }
.gale-app .serif { font-family: 'Bodoni Moda', serif; }

.gale-app::before {
  content: "";
  position: fixed; inset: 0;
  background-image: radial-gradient(rgba(212,175,55,0.07) 1px, transparent 1px);
  background-size: 26px 26px;
  pointer-events: none;
  z-index: 0;
}

.sidebar {
  width: 236px;
  flex-shrink: 0;
  background: #111114;
  border-right: 1px solid var(--line);
  padding: 28px 18px;
  display: flex;
  flex-direction: column;
  gap: 26px;
  position: relative;
  z-index: 1;
}
.brand { display: flex; align-items: center; gap: 12px; padding: 0 6px; }
.brand-mark {
  width: 40px; height: 40px; border-radius: 9px;
  background: linear-gradient(160deg, #26241C, #171612);
  border: 1px solid var(--line);
  display: flex; align-items: center; justify-content: center;
  color: var(--gold); font-size: 1.1rem;
}
.brand h1 { font-size: 1.15rem; letter-spacing: 0.06em; margin: 0; color: var(--gold-soft); font-weight: 600; }
.brand p { font-size: 0.62rem; letter-spacing: 0.22em; margin: 1px 0 0; color: var(--text-dim); text-transform: uppercase; }

.turno-activo {
  display: flex; align-items: center; gap: 8px;
  font-size: 0.72rem; color: var(--mint);
  background: rgba(52,211,153,0.08);
  border: 1px solid rgba(52,211,153,0.25);
  border-radius: 8px; padding: 8px 10px;
}
.turno-activo .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--mint); box-shadow: 0 0 8px var(--mint); }
.turno-activo .time { margin-left: auto; color: var(--text-dim); }

.nav-list { display: flex; flex-direction: column; gap: 3px; margin-top: 4px; }
.nav-item {
  padding: 10px 12px; border-radius: 9px;
  font-size: 0.86rem; color: var(--text-dim);
  border: 1px solid transparent;
}
.nav-item.active {
  background: rgba(212,175,55,0.1);
  border-color: rgba(212,175,55,0.28);
  color: var(--gold-soft);
}

.sidebar-foot { margin-top: auto; border-top: 1px solid var(--line); padding-top: 16px; }
.capacidad-label { display: flex; justify-content: space-between; font-size: 0.72rem; color: var(--text-dim); margin-bottom: 6px; }
.capacidad-bar { height: 6px; border-radius: 4px; background: #232327; overflow: hidden; }
.capacidad-fill { height: 100%; background: linear-gradient(90deg, var(--bronze), var(--gold)); width: 80%; }

.main { flex: 1; padding: 26px 34px 60px; position: relative; z-index: 1; min-width: 0; }

.topbar { display: flex; align-items: center; gap: 14px; margin-bottom: 26px; flex-wrap: wrap; }
.pill {
  display: flex; align-items: center; gap: 8px;
  background: var(--panel-1); border: 1px solid var(--line);
  padding: 8px 14px; border-radius: 999px; font-size: 0.78rem; color: var(--text-dim);
}
.pill.mint { color: var(--mint); }
.topbar-spacer { flex: 1; }
.icon-btn {
  width: 38px; height: 38px; border-radius: 10px;
  border: 1px solid var(--line); background: var(--panel-1);
  display: flex; align-items: center; justify-content: center;
  color: var(--text-dim); font-size: 0.9rem;
}
.profile { display: flex; align-items: center; gap: 10px; padding-left: 8px; }
.profile-avatar {
  width: 38px; height: 38px; border-radius: 50%;
  background: linear-gradient(145deg, var(--gold-soft), var(--bronze));
  display: flex; align-items: center; justify-content: center;
  color: #17140C; font-weight: 700; font-size: 0.8rem;
}
.profile-name { font-size: 0.82rem; font-weight: 600; color: var(--text); line-height: 1.1; }
.profile-role { font-size: 0.68rem; color: var(--text-dim); }

.header-row { display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; margin-bottom: 24px; flex-wrap: wrap; }
.header-eyebrow { font-size: 0.72rem; letter-spacing: 0.12em; color: var(--gold); margin: 0 0 8px; }
.header-row h2 { font-size: 2rem; margin: 0; font-weight: 500; line-height: 1.1; }
.header-row h2 em { font-style: italic; color: var(--gold-soft); }
.header-row p.sub { color: var(--text-dim); margin: 10px 0 0; max-width: 46ch; font-size: 0.92rem; }
.btn-nuevo {
  background: linear-gradient(180deg, var(--gold-soft), var(--gold));
  color: #1A1509; border: none; font-weight: 700;
  padding: 13px 20px; border-radius: 11px; font-size: 0.88rem;
  cursor: pointer; box-shadow: 0 8px 22px -8px rgba(212,175,55,0.55);
  white-space: nowrap;
}
.btn-nuevo:hover { filter: brightness(1.05); }

.stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 30px; }
.stat-card { background: linear-gradient(165deg, var(--panel-2), var(--panel-1)); border: 1px solid var(--line); border-radius: 14px; padding: 20px; }
.stat-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.stat-icon {
  width: 34px; height: 34px; border-radius: 9px; background: rgba(212,175,55,0.1);
  border: 1px solid rgba(212,175,55,0.22); display: flex; align-items: center; justify-content: center; font-size: 0.9rem;
}
.stat-label { font-size: 0.76rem; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.06em; }
.stat-value { font-size: 2.1rem; font-weight: 600; font-family: 'Bodoni Moda', serif; }
.stat-value small { font-size: 1rem; color: var(--text-dim); font-family: 'Plus Jakarta Sans', sans-serif; margin-left: 6px; }
.stat-money { font-size: 1.7rem; font-weight: 600; font-family: 'Bodoni Moda', serif; color: var(--mint); }
.stat-btn { margin-top: 10px; background: none; border: 1px solid var(--line); color: var(--text-dim); font-size: 0.76rem; padding: 7px 12px; border-radius: 8px; cursor: pointer; }
.stat-btn:hover { border-color: var(--gold); color: var(--gold-soft); }

.section-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap; gap: 10px; }
.section-head h3 { font-family: 'Bodoni Moda', serif; font-size: 1.3rem; font-weight: 500; margin: 0; }
.section-head .count { color: var(--text-dim); font-weight: 400; font-size: 0.9rem; font-family: 'Plus Jakarta Sans', sans-serif; margin-left: 8px; }
.filtros { display: flex; gap: 6px; flex-wrap: wrap; }
.filtro-btn { border: 1px solid var(--line); background: var(--panel-1); color: var(--text-dim); font-size: 0.76rem; padding: 6px 12px; border-radius: 8px; cursor: pointer; }
.filtro-btn.active { border-color: var(--gold); color: var(--gold-soft); background: rgba(212,175,55,0.08); }

.sin-registros { border: 1px dashed var(--line); border-radius: 14px; padding: 40px; text-align: center; color: var(--text-dim); font-size: 0.9rem; }

.servicios-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 16px; margin-bottom: 30px; }
.tarjeta {
  background: var(--panel-1); border: 1px solid var(--line); border-radius: 14px;
  padding: 18px; display: flex; flex-direction: column; gap: 8px; border-top: 2px solid var(--line);
}
.tarjeta.pagado { border-top-color: var(--mint); }
.tarjeta.abonado { border-top-color: var(--gold); }
.tarjeta.pendiente { border-top-color: var(--coral); }
.tarjeta-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px; }
.tarjeta-header h4 { font-family: 'Bodoni Moda', serif; font-size: 1.15rem; font-weight: 500; margin: 0; }
.badge { font-size: 0.68rem; padding: 4px 9px; border-radius: 999px; font-weight: 600; white-space: nowrap; }
.badge-pagado { background: rgba(52,211,153,0.12); color: var(--mint); border: 1px solid rgba(52,211,153,0.3); }
.badge-pendiente { background: rgba(226,114,91,0.12); color: #EF9784; border: 1px solid rgba(226,114,91,0.32); }
.badge-abonado { background: rgba(212,175,55,0.12); color: var(--gold-soft); border: 1px solid rgba(212,175,55,0.32); }
.tarjeta-row { display: flex; align-items: center; gap: 7px; font-size: 0.82rem; color: var(--text-dim); }
.tarjeta-row b { color: var(--text); font-weight: 500; }
.tarjeta-precio { font-family: 'Bodoni Moda', serif; font-size: 1.25rem; margin-top: 2px; }
.info-abono { background: rgba(212,175,55,0.07); border: 1px solid rgba(212,175,55,0.2); border-radius: 9px; padding: 8px 11px; font-size: 0.78rem; margin-top: 2px; }
.info-abono .falta { color: #EF9784; font-weight: 600; margin-top: 2px; }
.en-curso {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  background: rgba(255,255,255,0.03); border: 1px solid var(--line-soft);
  border-radius: 10px; padding: 9px 12px; margin-top: 4px;
}
.en-curso span { font-size: 0.78rem; color: var(--text-dim); }
.btn-finalizar {
  background: linear-gradient(180deg, var(--gold-soft), var(--gold));
  color: #1A1509; border: none; font-weight: 700; font-size: 0.76rem;
  padding: 8px 12px; border-radius: 8px; cursor: pointer; white-space: nowrap;
}
.resultado-final { display: flex; align-items: center; justify-content: space-between; margin-top: 4px; }
.calificacion-alta { color: var(--gold-soft); font-size: 0.85rem; font-weight: 600; }
.calificacion-baja { color: #EF9784; font-size: 0.8rem; font-weight: 600; display: flex; align-items: center; gap: 5px; }
.observaciones { font-size: 0.78rem; color: var(--text-dim); font-style: italic; margin-top: 2px; border-left: 2px solid var(--line); padding-left: 8px; }
.acciones { display: flex; gap: 8px; margin-top: 8px; }
.acciones button {
  flex: 1; background: transparent; border: 1px solid var(--line); color: var(--text-dim);
  font-size: 0.78rem; padding: 8px; border-radius: 8px; cursor: pointer;
}
.acciones button:hover { border-color: var(--gold); color: var(--gold-soft); }
.acciones button.eliminar:hover { border-color: #E2725B; color: #EF9784; }

.promo-banner {
  border: 1px solid var(--line); border-radius: 16px; overflow: hidden;
  background: linear-gradient(120deg, #1B1A16 0%, #141316 60%);
  display: flex; align-items: center; justify-content: space-between;
  padding: 30px 34px; gap: 20px; flex-wrap: wrap;
}
.promo-banner .eyebrow { color: var(--gold); font-size: 0.72rem; letter-spacing: 0.14em; margin: 0 0 8px; }
.promo-banner h3 { font-family: 'Bodoni Moda', serif; font-size: 1.7rem; font-weight: 500; margin: 0 0 8px; max-width: 20ch; }
.promo-banner p { color: var(--text-dim); font-size: 0.86rem; max-width: 40ch; margin: 0; }
.promo-stats { display: flex; gap: 26px; }
.promo-stats div { text-align: center; }
.promo-stats b { font-family: 'Bodoni Moda', serif; font-size: 1.35rem; display: block; color: var(--gold-soft); }
.promo-stats span { font-size: 0.7rem; color: var(--text-dim); }

/* modals */
.overlay {
  position: fixed; inset: 0; background: rgba(6,6,8,0.72); backdrop-filter: blur(3px);
  display: flex; align-items: center; justify-content: center; padding: 24px; z-index: 50;
}
.modal {
  background: #141317; border: 1px solid var(--line); border-radius: 18px;
  width: 100%; max-width: 480px; padding: 28px; max-height: 88vh; overflow-y: auto; position: relative;
}
.modal-close {
  position: absolute; top: 20px; right: 20px; width: 30px; height: 30px;
  border-radius: 8px; border: 1px solid var(--line); background: var(--panel-1);
  color: var(--text-dim); display: flex; align-items: center; justify-content: center; cursor: pointer;
}
.modal-eyebrow { font-size: 0.68rem; letter-spacing: 0.14em; color: var(--gold); margin: 0 0 6px; text-transform: uppercase; }
.modal h2 { font-family: 'Bodoni Moda', serif; font-weight: 500; font-size: 1.5rem; margin: 0 0 6px; }
.modal > .desc { color: var(--text-dim); font-size: 0.85rem; margin: 0 0 20px; }

.modal label { display: block; font-size: 0.78rem; color: var(--text-dim); margin: 14px 0 6px; }
.modal input, .modal select, .modal textarea {
  width: 100%; background: #0F0F12; border: 1px solid var(--line); color: var(--text);
  padding: 11px 13px; border-radius: 9px; font-size: 0.88rem; font-family: inherit;
}
.modal input:focus, .modal select:focus, .modal textarea:focus { outline: none; border-color: var(--gold); }
.modal input:disabled, .modal select:disabled, .modal textarea:disabled { opacity: 0.55; }
.modal textarea { min-height: 80px; resize: vertical; }
.fila-doble { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.precio-preview { font-size: 0.76rem; color: var(--text-dim); margin: 6px 2px 0; }

.estado-pago-grupo { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 6px; }
.estado-btn { border: 1px solid var(--line); background: var(--panel-1); color: var(--text-dim); padding: 10px 6px; border-radius: 9px; font-size: 0.78rem; cursor: pointer; text-align: center; }
.estado-btn.pagado-sel { border-color: var(--mint); color: var(--mint); background: rgba(52,211,153,0.08); }
.estado-btn.pendiente-sel { border-color: #E2725B; color: #EF9784; background: rgba(226,114,91,0.08); }
.estado-btn.abonado-sel { border-color: var(--gold); color: var(--gold-soft); background: rgba(212,175,55,0.08); }

.msg-error { display: flex; align-items: center; gap: 7px; background: rgba(226,114,91,0.1); border: 1px solid rgba(226,114,91,0.3); color: #EF9784; padding: 10px 12px; border-radius: 9px; font-size: 0.8rem; margin-top: 16px; }
.msg-guardando { color: var(--gold-soft); font-size: 0.8rem; margin-top: 12px; display: flex; align-items: center; gap: 8px; }
.spinner { width: 13px; height: 13px; border-radius: 50%; border: 2px solid rgba(212,175,55,0.25); border-top-color: var(--gold); animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.botones-form { display: flex; gap: 10px; margin-top: 22px; }
.btn-guardar { flex: 1; background: linear-gradient(180deg, var(--gold-soft), var(--gold)); color: #1A1509; border: none; font-weight: 700; padding: 12px; border-radius: 10px; font-size: 0.86rem; cursor: pointer; }
.btn-guardar.btn-danger { background: linear-gradient(180deg, #EF9784, #E2725B); }
.btn-guardar:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-cancelar { flex: 1; background: transparent; border: 1px solid var(--line); color: var(--text-dim); font-weight: 600; padding: 12px; border-radius: 10px; font-size: 0.86rem; cursor: pointer; }
.btn-cancelar:disabled { opacity: 0.5; }

.ticket-box { background: #0F0F12; border: 1px solid var(--line); border-radius: 12px; padding: 14px 16px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
.ticket-left { display: flex; align-items: center; }
.ticket-box .cliente-avatar { width: 34px; height: 34px; border-radius: 9px; background: rgba(212,175,55,0.12); color: var(--gold-soft); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.82rem; margin-right: 10px; }
.ticket-left div b { font-size: 0.92rem; display: block; }
.ticket-left div span { font-size: 0.74rem; color: var(--text-dim); }
.ticket-box .monto { text-align: right; }
.ticket-box .monto span { display: block; font-size: 0.66rem; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.05em; }
.ticket-box .monto b { font-family: 'Bodoni Moda', serif; font-size: 1.2rem; color: var(--gold-soft); }

.estrellas { display: flex; gap: 8px; justify-content: center; padding: 14px 0 6px; }
.estrellas button { background: none; border: none; cursor: pointer; padding: 2px; font-size: 1.8rem; line-height: 1; color: #3B3A40; }
.estrellas button span.filled { color: var(--gold); }
.estrellas button:hover { transform: scale(1.08); }
.calif-caption { text-align: center; font-size: 0.76rem; color: var(--text-dim); margin-bottom: 4px; }

.confirm-modal { max-width: 380px; }
.confirm-icon { width: 44px; height: 44px; border-radius: 12px; background: rgba(226,114,91,0.12); border: 1px solid rgba(226,114,91,0.3); display: flex; align-items: center; justify-content: center; color: #EF9784; margin-bottom: 14px; font-size: 1.2rem; }

@media (max-width: 900px) {
  .sidebar { display: none; }
  .main { padding: 20px 16px 50px; }
  .stats-row { grid-template-columns: 1fr; }
  .fila-doble, .estado-pago-grupo { grid-template-columns: 1fr; }
  .promo-banner { flex-direction: column; align-items: flex-start; }
}
</style>