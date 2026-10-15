<script setup>
const groups = [
  {
    title: 'Agenda y turnos',
    items: [
      {
        name: 'Agenda por barbero',
        description: 'Cada barbero ve y administra sus turnos; el dueño ve todo el local en una vista.',
      },
      {
        name: 'Duración por servicio',
        description: 'Un corte tarda 20 minutos y un diseño 45: la agenda respeta lo que configures.',
      },
      {
        name: 'Bloqueos y descansos',
        description: 'Bloquea horarios para almuerzo, mantenimiento de sillas o días libres.',
      },
      {
        name: 'Reserva desde el celular del cliente',
        description: 'El cliente elige barbero, servicio y horario sin llamadas ni mensajes perdidos.',
      },
    ],
  },
  {
    title: 'Clientes y comunicación',
    items: [
      {
        name: 'Ficha completa del cliente',
        description: 'Preferencias de corte, frecuencia de visita y gasto histórico en un lugar.',
      },
      {
        name: 'Recordatorios automáticos',
        description: 'Confirmación al reservar y recordatorio antes del turno, sin que muevas un dedo.',
      },
      {
        name: 'Reactivación de clientes',
        description: 'Detecta a los que hace semanas no vienen y envíales una invitación a volver.',
      },
    ],
  },
  {
    title: 'Dinero y negocio',
    items: [
      {
        name: 'Cobros rápidos',
        description: 'Registra el cobro en segundos, con propina y método de pago.',
      },
      {
        name: 'Cierre de caja',
        description: 'Resumen del día con ingresos, servicios realizados y diferencias de caja.',
      },
      {
        name: 'Inventario de productos',
        description: 'Controla pomadas, tijeras y productos de venta, con alertas de stock bajo.',
      },
      {
        name: 'Reportes y estadísticas',
        description: 'Ingresos por período, horas pico y desempeño por barbero.',
      },
    ],
  },
]

const iaFeatures = [
  {
    title: 'Asistente que responde consultas',
    description:
      'Contesta dudas frecuentes por WhatsApp (horarios, precios, ubicación) con el tono de tu barbería.',
  },
  {
    title: 'Sugerencia inteligente de horarios',
    description:
      'Cuando un cliente pide turno, propone las mejores opciones libres según duración y disponibilidad.',
  },
  {
    title: 'Alertas de fuga de clientes',
    description:
      'Identifica a los clientes que dejaron de venir y te sugiere cuándo y cómo invitarlos de vuelta.',
  },
]

const faqItems = [
  {
    question: '¿Puedo probar Elysia antes de pagar?',
    answer: 'Sí. Creas tu cuenta, configuras tus servicios y usas la plataforma sin tarjeta de crédito.',
  },
  {
    question: '¿Funciona en el celular?',
    answer: 'Sí, todo Elysia está diseñado primero para el celular: agenda, cobros y reportes.',
  },
]
</script>

<template>
  <div class="features">
    <header class="features__hero">
      <p class="features__eyebrow">Funciones</p>
      <h1 class="features__title">Todo lo que Elysia hace por tu barbería</h1>
      <p class="features__lead">
        Desde el primer turno hasta el cierre de caja: una plataforma pensada para el día a día
        real de una barbería.
      </p>
      <div class="features__actions">
        <RouterLink class="btn btn--primary" to="/register">Crear cuenta gratis</RouterLink>
        <RouterLink class="btn btn--secondary" to="/precios">Ver planes</RouterLink>
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
      <h2 class="features__group-title">Automatización con IA</h2>
      <p class="features__group-lead">
        La inteligencia artificial de Elysia trabaja de fondo para que tú te concentres en la silla.
      </p>
      <div class="features__grid">
        <article v-for="item in iaFeatures" :key="item.title" class="features__card">
          <h3 class="features__card-title">{{ item.title }}</h3>
          <p class="features__card-description">{{ item.description }}</p>
        </article>
      </div>
    </section>

    <section class="features__cta">
      <h2 class="features__group-title">¿Listo para probarlo?</h2>
      <div class="faq-list">
        <div v-for="faq in faqItems" :key="faq.question" class="features__faq">
          <p class="features__faq-q">{{ faq.question }}</p>
          <p class="features__faq-a">{{ faq.answer }}</p>
        </div>
      </div>
      <RouterLink class="btn btn--primary btn--lg" to="/register">Crear cuenta gratis</RouterLink>
    </section>
  </div>
</template>

<style scoped>
.features {
  max-width: var(--container-max);
  margin: 0 auto;
  padding: var(--space-7) var(--space-4);
}

.features__hero {
  text-align: center;
  margin-bottom: var(--space-8);
}

.features__eyebrow {
  display: inline-block;
  font-size: var(--font-size-xs);
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--color-primary-soft);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  padding: 6px 14px;
  margin-bottom: var(--space-4);
  background: var(--color-surface);
}

.features__title {
  font-size: clamp(1.8rem, 5vw, 2.8rem);
  margin-bottom: var(--space-4);
}

.features__lead {
  color: var(--color-text-muted);
  max-width: 600px;
  margin: 0 auto var(--space-5);
  font-size: var(--font-size-md);
}

.features__actions {
  display: flex;
  gap: var(--space-4);
  justify-content: center;
  flex-wrap: wrap;
}

.features__group {
  margin-bottom: var(--space-7);
}

.features__group--alt {
  background: var(--color-surface);
  border: 1px solid var(--color-border-soft);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
}

.features__group-title {
  font-size: clamp(1.3rem, 3.5vw, 1.8rem);
  margin-bottom: var(--space-2);
  text-align: center;
}

.features__group-lead {
  text-align: center;
  color: var(--color-text-muted);
  margin-bottom: var(--space-5);
  font-size: var(--font-size-sm);
}

.features__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: var(--space-4);
  margin-top: var(--space-5);
}

.features__card {
  background: var(--color-surface);
  border: 1px solid var(--color-border-soft);
  border-radius: var(--radius-md);
  padding: var(--space-5);
}

.features__group--alt .features__card {
  background: var(--color-surface-2);
}

.features__card-title {
  font-size: var(--font-size-md);
  margin-bottom: var(--space-2);
  color: var(--color-primary-soft);
}

.features__card-description {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.features__cta {
  text-align: center;
  padding: var(--space-6) 0 var(--space-4);
}

.faq-list {
  max-width: 640px;
  margin: var(--space-5) auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  text-align: left;
}

.features__faq-q {
  font-weight: 600;
  margin-bottom: var(--space-1);
}

.features__faq-a {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}
</style>
