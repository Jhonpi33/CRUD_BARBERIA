<script setup>
const groups = [
  {
    title: 'Perfil, servicios y horarios',
    items: [
      { name: 'Perfil público', description: 'Comparte una página con tu información profesional, ubicación y servicios.' },
      { name: 'Catálogo de servicios', description: 'Configura nombres, precios, duración y disponibilidad de cada servicio.' },
      { name: 'Horarios y descansos', description: 'Define los días y bloques de atención, descansos y zona horaria.' },
      { name: 'Reservas en línea', description: 'Tus clientes pueden consultar disponibilidad y solicitar una cita sin crear una cuenta.' },
    ],
  },
  {
    title: 'Agenda y clientes',
    items: [
      { name: 'Gestión de citas', description: 'Revisa las solicitudes y administra los estados de tus turnos.' },
      { name: 'Mensajes para WhatsApp', description: 'Abre textos preparados para confirmar, recordar o cancelar; tú los revisas y envías.' },
      { name: 'Historial de clientes', description: 'Consulta las reservas y guarda notas privadas para organizar la atención.' },
    ],
  },
  {
    title: 'Caja básica',
    items: [
      { name: 'Apertura y cierre', description: 'Registra el fondo inicial y compara el efectivo esperado con el conteo final.' },
      { name: 'Ingresos y egresos', description: 'Anota movimientos de caja y cobra una cita desde la agenda.' },
    ],
  },
]
</script>

<template>
  <div class="features">
    <header class="features__hero">
      <p class="features__eyebrow">Funciones de Elysia</p>
      <h1 class="features__title">Herramientas para el barbero independiente</h1>
      <p class="features__lead">
        Elysia reúne tu perfil, las reservas, la agenda, tus clientes y una caja básica en un solo lugar.
      </p>
      <div class="features__actions">
        <RouterLink class="btn btn--primary" to="/registro">Crear cuenta</RouterLink>
        <RouterLink class="btn btn--secondary" to="/precios">Ver precios</RouterLink>
      </div>
    </header>

    <section v-for="group in groups" :key="group.title" class="features__group">
      <h2 class="features__group-title">{{ group.title }}</h2>
      <div class="features__grid">
        <article v-for="item in group.items" :key="item.name" class="features__card">
          <h3 class="features__card-title">{{ item.name }}</h3>
          <p class="features__card-description">{{ item.description }}</p>
        </article>
      </div>
    </section>

    <section class="features__group features__group--alt">
      <h2 class="features__group-title">Alcance actual</h2>
      <p class="features__group-lead">
        WhatsApp se usa manualmente. El plan para barberos independientes no incluye pagos en línea, inventario,
        comisiones, gestión de equipos ni respuestas automáticas con IA.
      </p>
    </section>

    <section class="features__cta">
      <h2 class="features__group-title">Organiza tus próximas citas</h2>
      <RouterLink class="btn btn--primary btn--lg" to="/registro">Crear cuenta</RouterLink>
    </section>
  </div>
</template>

<style scoped>
.features { max-width: var(--container-max); margin: 0 auto; padding: var(--space-7) var(--space-4); }
.features__hero { text-align: center; margin-bottom: var(--space-8); }
.features__eyebrow { display: inline-block; font-size: var(--font-size-xs); letter-spacing: .16em; text-transform: uppercase; color: var(--color-primary-soft); border: 1px solid var(--color-border); border-radius: var(--radius-pill); padding: 6px 14px; margin-bottom: var(--space-4); background: var(--color-surface); }
.features__title { font-size: clamp(1.8rem, 5vw, 2.8rem); margin-bottom: var(--space-4); }
.features__lead { color: var(--color-text-muted); max-width: 680px; margin: 0 auto var(--space-5); font-size: var(--font-size-md); }
.features__actions { display: flex; gap: var(--space-4); justify-content: center; flex-wrap: wrap; }
.features__group { margin-bottom: var(--space-7); }
.features__group--alt { background: var(--color-surface); border: 1px solid var(--color-border-soft); border-radius: var(--radius-lg); padding: var(--space-6); }
.features__group-title { font-size: clamp(1.3rem, 3.5vw, 1.8rem); margin-bottom: var(--space-2); text-align: center; }
.features__group-lead { text-align: center; color: var(--color-text-muted); margin: 0 auto var(--space-3); max-width: 700px; font-size: var(--font-size-sm); }
.features__grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: var(--space-4); margin-top: var(--space-5); }
.features__card { background: var(--color-surface); border: 1px solid var(--color-border-soft); border-radius: var(--radius-md); padding: var(--space-5); }
.features__group--alt .features__card { background: var(--color-surface-2); }
.features__card-title { font-size: var(--font-size-md); margin-bottom: var(--space-2); color: var(--color-primary-soft); }
.features__card-description { color: var(--color-text-muted); font-size: var(--font-size-sm); }
.features__cta { text-align: center; padding: var(--space-6) 0; }
</style>
