<script setup>
import { ref } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import Swal from 'sweetalert2'
// //limpiar el local
// localStorage.removeItem('servicios-barberia')
// localStorage.removeItem('reservas-barberia')
// location.reload()

const servicios = useLocalStorage('servicios-barberia', [])
const reservas = useLocalStorage('reservas-barberia', [])

const barberos = ['Ramiro', 'Julian', 'Mario']

const tiposServicio = [
  'Low Taper Fade',
  'Butterfly Cut (Corte Mariposa)',
  'Neo-Mullet / Short Mullet',
  'Clavicut',
  'Crop Texturizado',
  'Shaggy / Wolf Cut',
  'Soft Slick Back / Bro Flow',
  'Bob con Flequillo Cortina',
  'Buzz Cut'
]

const preciosServicio = {
  'Low Taper Fade': 20000,
  'Butterfly Cut (Corte Mariposa)': 30000,
  'Neo-Mullet / Short Mullet': 28000,
  'Clavicut': 25000,
  'Crop Texturizado': 26000,
  'Shaggy / Wolf Cut': 30000,
  'Soft Slick Back / Bro Flow': 22000,
  'Bob con Flequillo Cortina': 28000,
  'Buzz Cut': 15000
}

const duracionServicio = {
  'Low Taper Fade': 45,
  'Butterfly Cut (Corte Mariposa)': 60,
  'Neo-Mullet / Short Mullet': 50,
  'Clavicut': 45,
  'Crop Texturizado': 45,
  'Shaggy / Wolf Cut': 60,
  'Soft Slick Back / Bro Flow': 40,
  'Bob con Flequillo Cortina': 50,
  'Buzz Cut': 20
}

const descansobarbero = {
  'Ramiro': [1, 2],
  'Julian': [3, 4],
  'Mario': [5, 0]
}

const preciosAdicionales = {
  'Masaje Facial': 8000,
  'Perfilada De Cejas': 5000,
  'Decoloración': 20000,
  'Mascarilla Facial': 10000,
  'Baño De Pelo': 12000,
  'Diseño De Barba': 10000,
  'Retoque De Barba': 6000
}
const listaAdicionales = Object.keys(preciosAdicionales)

const menuAlcohol = [
  { nombre: 'Cerveza Nacional', precio: 7000 },
  { nombre: 'Cerveza Importada', precio: 12000 },
  { nombre: 'Cerveza Artesanal', precio: 15000 },
  { nombre: 'Michelada Clásica', precio: 10000 },
  { nombre: 'Michelada De Sabores', precio: 13000 },
  { nombre: 'Michelada Con Clamato', precio: 16000 },
  { nombre: 'Whisky En Las Rocas', precio: 22000 },
  { nombre: 'Ron Añejo', precio: 15000 },
  { nombre: 'Crema De Whisky', precio: 17000 },
  { nombre: 'Gin-Tonic', precio: 27000 },
  { nombre: 'Copa De Vino Tinto', precio: 18000 }
]
const menuFrias = [
  { nombre: 'Gaseosa', precio: 5000 },
  { nombre: 'Agua Mineral', precio: 3500 },
  { nombre: 'Agua Con Gas', precio: 4000 },
  { nombre: 'Energizante', precio: 12000 },
  { nombre: 'Té Frío', precio: 6000 },
  { nombre: 'Agua Tónica', precio: 6000 },
  { nombre: 'Granizado Sin Alcohol', precio: 10000 },
  { nombre: 'Jugo Embotellado', precio: 5000 }
]
const menuCalientes = [
  { nombre: 'Café Espresso', precio: 4000 },
  { nombre: 'Café Americano', precio: 5000 },
  { nombre: 'Capuchino', precio: 7000 },
  { nombre: 'Moca', precio: 8000 },
  { nombre: 'Café Con Leche', precio: 6000 },
  { nombre: 'Carajillo', precio: 12000 },
  { nombre: 'Chocolate Caliente', precio: 7000 },
  { nombre: 'Té Verde', precio: 5000 },
  { nombre: 'Infusión De Frutas', precio: 5000 }
]
const menuSnacks = [
  { nombre: 'Mix De Frutos Secos', precio: 4500 },
  { nombre: 'Papas O Snack De Paquete', precio: 4500 },
  { nombre: 'Platanitos Con Dip', precio: 8000 },
  { nombre: 'Tabla De Quesos Y Jamón', precio: 22000 },
  { nombre: 'Galletas', precio: 3500 },
  { nombre: 'Chocolate O Barra De Cereal', precio: 4500 },
  { nombre: 'Gomitas', precio: 3500 }
]

function formularioVacio() {
  return {
    id: null,
    cliente: '',
    telefono: '',
    tipoServicio: '',
    barbero: '',
    fecha: '',
    hora: '',
    precioBase: 0,
    adicionales: [],
    consumos: [],
    playlist: '',
    metodoPago: '',
    estadoPago: '',
    montoAbonado: 0,
    calificacion: 0,
    observaciones: '',
    finalizado: false
  }
}

function reservaVacia() {
  return {
    id: null,
    cliente: '',
    telefono: '',
    tipoServicio: '',
    barbero: '',
    fecha: '',
    hora: ''
  }
}

const formulario = ref(formularioVacio())
const reservaFormulario = ref(reservaVacia())

const mostrarmodal = ref(false)
const idEditando = ref(null)
const mostrarModalReserva = ref(false)
const mensajeErorReserva = ref('')
const guardandoReserva = ref(false)

const mostrarConfirmacion = ref(false)
const idEliminar = ref(null)
const tipoEliminar = ref('servicio')

const mensajeEror = ref('')
const resumenDia = ref(0)
const resumenVisible = ref(false)
const guardando = ref(false)
const mostrarModalFinalizar = ref(false)
const idFinalizando = ref(null)
const calificacionFinal = ref(0)
const observacionesFinal = ref('')
const guardandoFinalizacion = ref(false)
const serviciosHechosHoy = ref(0)
const serviciosReservaHoy = ref(0)
const serviciosMes = ref(0)
const filtroBarbero = ref('Todos')
const busquedaTexto = ref('')

// muestra un toast centrado con el estilo dorado de la barberia
function alertaExito(mensaje) {
  Swal.fire({
    position: "center",
    icon: "success",
    title: mensaje,
    showConfirmButton: false,
    timer: 1500,
    customClass: {
      popup: 'swal-gale-popup',
      title: 'swal-gale-title'
    }
  })
}

function contarCortesCliente(telefono) {
  let total = 0
  for (let i = 0; i < servicios.value.length; i++) {
    if (servicios.value[i].telefono === telefono && servicios.value[i].finalizado) {
      total = total + 1
    }
  }
  return total
}

function obtenerRangoCliente(telefono) {
  const cortes = contarCortesCliente(telefono)
  if (cortes >= 20) {
    return { nombre: 'Symetry Elite', cortes: cortes, puedeAbonar: true, puedePendiente: true, corteGratisDisponible: cortes % 5 === 0 }
  }
  if (cortes >= 10) {
    return { nombre: 'Symetry', cortes: cortes, puedeAbonar: true, puedePendiente: true, corteGratisDisponible: false }
  }
  if (cortes >= 5) {
    return { nombre: 'Frecuente', cortes: cortes, puedeAbonar: true, puedePendiente: false, corteGratisDisponible: false }
  }
  return { nombre: 'Nuevo', cortes: cortes, puedeAbonar: false, puedePendiente: false, corteGratisDisponible: false }
}

function obtenerListaVisible() {
  let lista = servicios.value
  if(filtroBarbero.value !== 'Todos') {
    lista = lista.filter(function (s) {
      return s.barbero === filtroBarbero.value
    })
  }
  if (busquedaTexto.value.trim() !== ''){
    const texto = busquedaTexto.value.toLowerCase()
    lista = lista.filter(function (s){
      return s.cliente.toLowerCase().includes(texto) || s.telefono.includes(texto)
    })
  }
  return lista
}

function obtenerServicioFinalizando() {
  return servicios.value.find(function (s) {
    return s.id === idFinalizando.value
  }) || null
}

function inicialesCliente(nombre) {
  return nombre.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
}

function actualizarPrecio() {
  formulario.value.precioBase = preciosServicio[formulario.value.tipoServicio]
}

function formatearPrecio(precio) {
  return Number(precio || 0).toLocaleString('es-CO')
}

function calcularSaldoPendiente(servicio) {
  return Number(servicio.precio) - Number(servicio.montoAbonado || 0)
}

function precioConsumo(nombre) {
  const todos = menuAlcohol.concat(menuFrias, menuCalientes, menuSnacks)
  const encontrado = todos.find(function (item) {
    return item.nombre === nombre
  })
  return encontrado ? encontrado.precio : 0
}

function calcularTotalFormulario() {
  let total = Number(formulario.value.precioBase || 0)
  for (let i = 0; i < formulario.value.adicionales.length; i++) {
    total += preciosAdicionales[formulario.value.adicionales[i]] || 0
  }
  for (let i = 0; i < formulario.value.consumos.length; i++) {
    total += precioConsumo(formulario.value.consumos[i])
  }
  return total
}

function toggleAdicional(nombre) {
  const index = formulario.value.adicionales.indexOf(nombre)
  if (index === -1) {
    formulario.value.adicionales.push(nombre)
  } else {
    formulario.value.adicionales.splice(index, 1)
  }
}

function toggleConsumo(nombre) {
  const index = formulario.value.consumos.indexOf(nombre)
  if (index === -1) {
    formulario.value.consumos.push(nombre)
  } else {
    formulario.value.consumos.splice(index, 1)
  }
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

function barberodescansaesedia(barbero, fechaTexto) {
  const fecha = new Date(fechaTexto + 'T00:00:00')
  const diasemana = fecha.getDay()
  return descansobarbero[barbero].includes(diasemana)
}

function barberoDescansaHoy(barbero, fechaTexto) {
  if (fechaTexto === '') return false
  return barberodescansaesedia(barbero, fechaTexto)
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

function generarSlotsDelDia(fechaTexto) {
  if (fechaTexto === '') return []
  const dia = new Date(fechaTexto + 'T00:00:00').getDay()
  const bloques = obtenerbloqueshorario(dia)
  const slots = []
  for (let b = 0; b < bloques.length; b++) {
    let actual = horaaminutos(bloques[b].inicio)
    const fin = horaaminutos(bloques[b].fin)
    while (actual < fin) {
      const horas = String(Math.floor(actual / 60)).padStart(2, '0')
      const minutos = String(actual % 60).padStart(2, '0')
      slots.push(horas + ':' + minutos)
      actual += 30
    }
  }
  return slots
}

function horaOcupada(barbero, fecha, hora, tipoServicio, idExcluir) {
  if (barbero === '' || fecha === '' || tipoServicio === '') return false

  const duracionNueva = duracionServicio[tipoServicio] || 60
  const inicioNuevo = horaaminutos(hora)
  const finNuevo = inicioNuevo + duracionNueva

  const todasLasCitas = servicios.value.concat(reservas.value)

  for (let i = 0; i < todasLasCitas.length; i++) {
    const cita = todasLasCitas[i]
    if (cita.id === idExcluir) continue
    if (cita.barbero !== barbero) continue
    if (cita.fecha !== fecha) continue

    const duracionExistente = duracionServicio[cita.tipoServicio] || 60
    const inicioExistente = horaaminutos(cita.hora)
    const finExistente = inicioExistente + duracionExistente

    if (inicioNuevo < finExistente && inicioExistente < finNuevo) {
      return true
    }
  }
  return false
}

function generarSlotsDisponibles() {
  return generarSlotsDelDia(formulario.value.fecha)
}

function generarSlotsDisponiblesReserva() {
  return generarSlotsDelDia(reservaFormulario.value.fecha)
}

function validarHorario(barbero, fecha, hora, tipoServicio) {
  if (barberodescansaesedia(barbero, fecha)) {
    return barbero + ' descansa ese día'
  }

  const dia = new Date(fecha + 'T00:00:00').getDay()
  const bloques = obtenerbloqueshorario(dia)
  const duracion = duracionServicio[tipoServicio]
  const inicioMinutos = horaaminutos(hora)
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

const horaYaPaso = (fecha, hora) => {
  if (!fecha || !hora) return false
  const ahora = new Date()
  const fechaHora = new Date(`${fecha}T${hora}`)
  return fechaHora <= ahora
}
function diasDesdeAbono(fechaServicio) {
  const fecha = new Date(fechaServicio + 'T00:00:00')
  const hoy = new Date()
  const diferenciaMs = hoy - fecha
  return Math.floor(diferenciaMs / (1000 * 60 * 60 * 24))
}
function generarLinkRecordatorio(servicio) {
  const dias = diasDesdeAbono(servicio.fecha)
  const diasRestantes = 7 - dias
  const saldo = calcularSaldoPendiente(servicio)
  const mensaje = 'Hola ' + servicio.cliente + ', te escribimos de SYMETRY BARBER. ' +
    'Tu corte del ' + servicio.fecha + ' quedó con un saldo pendiente de $' + formatearPrecio(saldo) + ' COP. ' +
    'Te quedan ' + diasRestantes + ' día(s) para cancelarlo. ¡Gracias por confiar en SYMETRY BARBER!'
  const telefonoLimpio = servicio.telefono.replace(/\D/g, '')
  return 'https://wa.me/57' + telefonoLimpio + '?text=' + encodeURIComponent(mensaje)
}

function generarLinkFinalizacion(servicio) {
  let mensaje = 'Hola ' + servicio.cliente + ' 👋 Somos SYMETRY BARBER. Gracias por confiar en nosotros. 💈✂️\n\n'
  mensaje += 'Queremos conocer tu experiencia con tu servicio de hoy.\n\n'
  mensaje += '⭐ ENCUESTA DE SATISFACCIÓN ⭐\n\n'
  mensaje += 'Por favor responde este mensaje con una calificación del 1 al 5:\n'
  mensaje += '1 ⭐ Muy malo\n'
  mensaje += '2 ⭐⭐ Malo\n'
  mensaje += '3 ⭐⭐⭐ Regular\n'
  mensaje += '4 ⭐⭐⭐⭐ Bueno\n'
  mensaje += '5 ⭐⭐⭐⭐⭐ Excelente\n\n'
  mensaje += 'Y si deseas, cuéntanos brevemente qué te pareció el servicio o qué podemos mejorar. ❤️'
  if (servicio.estadoPago === 'abonado') {
    const saldo = calcularSaldoPendiente(servicio)
    mensaje += '\n\nRecuerda que quedó un saldo pendiente de $' + formatearPrecio(saldo) + ' COP. Tienes 7 días para cancelarlo.'
  }
  mensaje += '\n\n¡Te esperamos en tu próxima visita!'
  const telefonoLimpio = servicio.telefono.replace(/\D/g, '')
  return 'https://wa.me/57' + telefonoLimpio + '?text=' + encodeURIComponent(mensaje)
}

function guardarServicio() {
  if (formulario.value.cliente.trim() === "") {
    mensajeEror.value = 'El nombre del cliente es obligatorio'
    return
  }
  if (formulario.value.telefono.trim().length !== 11) {
    mensajeEror.value = 'El teléfono debe tener 11 dígitos'
    return
  }
  if (formulario.value.tipoServicio === '') {
    mensajeEror.value = 'Seleccione un tipo de servicio'
    return
  }
  if (formulario.value.barbero === '') {
    mensajeEror.value = 'Seleccione un barbero'
    return
  }
  if (formulario.value.fecha === '') {
    mensajeEror.value = 'Seleccione una fecha'
    return
  }
  if (formulario.value.hora === '') {
    mensajeEror.value = 'Seleccione una hora'
    return
  }
  if (formulario.value.metodoPago === '') {
    mensajeEror.value = 'Seleccione un método de pago'
    return
  }
  if (formulario.value.estadoPago === '') {
    mensajeEror.value = 'Seleccione un estado de pago'
    return
  }
  if (esFechaPasada(formulario.value.fecha, formulario.value.hora)) {
    mensajeEror.value = 'No puede reservar en una fecha o hora que ya pasó'
    return
  }
  if (idEditando.value !== null) {
    const servicioExistente = servicios.value.find(s => s.id === idEditando.value)
    if (servicioExistente && servicioExistente.finalizado) {
      mensajeEror.value = 'Este servicio ya fue finalizado y no puede editarse'
      return
    }
  }

  const rango = obtenerRangoCliente(formulario.value.telefono)

  if (formulario.value.estadoPago === 'Pendiente' && !rango.puedePendiente) {
    mensajeEror.value = 'Este cliente aún no puede quedar pendiente de pago (rango: ' + rango.nombre + ')'
    return
  }
  if (formulario.value.estadoPago === 'abonado' && !rango.puedeAbonar) {
    mensajeEror.value = 'Este cliente aún no puede abonar (rango: ' + rango.nombre + ')'
    return
  }

  const total = calcularTotalFormulario()

  if (formulario.value.estadoPago === 'abonado') {
    if (formulario.value.montoAbonado <= 0) {
      mensajeEror.value = 'Debe indicar cuánto abonó el cliente'
      return
    }
    if (formulario.value.montoAbonado >= total) {
      mensajeEror.value = 'El abono no puede ser igual o mayor al total'
      return
    }
  }

  const errorHorario = validarHorario(
    formulario.value.barbero,
    formulario.value.fecha,
    formulario.value.hora,
    formulario.value.tipoServicio
  )
  if (errorHorario !== '') {
    mensajeEror.value = errorHorario
    return
  }

  if (horaOcupada(formulario.value.barbero, formulario.value.fecha, formulario.value.hora, formulario.value.tipoServicio, formulario.value.id)) {
    mensajeEror.value = 'Ese barbero ya tiene una cita a esa hora'
    return
  }

  mensajeEror.value = ''
  guardando.value = true

  setTimeout(() => {
    if (formulario.value.estadoPago !== 'abonado') {
      formulario.value.montoAbonado = 0
    }
    formulario.value.precio = calcularTotalFormulario()

    if (idEditando.value === null) {
      formulario.value.id = Date.now()
      formulario.value.finalizado = false
      servicios.value.push({ ...formulario.value })
    } else {
      for (let i = 0; i < servicios.value.length; i++) {
        if (servicios.value[i].id === idEditando.value) {
          servicios.value[i] = { ...formulario.value }
          break
        }
      }
    }
    guardando.value = false
    contarServiciosDelDia()
    contarServiciosDelMes()
    if (resumenVisible.value) {
      verResumenDia()
    }
    mostrarmodal.value = false
    limpiarFormulario()
    alertaExito('Servicio guardado correctamente')
  }, 2000)
}

function limpiarFormulario() {
  formulario.value = formularioVacio()
  idEditando.value = null
  mensajeEror.value = ''
}

function abrirModalNuevo() {
  limpiarFormulario()
  mostrarmodal.value = true
}

function abrirModalEditar(servicio) {
  if (servicio.finalizado) {
    alertaExito('Este servicio ya está finalizado y no puede editarse')
    return
  }
  formulario.value = {
    ...servicio,
    adicionales: servicio.adicionales ? [...servicio.adicionales] : [],
    consumos: servicio.consumos ? [...servicio.consumos] : []
  }
  idEditando.value = servicio.id
  mostrarmodal.value = true
}

function cerrarModal() {
  if (guardando.value) return
  mostrarmodal.value = false
  limpiarFormulario()
}

function abrirConfirmacion(id, tipo) {
  idEliminar.value = id
  tipoEliminar.value = tipo || 'servicio'
  mostrarConfirmacion.value = true
}

function confirmarEliminacion() {
  if (tipoEliminar.value === 'servicio') {
    const servicio = servicios.value.find(s => s.id === idEliminar.value)
    if (servicio && servicio.finalizado) {
      mostrarConfirmacion.value = false
      idEliminar.value = null
      alertaExito('Este servicio ya está finalizado y no puede eliminarse')
      return
    }
    for (let i = 0; i < servicios.value.length; i++) {
      if (servicios.value[i].id === idEliminar.value) {
        servicios.value.splice(i, 1)
        break
      }
    }
    contarServiciosDelDia()
    contarServiciosDelMes()
    if (resumenVisible.value) {
      verResumenDia()
    }
  } else {
    for (let i = 0; i < reservas.value.length; i++) {
      if (reservas.value[i].id === idEliminar.value) {
        reservas.value.splice(i, 1)
        break
      }
    }
  }
  const tipoEliminado = tipoEliminar.value
  mostrarConfirmacion.value = false
  idEliminar.value = null
  alertaExito(tipoEliminado === 'reserva' ? 'Reserva eliminada' : 'Servicio eliminado')
}

function abrirFinalizar(servicio) {
  if (servicio.finalizado) {
    alertaExito('Este servicio ya está finalizado')
    return
  }
  idFinalizando.value = servicio.id
  calificacionFinal.value = servicio.calificacion || 0
  observacionesFinal.value = servicio.observaciones || ''
  mostrarModalFinalizar.value = true
}

function enviarEncuestaWhatsApp() {
  const servicio = obtenerServicioFinalizando()
  if (!servicio) return
  if (servicio.finalizado) {
    alertaExito('Este servicio ya está finalizado')
    return
  }
  const link = generarLinkFinalizacion(servicio)
  window.open(link, '_blank')
  servicio.encuestaEnviada = true
  alertaExito('Encuesta enviada por WhatsApp')
}

function ponerCalificacion(estrella) {
  if (guardandoFinalizacion.value) return
  calificacionFinal.value = estrella
}

function cerrarFinalizar() {
  if (guardandoFinalizacion.value) return
  mostrarModalFinalizar.value = false
  idFinalizando.value = null
}

function guardarFinalizacion() {
    guardandoFinalizacion.value = true
  setTimeout(() => {
    for (let i = 0; i < servicios.value.length; i++) {
      if (servicios.value[i].id === idFinalizando.value) {
        servicios.value[i].calificacion = calificacionFinal.value
        servicios.value[i].observaciones = observacionesFinal.value
        servicios.value[i].finalizado = true
        servicios.value[i].encuestaEnviada = true
        break
      }
    }
    guardandoFinalizacion.value = false
    contarServiciosDelDia()
    contarServiciosDelMes()
    if (resumenVisible.value) {
      verResumenDia()
    }
    mostrarModalFinalizar.value = false
    idFinalizando.value = null
    calificacionFinal.value = 0
    observacionesFinal.value = ''
    alertaExito('Servicio finalizado correctamente')
  }, 1500)
}

function verResumenDia() {
  let total = 0
  const hoy = new Date().toISOString().split('T')[0]
  for (let i = 0; i < servicios.value.length; i++) {
    if (servicios.value[i].fecha === hoy) {
      total += Number(servicios.value[i].precio)
    }
  }
  resumenDia.value = total
  resumenVisible.value = true
}

function contarServiciosDelDia() {
  let hechos = 0
  let reservados = 0
  const hoy = new Date().toISOString().split('T')[0]

  for (let i = 0; i < servicios.value.length; i++) {
    if (servicios.value[i].fecha === hoy) {
      if (servicios.value[i].finalizado) {
        hechos = hechos + 1
      } else {
        reservados = reservados + 1
      }
    }
  }

  serviciosHechosHoy.value = hechos
  serviciosReservaHoy.value = reservados
}

function contarServiciosDelMes() {
  let total = 0
  const hoy = new Date()
  const mesActual = hoy.getMonth()
  const anioActual = hoy.getFullYear()

  for (let i = 0; i < servicios.value.length; i++) {
    const fechaServicio = new Date(servicios.value[i].fecha + 'T00:00:00')
    if (fechaServicio.getMonth() === mesActual && fechaServicio.getFullYear() === anioActual) {
      total = total + 1
    }
  }
  serviciosMes.value = total
}

function abrirModalReserva() {
  reservaFormulario.value = reservaVacia()
  mensajeErorReserva.value = ''
  mostrarModalReserva.value = true
}

function cerrarModalReserva() {
  if (guardandoReserva.value) return
  mostrarModalReserva.value = false
}

function guardarReserva() {
  if (reservaFormulario.value.cliente.trim() === "") {
    mensajeErorReserva.value = 'El nombre del cliente es obligatorio'
    return
  }
  if (reservaFormulario.value.telefono.trim().length !== 10) {
    mensajeErorReserva.value = 'El teléfono debe tener 10 dígitos'
    return
  }
  if (reservaFormulario.value.tipoServicio === '') {
    mensajeErorReserva.value = 'Seleccione un tipo de servicio'
    return
  }
  if (reservaFormulario.value.barbero === '') {
    mensajeErorReserva.value = 'Seleccione un barbero'
    return
  }
  if (reservaFormulario.value.fecha === '') {
    mensajeErorReserva.value = 'Seleccione una fecha'
    return
  }
  if (reservaFormulario.value.hora === '') {
    mensajeErorReserva.value = 'Seleccione una hora'
    return
  }
  if (esFechaPasada(reservaFormulario.value.fecha, reservaFormulario.value.hora)) {
    mensajeErorReserva.value = 'No puede reservar en una fecha u hora que ya pasó'
    return
  }

  const errorHorario = validarHorario(
    reservaFormulario.value.barbero,
    reservaFormulario.value.fecha,
    reservaFormulario.value.hora,
    reservaFormulario.value.tipoServicio
  )
  if (errorHorario !== '') {
    mensajeErorReserva.value = errorHorario
    return
  }

  if (horaOcupada(reservaFormulario.value.barbero, reservaFormulario.value.fecha, reservaFormulario.value.hora, reservaFormulario.value.tipoServicio, null)) {
    mensajeErorReserva.value = 'Ese barbero ya tiene una cita a esa hora'
    return
  }

  mensajeErorReserva.value = ''
  guardandoReserva.value = true

  setTimeout(() => {
    reservaFormulario.value.id = Date.now()
    reservas.value.push({ ...reservaFormulario.value })
    guardandoReserva.value = false
    mostrarModalReserva.value = false
    alertaExito('Reserva guardada correctamente')
  }, 1500)
}

function clienteLlego(reserva) {
  const nuevoServicio = {
    ...formularioVacio(),
    id: Date.now(),
    cliente: reserva.cliente,
    telefono: reserva.telefono,
    tipoServicio: reserva.tipoServicio,
    barbero: reserva.barbero,
    fecha: reserva.fecha,
    hora: reserva.hora,
    precioBase: preciosServicio[reserva.tipoServicio] || 0
  }
  servicios.value.push(nuevoServicio)

  for (let i = 0; i < reservas.value.length; i++) {
    if (reservas.value[i].id === reserva.id) {
      reservas.value.splice(i, 1)
      break
    }
  }

  contarServiciosDelDia()
  abrirModalEditar(nuevoServicio)
}

contarServiciosDelDia()
contarServiciosDelMes()
</script>



<template>
  <div class="gale-app">

    <!-- ===== SIDEBAR ===== -->
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-mark">✂</div>
        <div>
          <h1 class="serif">GALÉ</h1>
          <p>Barber Studio</p>
        </div>
      </div>
      <div class="turno-activo">
        <span class="dot"></span> Turno activo <span class="time">10:00–20:00</span>
      </div>
      <nav class="nav-list">
        <div class="nav-item active">▦ Panel de Servicios</div>
      </nav>
      <div class="sidebar-foot">
        <div class="capacidad-label"><span>Sillones ocupados</span><span>4/5</span></div>
        <div class="capacidad-bar"><div class="capacidad-fill"></div></div>
      </div>
    </aside>

    <!-- ===== CONTENIDO PRINCIPAL ===== -->
    <main class="main">

      <!-- barra superior -->
      <div class="topbar">
        <div class="pill">📅 Hoy, {{ new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }) }}</div>
        <div class="pill mint">⏱ Pico de afluencia: 17:30–19:30</div>
        <div class="topbar-spacer"></div>
        <div class="profile">
          <div class="profile-avatar">MG</div>
          <div>
            <div class="profile-name">Marcello Galé</div>
            <div class="profile-role">Head Barber / Admin</div>
          </div>
        </div>
      </div>

      <!-- encabezado + botones de accion -->
      <div class="header-row">
        <div>
          <p class="header-eyebrow">CONSOLA DE ADMINISTRACIÓN</p>
          <h2 class="serif">Gestiona los servicios de <em>tu barbería</em></h2>
          <p class="sub">Reservas, cobros y calidad de atención, todo en un mismo panel, fácil y rápido.</p>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn-nuevo" @click="abrirModalNuevo">+ Nuevo Servicio</button>
          <button class="btn-nuevo" @click="abrirModalReserva" style="background:transparent;border:1px solid var(--line);color:var(--gold-soft);box-shadow:none">📆 Nueva Reserva</button>
        </div>
      </div>

      <!-- ===== TARJETAS DE ESTADISTICAS ===== -->
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-top">
            <span class="stat-label">Servicios de hoy</span>
            <div class="stat-icon">📈</div>
          </div>
          <div class="stat-value">{{ serviciosHechosHoy }}<small>completados</small></div>
        </div>
        <div class="stat-card">
          <div class="stat-top">
            <span class="stat-label">En reserva hoy</span>
            <div class="stat-icon">⏱</div>
          </div>
          <div class="stat-value">{{ serviciosReservaHoy }}<small>en espera</small></div>
        </div>
        <div class="stat-card">
          <div class="stat-top">
            <span class="stat-label">Total vendido hoy</span>
            <div class="stat-icon">💰</div>
          </div>
          <div v-if="resumenVisible" class="stat-money">${{ formatearPrecio(resumenDia) }} <small style="font-size:0.8rem;color:var(--text-dim)">COP</small></div>
          <button v-else class="stat-btn" @click="verResumenDia">Ver resumen del día</button>
        </div>
        <div class="stat-card">
          <div class="stat-top">
            <span class="stat-label">Reservas agendadas</span>
            <div class="stat-icon">📆</div>
          </div>
          <div class="stat-value">{{ reservas.length }}<small>a futuro</small></div>
        </div>
        <!-- NUEVA: tarjeta de servicios del mes -->
        <div class="stat-card">
          <div class="stat-top">
            <span class="stat-label">Servicios del mes</span>
            <div class="stat-icon">📊</div>
          </div>
          <div class="stat-value">{{ serviciosMes }}<small>acumulados</small></div>
        </div>
      </div>

      <!-- ===== LISTADO DE SERVICIOS ===== -->
      <div class="section-head">
        <h3 class="serif">Servicios Registrados <span class="count">{{ obtenerListaVisible().length }} de {{ servicios.length }}</span></h3>
        <input type="text" v-model="busquedaTexto" placeholder="🔍 Buscar cliente o telefono" class="buscador">
        <div class="filtros">
          <button v-for="b in ['Todos', ...barberos]" :key="b" class="filtro-btn" :class="{ active: filtroBarbero === b }" @click="filtroBarbero = b">{{ b }}</button>
        </div>
      </div>

      <p class="sin-registros" v-if="obtenerListaVisible().length === 0">Aún no hay servicios registrados para este filtro. ¡Agrega el primero!</p>

      <div class="servicios-grid">
        <div v-for="servicio in obtenerListaVisible()" :key="servicio.id" class="tarjeta" :class="{ pendiente: servicio.estadoPago === 'Pendiente', abonado: servicio.estadoPago === 'abonado', pagado: servicio.estadoPago === 'Pagado' }">

          <!-- encabezado de la tarjeta -->
          <div class="tarjeta-header">
            <h4 class="serif">{{ servicio.cliente }}</h4>
            <span class="badge badge-pagado" v-if="servicio.estadoPago === 'Pagado'">Pagado</span>
            <span class="badge badge-pendiente" v-else-if="servicio.estadoPago === 'Pendiente'">Pendiente</span>
            <span class="badge badge-abonado" v-else-if="servicio.estadoPago === 'abonado'">Abonado</span>
          </div>

          <!-- datos basicos del servicio -->
          <div class="tarjeta-row">📞 {{ servicio.telefono }}</div>
          <div class="tarjeta-row">✂ <b>{{ servicio.tipoServicio }}</b> · {{ servicio.barbero }}</div>
          <div class="tarjeta-row">📅 {{ servicio.fecha }} · {{ servicio.hora }}</div>
          <div class="tarjeta-row" v-if="servicio.metodoPago">Pago con {{ servicio.metodoPago === 'Trasferencia' ? 'Transferencia' : servicio.metodoPago }}</div>
          <div class="tarjeta-row" v-if="servicio.adicionales && servicio.adicionales.length > 0">➕ {{ servicio.adicionales.join(', ') }}</div>
          <div class="tarjeta-row" v-if="servicio.consumos && servicio.consumos.length > 0">🍹 {{ servicio.consumos.join(', ') }}</div>
          <div class="tarjeta-row" v-if="servicio.playlist">🎵 {{ servicio.playlist }}</div>

          <div class="tarjeta-precio serif">${{ formatearPrecio(servicio.precio) }} <small style="font-size:0.7rem;color:var(--text-dim);font-family:'Plus Jakarta Sans',sans-serif">COP</small></div>

          <!-- NUEVO: bloque de abono + boton de whatsapp -->
          <div v-if="servicio.estadoPago === 'abonado'" class="info-abono">
            Abonó ${{ formatearPrecio(servicio.montoAbonado) }} COP
            <div class="falta">Falta ${{ formatearPrecio(calcularSaldoPendiente(servicio)) }} COP</div>
            <a :href="generarLinkRecordatorio(servicio)" target="_blank" class="btn-finalizar" style="display:block;text-align:center;margin-top:6px;text-decoration:none">
              📱 Enviar recordatorio WhatsApp
            </a>
          </div>

          <!-- estado del servicio: en curso o finalizado -->
          <div v-if="!servicio.finalizado" class="en-curso">
            <span>Servicio en curso</span>
              <button class="btn-finalizar" @click="abrirFinalizar(servicio)">Finalizar</button>
          </div>

          <div v-else class="resultado-final">
            <span v-if="servicio.calificacion <= 2" class="calificacion-baja">⚠ Calificación baja ({{ servicio.calificacion }}/5)</span>
            <span v-else class="calificacion-alta">★ {{ servicio.calificacion }}/5</span>
          </div>

          <p v-if="servicio.finalizado && servicio.observaciones" class="observaciones">
            {{ servicio.observaciones }}
          </p>

          <div v-if="!servicio.finalizado" class="acciones">
            <button @click="abrirModalEditar(servicio)">✎ Editar</button>
            <button class="eliminar" @click="abrirConfirmacion(servicio.id, 'servicio')">🗑 Eliminar</button>
          </div>
        </div>
      </div>

      <!--  LISTADO DE RESERVAS A FUTURO -->
      <div class="section-head">
        <h3 class="serif">Reservas Agendadas <span class="count">{{ reservas.length }}</span></h3>
      </div>
      <p class="sin-registros" v-if="reservas.length === 0">No hay reservas agendadas.</p>
      <div class="servicios-grid">
        <div v-for="reserva in reservas" :key="reserva.id" class="tarjeta">
          <div class="tarjeta-header">
            <h4 class="serif">{{ reserva.cliente }}</h4>
          </div>
          <div class="tarjeta-row">📞 {{ reserva.telefono }}</div>
          <div class="tarjeta-row">✂ <b>{{ reserva.tipoServicio }}</b> · {{ reserva.barbero }}</div>
          <div class="tarjeta-row">📅 {{ reserva.fecha }} · {{ reserva.hora }}</div>
          <div class="acciones">
            <button @click="clienteLlego(reserva)">✔ Cliente llegó</button>
            <button class="eliminar" @click="abrirConfirmacion(reserva.id, 'reserva')">🗑 Cancelar</button>
          </div>
        </div>
      </div>

      <!-- banner promocional -->
      <div class="promo-banner">
        <div>
          <p class="eyebrow">EXCELENCIA BARBER STUDIO</p>
          <h3 class="serif">Detalle, estilo y precisión en cada cita.</h3>
          <p>Cada corte registrado queda archivado con métricas de productividad por barbero, asegurando la fidelidad de nuestros clientes VIP.</p>
        </div>
        <div class="promo-stats">
          <div><b>4.9/5.0</b><span>Satisfacción</span></div>
          <div><b>32 min</b><span>Tiempo promedio</span></div>
          <div><b>✨</b><span>Servicio VIP</span></div>
        </div>
      </div>
    </main>

    <!--  MODAL: REGISTRAR / EDITAR SERVICIO -->
    <div v-if="mostrarmodal" class="overlay">
      <div class="modal">
        <button class="modal-close" @click="cerrarModal">✕</button>
        <p class="modal-eyebrow">Atención de barbería</p>
        <h2 class="serif">{{ idEditando === null ? 'Registrar Servicio' : 'Editar Servicio' }}</h2>
        <p class="desc">Ingresa los detalles de la atención para control de turnos y facturación.</p>

        <form @submit.prevent="guardarServicio">

          <!-- datos del cliente -->
          <label>Nombre del cliente</label>
          <input type="text" v-model="formulario.cliente" :disabled="guardando" placeholder="Ej. Alejandro Restrepo">

          <label>Teléfono del cliente</label>
          <input type="tel" v-model="formulario.telefono" :disabled="guardando" maxlength="11" placeholder="Ej:3001234567">

          <!-- NUEVO: rango del cliente segun su historial -->
          <p v-if="formulario.telefono.length >= 10" class="precio-preview">
            Rango: <b>{{ obtenerRangoCliente(formulario.telefono).nombre }}</b> ({{ obtenerRangoCliente(formulario.telefono).cortes }} cortes)
            <span v-if="obtenerRangoCliente(formulario.telefono).corteGratisDisponible"> · 🎁 ¡Corte gratis disponible!</span>
          </p>

          <!-- tipo de servicio y barbero -->
          <label>Tipo de servicio</label>
          <select v-model="formulario.tipoServicio" @change="actualizarPrecio" :disabled="guardando">
            <option value="">Seleccione un servicio</option>
            <option v-for="tipo in tiposServicio" :key="tipo" :value="tipo">{{ tipo }}</option>
          </select>

          <label>Barbero asignado</label>
          <select v-model="formulario.barbero" :disabled="guardando">
            <option value="">Seleccione un barbero</option>
            <!-- opcion deshabilitada si el barbero descansa ese dia -->
            <option v-for="barbero in barberos" :key="barbero" :value="barbero" :disabled="barberoDescansaHoy(barbero, formulario.fecha)">
              {{ barbero }} {{ barberoDescansaHoy(barbero, formulario.fecha) ? '(descansa hoy)' : '' }}
            </option>
          </select>

          <!-- fecha y hora -->
          <div class="fila-doble">
            <div>
              <label>Fecha</label>
              <input type="date" v-model="formulario.fecha" :min="obtenerFechaMinima()" :disabled="guardando">
            </div>
            <div>
              <label>Hora</label>
              <select v-model="formulario.hora" :disabled="guardando || formulario.fecha === ''">
                <option value="">Seleccione una hora</option>
                
                <option v-for="slot in generarSlotsDisponibles()" :key="slot" :value="slot" :disabled="horaOcupada(formulario.barbero, formulario.fecha, slot, formulario.tipoServicio, formulario.id) || horaYaPaso(formulario.fecha, slot)">
                  {{ slot }} {{ horaOcupada(formulario.barbero, formulario.fecha, slot, formulario.tipoServicio, formulario.id) ? '(Ocupado)' : horaYaPaso(formulario.fecha,slot ) ? '(Hora Pasada)' : '' }}
                </option>
              </select>
            </div>
          </div>

          <!-- precio base del corte -->
          <label>Precio del corte</label>
          <div class="input-precio">
            <span>$</span>
            <input type="number" v-model="formulario.precioBase" :disabled="guardando">
          </div>

          <!-- adicionales del servicio -->
          <label>Adicionales</label>
          <div class="chips-lista">
            <button
            type="button"
            v-for="nombre in listaAdicionales"
            :key="nombre"
            class="chip"
            :class="{ activo: formulario.adicionales.includes(nombre) }"
            @click="toggleAdicional(nombre)"
            >
            {{ nombre }} <span class="chip-precio">+${{ formatearPrecio(preciosAdicionales[nombre]) }}</span>
            </button>
          </div>

            <!-- bebidas y snacks -->
          <label>Bebidas y snacks</label>
          <div class="chips-lista">
            <button
              type="button"
              v-for="item in menuAlcohol.concat(menuFrias, menuCalientes, menuSnacks)"
              :key="item.nombre"
              class="chip"
              :class="{ activo: formulario.consumos.includes(item.nombre) }"
              @click="toggleConsumo(item.nombre)"
              >
            {{ item.nombre }} <span class="chip-precio">+${{ formatearPrecio(item.precio) }}</span>
            </button>
          </div>

          <!-- playlist opcional -->
          <label>Playlist de Spotify (opcional)</label>
          <input type="text" v-model="formulario.playlist" placeholder="Ej: reggaetón, Bad Bunny, jazz suave...">

          <!-- total calculado -->
          <p class="precio-preview" style="font-size:1rem;color:var(--gold-soft);font-weight:700">Total a cobrar: ${{ formatearPrecio(calcularTotalFormulario()) }} COP</p>

          <!-- pago -->
          <label>Método de pago</label>
          <select v-model="formulario.metodoPago" :disabled="guardando">
            <option value="">Seleccione un método</option>
            <option value="Efectivo">Efectivo</option>
            <option value="Trasferencia">Transferencia</option>
            <option value="Tarjeta">Tarjeta</option>
          </select>

          <label>Estado del pago</label>
          <div class="estado-pago-grupo">
            <button type="button" :disabled="guardando" class="estado-btn" :class="{ selected: formulario.estadoPago === 'Pagado', 'pagado-sel': formulario.estadoPago === 'Pagado' }" @click="formulario.estadoPago = 'Pagado'">Pagado</button>
            <button type="button" :disabled="guardando" class="estado-btn" :class="{ selected: formulario.estadoPago === 'Pendiente', 'pendiente-sel': formulario.estadoPago === 'Pendiente' }" @click="formulario.estadoPago = 'Pendiente'">Pendiente</button>
            <button type="button" :disabled="guardando" class="estado-btn" :class="{ selected: formulario.estadoPago === 'abonado', 'abonado-sel': formulario.estadoPago === 'abonado' }" @click="formulario.estadoPago = 'abonado'">Abonado</button>
          </div>

          <div v-if="formulario.estadoPago === 'abonado'">
            <label>¿Cuánto abonó?</label>
            <input type="number" v-model="formulario.montoAbonado" :disabled="guardando">
          </div>

          <!-- mensajes -->
          <p v-if="mensajeEror" class="msg-error">⚠ {{ mensajeEror }}</p>
          <p v-if="guardando" class="msg-guardando"><span class="spinner"></span> Guardando el servicio, un momento...</p>

          <div class="botones-form">
            <button type="submit" class="btn-guardar" :disabled="guardando">{{ guardando ? 'Guardando...' : 'Guardar Servicio' }}</button>
            <button type="button" class="btn-cancelar" @click="cerrarModal" :disabled="guardando">Cancelar</button>
          </div>
        </form>
      </div>
    </div>

    <!-- ===== MODAL: NUEVA RESERVA ===== -->
    <div v-if="mostrarModalReserva" class="overlay">
      <div class="modal">
        <button class="modal-close" @click="cerrarModalReserva">✕</button>
        <p class="modal-eyebrow">Reserva a futuro</p>
        <h2 class="serif">Nueva Reserva</h2>
        <p class="desc">Aparta el cupo de un cliente para otro día, sin cobrar todavía.</p>
        <form @submit.prevent="guardarReserva">
          <label>Nombre del cliente</label>
          <input type="text" v-model="reservaFormulario.cliente" :disabled="guardandoReserva">

          <label>Teléfono</label>
          <input type="tel" v-model="reservaFormulario.telefono" :disabled="guardandoReserva" maxlength="10">

          <label>Tipo de servicio</label>
          <select v-model="reservaFormulario.tipoServicio" :disabled="guardandoReserva">
            <option value="">Seleccione un servicio</option>
            <option v-for="tipo in tiposServicio" :key="tipo" :value="tipo">{{ tipo }}</option>
          </select>

          <label>Barbero</label>
          <select v-model="reservaFormulario.barbero" :disabled="guardandoReserva">
            <option value="">Seleccione un barbero</option>
            <option v-for="barbero in barberos" :key="barbero" :value="barbero" :disabled="barberoDescansaHoy(barbero, reservaFormulario.fecha)">
              {{ barbero }} {{ barberoDescansaHoy(barbero, reservaFormulario.fecha) ? '(descansa ese día)' : '' }}
            </option>
          </select>

          <div class="fila-doble">
            <div>
              <label>Fecha</label>
              <input type="date" v-model="reservaFormulario.fecha" :min="obtenerFechaMinima()" :disabled="guardandoReserva">
            </div>
            <div>
              <label>Hora</label>
              <select v-model="reservaFormulario.hora" :disabled="guardandoReserva || reservaFormulario.fecha === ''">
                <option value="">Seleccione una hora</option>
                <option v-for="slot in generarSlotsDisponiblesReserva()" :key="slot" :value="slot" :disabled="horaOcupada(reservaFormulario.barbero, reservaFormulario.fecha, slot, reservaFormulario.tipoServicio, null) || horaYaPaso(reservaFormulario.fecha, slot)">
                  {{ slot }} {{ horaOcupada(reservaFormulario.barbero, reservaFormulario.fecha, slot, reservaFormulario.tipoServicio, null) ? '(ocupado)' : horaYaPaso(reservaFormulario.fecha,slot) ? '(Hora Pasada)' : '' }}
                </option>
              </select>
            </div>
          </div>

          <p v-if="mensajeErorReserva" class="msg-error">⚠ {{ mensajeErorReserva }}</p>
          <p v-if="guardandoReserva" class="msg-guardando"><span class="spinner"></span> Guardando reserva...</p>

          <div class="botones-form">
            <button type="submit" class="btn-guardar" :disabled="guardandoReserva">{{ guardandoReserva ? 'Guardando...' : 'Guardar Reserva' }}</button>
            <button type="button" class="btn-cancelar" @click="cerrarModalReserva" :disabled="guardandoReserva">Cancelar</button>
          </div>
        </form>
      </div>
    </div>

    <!-- ===== MODAL: FINALIZAR SERVICIO ===== -->
    <div v-if="mostrarModalFinalizar && obtenerServicioFinalizando()" class="overlay">
      <div class="modal">
        <button class="modal-close" @click="cerrarFinalizar">✕</button>
        <p class="modal-eyebrow">Cierre de ticket</p>
        <h2 class="serif">Finalizar Servicio</h2>
        <p class="desc">Registra cómo quedó el cliente y completa la auditoría de calidad de la atención.</p>

        <div class="ticket-box">
          <div class="ticket-left">
            <div class="cliente-avatar">{{ inicialesCliente(obtenerServicioFinalizando().cliente) }}</div>
            <div>
              <b>{{ obtenerServicioFinalizando().cliente }}</b>
              <span>{{ obtenerServicioFinalizando().tipoServicio }} · Atendido por {{ obtenerServicioFinalizando().barbero }}</span>
            </div>
          </div>
          <div class="monto"><span>Monto total</span><b>${{ formatearPrecio(obtenerServicioFinalizando().precio) }}</b></div>
        </div>

        <label style="margin-top:0;text-align:center;display:block">Calificación del cliente</label>
        <div class="estrellas">
          <button type="button" v-for="estrella in 5" :key="estrella" @click="ponerCalificacion(estrella)">
            <span :class="{ filled: estrella <= calificacionFinal }">★</span>
          </button>
        </div>
        <p class="calif-caption">Pulsa sobre una estrella para calificar</p>
        <p v-if="obtenerServicioFinalizando().encuestaEnviada" class="encuesta-enviada">Encuesta enviada por WhatsApp</p>
        
        <label>Observaciones (opcional)</label>
        <textarea v-model="observacionesFinal" :disabled="guardandoFinalizacion" placeholder="Detalles del corte, estilo preferido o notas para su próxima visita..."></textarea>

        <p v-if="guardandoFinalizacion" class="msg-guardando"><span class="spinner"></span> Guardando...</p>

        <div class="botones-form">
          <button type="button" class="btn-guardar" :disabled="guardandoFinalizacion" @click="enviarEncuestaWhatsApp">
          Enviar encuesta por WhatsApp</button>
          <button type="button" class="btn-guardar" :disabled="guardandoFinalizacion" @click="guardarFinalizacion">
          {{ guardandoFinalizacion ? 'Guardando' : 'Guardar y Finalizar' }}
  </button>
  <button type="button" class="btn-cancelar" :disabled="guardandoFinalizacion" @click="cerrarFinalizar">
    Cancelar
  </button>
        </div>
      </div>
    </div>

    <!--  MODAL: CONFIRMAR ELIMINACION (sirve para servicio o reserva)  -->
    <div v-if="mostrarConfirmacion" class="overlay" @click.self="mostrarConfirmacion = false">
      <div class="modal confirm-modal">
        <div class="confirm-icon">X</div>
        <h2 class="serif">¿Eliminar {{ tipoEliminar === 'reserva' ? 'reserva' : 'servicio' }}?</h2>
        <p class="desc">¿Estás seguro? Esta acción no se puede deshacer.</p>
        <div class="botones-form">
          <button class="btn-guardar btn-danger" @click="confirmarEliminacion">Sí, eliminar</button>
          <button class="btn-cancelar" @click="mostrarConfirmacion = false">Cancelar</button>
        </div>
      </div>
    </div>

  </div>
</template>


```css
<style>
@import url('https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,wght@0,400..900;1,400..900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

.swal-gale-popup{
background:#141317!important;
border:1px solid #2A2A30!important;
border-radius:16px!important;
box-shadow:0 20px 60px rgba(0,0,0,0.5)!important;
}
.swal-gale-title{
font-family:'Bodoni Moda',serif!important;
color:#ECE8DF!important;
font-size:1.3rem!important;
}
.swal-gale-popup .swal2-icon.swal2-success{
border-color:#D4AF37!important;
color:#D4AF37!important;
}
.swal-gale-popup .swal2-icon.swal2-success [class^='swal2-success-line']{
background-color:#D4AF37!important;
}
.swal-gale-popup .swal2-icon.swal2-success .swal2-success-ring{
border-color:rgba(212,175,55,0.3)!important;
}
.swal2-container{
background:rgba(6,6,8,0.6)!important;
}

.chips-lista{
display:flex;
flex-wrap:wrap;
gap:8px;
margin-top:6px;
max-height:220px;
overflow-y:auto;
padding:4px 2px;
}
.chip{
background:#0F0F12;
border:1px solid var(--line);
color:var(--text-dim);
font-size:0.82rem;
padding:8px 12px;
border-radius:999px;
cursor:pointer;
display:flex;
align-items:center;
gap:6px;
white-space:nowrap;
transition:all 0.15s;
}
.chip:hover{
border-color:var(--gold);
}
.chip.activo{
background:rgba(212,175,55,0.12);
border-color:var(--gold);
color:var(--gold-soft);
font-weight:600;
}
.chip-precio{
font-size:0.72rem;
opacity:0.75;
}

body{
padding:0;
}

.gale-app{
--gold:#D4AF37;
--gold-soft:#E9CE86;
--bronze:#C59A6F;
--mint:#34D399;
--coral:#E2725B;
--panel-1:#17171B;
--panel-2:#1D1D22;
--line:#2A2A30;
--line-soft:#232328;
--text:#ECE8DF;
--text-dim:#9C9AA3;
font-family:'Plus Jakarta Sans',sans-serif;
background:radial-gradient(ellipse at top left,#17151B 0%,#0B0B0D 55%,#08080A 100%);
color:var(--text);
min-height:100vh;
display:flex;
position:relative;
}
.gale-app *{
box-sizing:border-box;
}
.gale-app .serif{
font-family:'Bodoni Moda',serif;
}
.gale-app::before{
content:"";
position:fixed;
inset:0;
background-image:radial-gradient(rgba(212,175,55,0.07) 1px,transparent 1px);
background-size:26px 26px;
pointer-events:none;
z-index:0;
}

.sidebar{
width:236px;
flex-shrink:0;
background:#111114;
border-right:1px solid var(--line);
padding:28px 18px;
display:flex;
flex-direction:column;
gap:26px;
position:relative;
z-index:1;
}
.brand{
display:flex;
align-items:center;
gap:12px;
padding:0 6px;
}
.brand-mark{
width:40px;
height:40px;
border-radius:9px;
background:linear-gradient(160deg,#26241C,#171612);
border:1px solid var(--line);
display:flex;
align-items:center;
justify-content:center;
color:var(--gold);
font-size:1.1rem;
}
.brand h1{
font-size:1.25rem;
letter-spacing:0.06em;
margin:0;
color:var(--gold-soft);
font-weight:600;
}
.brand p{
font-size:0.68rem;
letter-spacing:0.22em;
margin:1px 0 0;
color:var(--text-dim);
text-transform:uppercase;
}
.turno-activo{
display:flex;
align-items:center;
gap:8px;
font-size:0.78rem;
color:var(--mint);
background:rgba(52,211,153,0.08);
border:1px solid rgba(52,211,153,0.25);
border-radius:8px;
padding:8px 10px;
}
.turno-activo .dot{
width:6px;
height:6px;
border-radius:50%;
background:var(--mint);
box-shadow:0 0 8px var(--mint);
}
.turno-activo .time{
margin-left:auto;
color:var(--text-dim);
}
.nav-list{
display:flex;
flex-direction:column;
gap:3px;
margin-top:4px;
}
.nav-item{
padding:10px 12px;
border-radius:9px;
font-size:0.92rem;
color:var(--text-dim);
border:1px solid transparent;
}
.nav-item.active{
background:rgba(212,175,55,0.1);
border-color:rgba(212,175,55,0.28);
color:var(--gold-soft);
}
.sidebar-foot{
margin-top:auto;
border-top:1px solid var(--line);
padding-top:16px;
}
.capacidad-label{
display:flex;
justify-content:space-between;
font-size:0.78rem;
color:var(--text-dim);
margin-bottom:6px;
}
.capacidad-bar{
height:6px;
border-radius:4px;
background:#232327;
overflow:hidden;
}
.capacidad-fill{
height:100%;
background:linear-gradient(90deg,var(--bronze),var(--gold));
width:80%;
}

.main{
flex:1;
padding:26px 34px 60px;
position:relative;
z-index:1;
min-width:0;
}
.topbar{
display:flex;
align-items:center;
gap:14px;
margin-bottom:26px;
flex-wrap:wrap;
}
.pill{
display:flex;
align-items:center;
gap:8px;
background:var(--panel-1);
border:1px solid var(--line);
padding:8px 14px;
border-radius:999px;
font-size:0.82rem;
color:var(--text-dim);
}
.pill.mint{
color:var(--mint);
}
.topbar-spacer{
flex:1;
}
.icon-btn{
width:38px;
height:38px;
border-radius:10px;
border:1px solid var(--line);
background:var(--panel-1);
display:flex;
align-items:center;
justify-content:center;
color:var(--text-dim);
font-size:0.9rem;
}
.profile{
display:flex;
align-items:center;
gap:10px;
padding-left:8px;
}
.profile-avatar{
width:38px;
height:38px;
border-radius:50%;
background:linear-gradient(145deg,var(--gold-soft),var(--bronze));
display:flex;
align-items:center;
justify-content:center;
color:#17140C;
font-weight:700;
font-size:0.8rem;
}
.profile-name{
font-size:0.86rem;
font-weight:600;
color:var(--text);
line-height:1.1;
}
.profile-role{
font-size:0.72rem;
color:var(--text-dim);
}

.header-row{
display:flex;
align-items:flex-end;
justify-content:space-between;
gap:20px;
margin-bottom:24px;
flex-wrap:wrap;
}
.header-eyebrow{
font-size:0.76rem;
letter-spacing:0.12em;
color:var(--gold);
margin:0 0 8px;
}
.header-row h2{
font-size:2.15rem;
margin:0;
font-weight:500;
line-height:1.1;
}
.header-row h2 em{
font-style:italic;
color:var(--gold-soft);
}
.header-row p.sub{
color:var(--text-dim);
margin:10px 0 0;
max-width:46ch;
font-size:0.96rem;
}
.btn-nuevo{
background:linear-gradient(180deg,var(--gold-soft),var(--gold));
color:#1A1509;
border:none;
font-weight:700;
padding:13px 20px;
border-radius:11px;
font-size:0.94rem;
cursor:pointer;
box-shadow:0 8px 22px -8px rgba(212,175,55,0.55);
white-space:nowrap;
}
.btn-nuevo:hover{
filter:brightness(1.05);
}

.stats-row{
display:grid;
grid-template-columns:repeat(3,1fr);
gap:16px;
margin-bottom:30px;
}
.stat-card{
background:linear-gradient(165deg,var(--panel-2),var(--panel-1));
border:1px solid var(--line);
border-radius:14px;
padding:20px;
}
.stat-top{
display:flex;
align-items:center;
justify-content:space-between;
margin-bottom:14px;
}
.stat-icon{
width:34px;
height:34px;
border-radius:9px;
background:rgba(212,175,55,0.1);
border:1px solid rgba(212,175,55,0.22);
display:flex;
align-items:center;
justify-content:center;
font-size:0.9rem;
}
.stat-label{
font-size:0.82rem;
color:var(--text-dim);
text-transform:uppercase;
letter-spacing:0.06em;
}
.stat-value{
font-size:2.25rem;
font-weight:600;
font-family:'Bodoni Moda',serif;
}
.stat-value small{
font-size:1rem;
color:var(--text-dim);
font-family:'Plus Jakarta Sans',sans-serif;
margin-left:6px;
}
.stat-money{
font-size:1.85rem;
font-weight:600;
font-family:'Bodoni Moda',serif;
color:var(--mint);
}
.stat-btn{
margin-top:10px;
background: #d4af3758;
border:1px solid var(--line);
color:var(--text-dim);
font-size:  15px;
padding:7px 12px;
border-radius:8px;
cursor:pointer;
}
.stat-btn:hover{
border-color:var(--gold);
color:var(--gold-soft);
}

.section-head{
display:flex;
align-items:center;
justify-content:space-between;
margin-bottom:16px;
flex-wrap:wrap;
gap:10px;
}
.section-head h3{
font-family:'Bodoni Moda',serif;
font-size:50px;
font-weight:500;
margin:0;
}
.section-head .count{
color:var(--text-dim);
font-weight:400;
font-size:0.94rem;
font-family:'Plus Jakarta Sans',sans-serif;
margin-left:8px;
}
.filtros{
display:flex;
gap:6px;
flex-wrap:wrap;
}
.filtro-btn{
border:1px solid var(--line);
background:var(--panel-1);
color:var(--text-dim);
font-size:0.82rem;
padding:6px 12px;
border-radius:8px;
cursor:pointer;
}
.filtro-btn.active{
border-color:var(--gold);
color:var(--gold-soft);
background:rgba(212,175,55,0.08);
}
.sin-registros{
border:1px dashed var(--line);
border-radius:14px;
padding:40px;
text-align:center;
color:var(--text-dim);
font-size:0.94rem;
}

.servicios-grid{
display:grid;
grid-template-columns:repeat(auto-fill,minmax(290px,1fr));
gap:16px;
margin-bottom:30px;
}
.tarjeta{
background:var(--panel-1);
border:1px solid var(--line);
border-radius:14px;
padding:18px;
display:flex;
flex-direction:column;
gap:8px;
border-top:2px solid var(--line);
}
.buscador{
background:var(--panel-1);
border:1px solid var(--line);
color:var(--text);
padding:13px 14px;
border-radius:999px;
font-size:15px;
min-width:220px;
}
.buscador:focus{
outline:none;
border-color:var(--gold);
}
.tarjeta.pagado{
border-top-color:var(--mint);
}
.tarjeta.abonado{
border-top-color:var(--gold);
}
.tarjeta.pendiente{
border-top-color:var(--coral);
}
.tarjeta-header{
display:flex;
align-items:center;
justify-content:space-between;
margin-bottom:2px;
}
.tarjeta-header h4{
font-family:'Bodoni Moda',serif;
font-size:2.28rem;
font-weight:500;
margin:0;
}
.badge{
font-size:0.72rem;
padding:4px 9px;
border-radius:999px;
font-weight:600;
white-space:nowrap;
}
.badge-pagado{
background:rgba(52,211,153,0.12);
color:var(--mint);
border:1px solid rgba(52,211,153,0.3);
}
.badge-pendiente{
background:rgba(226,114,91,0.12);
color:#EF9784;
border:1px solid rgba(226,114,91,0.32);
}
.badge-abonado{
background:rgba(212,175,55,0.12);
color:var(--gold-soft);
border:1px solid rgba(212,175,55,0.32);
}
.tarjeta-row{
display:flex;
align-items:center;
gap:7px;
font-size:16px;
color:var(--text-dim);
}
.tarjeta-row b{
color:var(--text);
font-weight:500;
}
.tarjeta-precio{
font-family:'Bodoni Moda',serif;
font-size:1.4rem;
margin-top:2px;
}
.info-abono{
background:rgba(212,175,55,0.07);
border:1px solid rgba(212,175,55,0.2);
border-radius:9px;
padding:8px 11px;
font-size:0.82rem;
margin-top:2px;
}
.info-abono .falta{
color:#EF9784;
font-weight:600;
margin-top:2px;
}
.en-curso{
display:flex;
align-items:center;
justify-content:space-between;
gap:10px;
background:rgba(255,255,255,0.03);
border:1px solid var(--line-soft);
border-radius:10px;
padding:9px 12px;
margin-top:4px;
}
.en-curso span{
font-size:0.82rem;
color:var(--text-dim);
}
.btn-finalizar{
background:linear-gradient(180deg,var(--gold-soft),var(--gold));
color:#1A1509;
border:none;
font-weight:700;
font-size:0.82rem;
padding:8px 12px;
border-radius:8px;
cursor:pointer;
white-space:nowrap;
}
.resultado-final{
display:flex;
align-items:center;
justify-content:space-between;
margin-top:4px;
}
.calificacion-alta{
color:var(--gold-soft);
font-size:0.9rem;
font-weight:600;
}
.calificacion-baja{
color:#EF9784;
font-size:0.84rem;
font-weight:600;
display:flex;
align-items:center;
gap:5px;
}
.observaciones{
font-size:0.82rem;
color:var(--text-dim);
font-style:italic;
margin-top:2px;
border-left:2px solid var(--line);
padding-left:8px;
}
.acciones{
display:flex;
gap:8px;
margin-top:8px;
}
.acciones button{
flex:1;
background:transparent;
border:1px solid var(--line);
color:var(--text-dim);
font-size:0.82rem;
padding:8px;
border-radius:8px;
cursor:pointer;
}
.acciones button:hover{
border-color:var(--gold);
color:var(--gold-soft);
}
.acciones button.eliminar:hover{
border-color:#E2725B;
color:#EF9784;
}

.promo-banner{
border:1px solid var(--line);
border-radius:16px;
overflow:hidden;
background:linear-gradient(120deg,#1B1A16 0%,#141316 60%);
display:flex;
align-items:center;
justify-content:space-between;
padding:30px 34px;
gap:20px;
flex-wrap:wrap;
}
.promo-banner .eyebrow{
color:var(--gold);
font-size:0.76rem;
letter-spacing:0.14em;
margin:0 0 8px;
}
.promo-banner h3{
font-family:'Bodoni Moda',serif;
font-size:1.8rem;
font-weight:500;
margin:0 0 8px;
max-width:20ch;
}
.promo-banner p{
color:var(--text-dim);
font-size:0.9rem;
max-width:40ch;
margin:0;
}
.promo-stats{
display:flex;
gap:26px;
}
.promo-stats div{
text-align:center;
}
.promo-stats b{
font-family:'Bodoni Moda',serif;
font-size:1.45rem;
display:block;
color:var(--gold-soft);
}
.promo-stats span{
font-size:0.74rem;
color:var(--text-dim);
}

/* MODALES */
.overlay{
position:fixed;
inset:0;
background:rgba(6,6,8,0.72);
backdrop-filter:blur(3px);
display:flex;
align-items:center;
justify-content:center;
padding:24px;
z-index:50;
}
.modal{
background:#141317;
border:1px solid var(--line);
border-radius:18px;
width:100%;
max-width:480px;
padding:28px;
max-height:88vh;
overflow-y:auto;
position:relative;
}
.modal-close{
position:absolute;
top:20px;
right:20px;
width:30px;
height:30px;
border-radius:8px;
border:1px solid var(--line);
background:var(--panel-1);
color:var(--text-dim);
display:flex;
align-items:center;
justify-content:center;
cursor:pointer;
}
.modal-eyebrow{
font-size:0.72rem;
letter-spacing:0.14em;
color:var(--gold);
margin:0 0 6px;
text-transform:uppercase;
}
.modal h2{
font-family:'Bodoni Moda',serif;
font-weight:500;
font-size:1.65rem;
margin:0 0 6px;
}
.modal > .desc{
color:var(--text-dim);
font-size:0.9rem;
margin:0 0 20px;
}
.modal label{
display:block;
font-size:0.82rem;
color:var(--text-dim);
margin:14px 0 6px;
}
.modal input,
.modal select,
.modal textarea{
width:100%;
background:#0F0F12;
border:1px solid var(--line);
color:var(--text);
padding:11px 13px;
border-radius:9px;
font-size:0.92rem;
font-family:inherit;
}
.modal input:focus,
.modal select:focus,
.modal textarea:focus{
outline:none;
border-color:var(--gold);
}
.modal input:disabled,
.modal select:disabled,
.modal textarea:disabled{
opacity:0.55;
}
.modal textarea{
min-height:80px;
resize:vertical;
}
.fila-doble{
display:grid;
grid-template-columns:1fr 1fr;
gap:12px;
}
.precio-preview{
font-size:0.8rem;
color:var(--text-dim);
margin:6px 2px 0;
}

.input-precio{
display:flex;
align-items:center;
border:1px solid #ccc;
border-radius:6px;
}
.input-precio span{
padding-left:10px;
font-weight:bold;
color:#555;
}
.input-precio input{
border:none;
outline:none;
flex:1;
margin-bottom:5px;
}

.estado-pago-grupo{
display:grid;
grid-template-columns:repeat(3,1fr);
gap:8px;
margin-top:6px;
}
.estado-btn{
border:1px solid var(--line);
background:var(--panel-1);
color:var(--text-dim);
padding:10px 6px;
border-radius:9px;
font-size:0.82rem;
cursor:pointer;
text-align:center;
}
.estado-btn.pagado-sel{
border-color:var(--mint);
color:var(--mint);
background:rgba(52,211,153,0.08);
}
.estado-btn.pendiente-sel{
border-color:#E2725B;
color:#EF9784;
background:rgba(226,114,91,0.08);
}
.estado-btn.abonado-sel{
border-color:var(--gold);
color:var(--gold-soft);
background:rgba(212,175,55,0.08);
}

.msg-error{
display:flex;
align-items:center;
gap:7px;
background:rgba(226,114,91,0.1);
border:1px solid rgba(226,114,91,0.3);
color:#EF9784;
padding:10px 12px;
border-radius:9px;
font-size:0.84rem;
margin-top:16px;
}
.msg-guardando{
color:var(--gold-soft);
font-size:0.84rem;
margin-top:12px;
display:flex;
align-items:center;
gap:8px;
}
.spinner{
width:13px;
height:13px;
border-radius:50%;
border:2px solid rgba(212,175,55,0.25);
border-top-color:var(--gold);
animation:spin 0.7s linear infinite;
}
@keyframes spin{
to{
transform:rotate(360deg);
}
}

.botones-form{
display:flex;
gap:10px;
margin-top:22px;
}
.btn-guardar{
flex:1;
background:linear-gradient(180deg,var(--gold-soft),var(--gold));
color:#1A1509;
border:none;
font-weight:700;
padding:12px;
border-radius:10px;
font-size:0.9rem;
cursor:pointer;
}
.btn-guardar.btn-danger{
background:linear-gradient(180deg,#EF9784,#E2725B);
}
.btn-guardar:disabled{
opacity:0.6;
cursor:not-allowed;
}
.btn-cancelar{
flex:1;
background:transparent;
border:1px solid var(--line);
color:var(--text-dim);
font-weight:600;
padding:12px;
border-radius:10px;
font-size:0.9rem;
cursor:pointer;
}
.btn-cancelar:disabled{
opacity:0.5;
}

.ticket-box{
background:#0F0F12;
border:1px solid var(--line);
border-radius:12px;
padding:14px 16px;
display:flex;
align-items:center;
justify-content:space-between;
margin-bottom:18px;
}
.ticket-left{
display:flex;
align-items:center;
}
.ticket-box .cliente-avatar{
width:34px;
height:34px;
border-radius:9px;
background:rgba(212,175,55,0.12);
color:var(--gold-soft);
display:flex;
align-items:center;
justify-content:center;
font-weight:700;
font-size:0.82rem;
margin-right:10px;
}
.ticket-left div b{
font-size:0.96rem;
display:block;
}
.ticket-left div span{
font-size:0.78rem;
color:var(--text-dim);
}
.ticket-box .monto{
text-align:right;
}
.ticket-box .monto span{
display:block;
font-size:0.7rem;
color:var(--text-dim);
text-transform:uppercase;
letter-spacing:0.05em;
}
.ticket-box .monto b{
font-family:'Bodoni Moda',serif;
font-size:1.3rem;
color:var(--gold-soft);
}

.estrellas{
display:flex;
gap:8px;
justify-content:center;
padding:14px 0 6px;
}
.estrellas button{
background:none;
border:none;
cursor:pointer;
padding:2px;
font-size:1.8rem;
line-height:1;
color:#3B3A40;
}
.estrellas button span.filled{
color:var(--gold);
}
.estrellas button:hover{
transform:scale(1.08);
}
.calif-caption{
text-align:center;
font-size:0.8rem;
color:var(--text-dim);
margin-bottom:4px;
}
.encuesta-enviada{
text-align:center;
color:var(--mint);
font-size:0.82rem;
margin:8px 0;
}

.confirm-modal{
max-width:380px;
}
.confirm-icon{
width:44px;
height:44px;
border-radius:12px;
background:rgba(226,114,91,0.12);
border:1px solid rgba(226,114,91,0.3);
display:flex;
align-items:center;
justify-content:center;
color:#EF9784;
margin-bottom:14px;
font-size:1.2rem;
}

.modal input[type="date"]::-webkit-calendar-picker-indicator,
.modal input[type="time"]::-webkit-calendar-picker-indicator{
filter:invert(1);
cursor:pointer;
}

@media (max-width:900px){
.sidebar{
display:none;
}
.main{
padding:20px 16px 50px;
}
.stats-row{
grid-template-columns:1fr;
}
.fila-doble,
.estado-pago-grupo{
grid-template-columns:1fr;
}
.promo-banner{
flex-direction:column;
align-items:flex-start;
}
}
</style>
```
