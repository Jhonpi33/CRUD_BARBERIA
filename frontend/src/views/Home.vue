<script setup>
import AccordionItem from '../components/AccordionItem.vue'

const productOptions = [
  {
    key: 'barbero',
    title: 'Para barberos independientes',
    description:
      'Organiza tus servicios, horarios, reservas, clientes y caja desde el celular o computador.',
    points: ['Perfil público y reservas en línea', 'Agenda y clientes', 'Caja básica'],
  },
]

const features = [
  {
    icon: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
    title: 'Agenda y reservas',
    description: 'Define tus servicios y horarios; comparte un enlace para que tus clientes reserven.',
  },
  {
    icon: 'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.2 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.96.36 1.9.7 2.79a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.89.34 1.83.58 2.79.7a2 2 0 0 1 1.74 2.03z',
    title: 'Mensajes listos para WhatsApp',
    description: 'Usa textos preparados para confirmar, recordar o cancelar una cita manualmente.',
  },
  {
    icon: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
    title: 'Ficha de cada cliente',
    description: 'Consulta las citas y las notas privadas que guardas para cada cliente.',
  },
  {
    icon: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
    title: 'Control de citas',
    description: 'Confirma, completa o cancela las solicitudes desde tu agenda.',
  },
  {
    icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
    title: 'Caja diaria',
    description: 'Registra apertura, ingresos y egresos; al final revisa el cuadre de caja.',
  },
]

const steps = [
  {
    number: '01',
    title: 'Crea tu cuenta',
    description: 'Regístrate con tu nombre y verifica tu correo.',
  },
  {
    number: '02',
    title: 'Completa tu perfil',
    description: 'Agrega los datos que verán tus clientes en tu perfil público.',
  },
  {
    number: '03',
    title: 'Configura tus servicios',
    description: 'Define tus servicios, precios, duraciones y horarios de atención.',
  },
  {
    number: '04',
    title: 'Empieza a recibir turnos',
    description: 'Comparte tu perfil por WhatsApp o redes y gestiona las solicitudes desde tu agenda.',
  },
]

const plans = [
  {
    name: 'Barbero independiente',
    price: '$30.000',
    period: 'COP / mes',
    tagline: 'Organiza tu agenda y recibe reservas desde tu perfil público.',
    features: [
      'Perfil público y enlace para compartir',
      'Catálogo de servicios y horarios',
      'Reservas en línea y agenda',
      'Directorio e historial de clientes',
      'Caja básica y mensajes manuales para WhatsApp',
    ],
    cta: 'Crear cuenta',
  },
]

const faqs = [
  {
    question: '¿Necesito instalar algo?',
    answer:
      'No. Elysia funciona desde el navegador de tu celular o computador. No hay apps que descargar ni actualizaciones que instalar.',
  },
  {
    question: '¿Mis clientes tienen que crear una cuenta?',
    answer:
      'No. Tus clientes agendan desde un enlace sencillo, sin registro ni contraseñas.',
  },
  {
    question: '¿Elysia manda los mensajes de WhatsApp automáticamente?',
    answer:
      'Desde la agenda puedes abrir mensajes preparados, revisarlos y enviarlos por WhatsApp.',
  },
  {
    question: '¿Cómo se paga el plan?',
    answer:
      'El pago mensual se coordina directamente con el equipo de Elysia.',
  },
  {
    question: '¿Después seguirá costando lo mismo?',
    answer:
      'Te informaremos de cualquier cambio de precio antes de aplicarlo.',
  },
]
</script>

<template>
  <div class="landing">
    <!-- 2. Hero principal -->
    <section class="hero">
      <div class="hero__content">
        <p class="hero__eyebrow">Agenda para barberos independientes</p>
        <h1 class="hero__title">
          Tu agenda,<br />
          <span class="hero__title-accent">en orden</span> y lista para compartir.
        </h1>
        <p class="hero__subtitle">
          Recibe reservas desde tu perfil, organiza tus citas y registra tu caja.
        </p>
        <div class="hero__actions">
          <RouterLink class="btn btn--primary btn--lg" to="/registro">Crear cuenta</RouterLink>
          <RouterLink class="btn btn--secondary btn--lg" to="/precios">Ver precios</RouterLink>
        </div>
      </div>

      <!-- Maqueta de agenda hecha solo con HTML/CSS (sin imágenes externas) -->
      <div class="hero-mock" aria-hidden="true">
        <div class="hero-mock__head">
          <span class="hero-mock__dot"></span>
          <span class="hero-mock__title">Mi agenda · Hoy</span>
        </div>
        <ul class="hero-mock__list">
          <li class="hero-mock__row">
            <span class="hero-mock__time">09:00</span>
            <span class="hero-mock__info">
              <strong>Andrés Martínez</strong>
              <small>Corte · 30 min</small>
            </span>
            <span class="badge badge-warning">Pendiente</span>
          </li>
          <li class="hero-mock__row">
            <span class="hero-mock__time">10:30</span>
            <span class="hero-mock__info">
              <strong>Lucía Gómez</strong>
              <small>Barba y corte · 45 min</small>
            </span>
            <span class="badge badge-info">Confirmada</span>
          </li>
          <li class="hero-mock__row">
            <span class="hero-mock__time">11:15</span>
            <span class="hero-mock__info">
              <strong>Camilo Rueda</strong>
              <small>Corte · 30 min</small>
            </span>
            <span class="badge badge-success">Completada</span>
          </li>
        </ul>
      </div>
    </section>

    <!-- 3. Selector de producto -->
    <section class="section">
      <h2 class="section__title">Hecho para tu trabajo diario</h2>

      <div class="product-grid">
        <article v-for="option in productOptions" :key="option.key" class="product-card">
          <span class="product-card__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path v-if="option.key === 'barbero'" d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle v-if="option.key === 'barbero'" cx="12" cy="7" r="4" />
            </svg>
          </span>
          <h3 class="product-card__title">{{ option.title }}</h3>
          <p class="product-card__description">{{ option.description }}</p>
          <ul class="product-card__points">
            <li v-for="point in option.points" :key="point">{{ point }}</li>
          </ul>
          <RouterLink class="product-card__link" to="/precios">
            Ver qué incluye &rarr;
          </RouterLink>
        </article>
      </div>
    </section>

    <!-- 4. Funcionalidades principales -->
    <section class="section section--alt">
      <h2 class="section__title">Gestiona tus citas y tu caja</h2>

      <div class="feature-grid">
        <article v-for="feature in features" :key="feature.title" class="feature-card">
          <span class="feature-card__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path :d="feature.icon" />
            </svg>
          </span>
          <h3 class="feature-card__title">{{ feature.title }}</h3>
          <p class="feature-card__description">{{ feature.description }}</p>
        </article>
      </div>

      <p class="section__cta">
        <RouterLink class="btn btn--secondary" to="/funciones">Explorar todas las funciones</RouterLink>
      </p>
    </section>

    <!-- Comunicación desde la agenda -->
    <section class="section ai-section">
      <div class="ai-section__content">
        <p class="ai-section__eyebrow">Tú mantienes el control</p>
        <h2 class="section__title">Coordina cada cita por WhatsApp</h2>
        <p class="section__lead ai-section__lead">
          Desde la agenda puedes abrir mensajes preparados para confirmar, recordar o cancelar.
          Revísalos y envíalos desde tu propio WhatsApp.
        </p>
        <ul class="ai-section__list">
          <li>Revisa las solicitudes de reserva en tu agenda.</li>
          <li>Contacta al cliente con un texto listo para enviar.</li>
          <li>Confirma el servicio, fecha y hora antes de atender.</li>
        </ul>
      </div>
      <div class="ai-section__demo" aria-hidden="true">
        <p class="ai-chat__bubble ai-chat__bubble--client">Nueva solicitud de cita</p>
        <p class="ai-chat__bubble ai-chat__bubble--ia">Revisa el horario y el servicio en tu agenda.</p>
        <p class="ai-chat__bubble ai-chat__bubble--client">Confirmo por WhatsApp</p>
        <p class="ai-chat__bubble ai-chat__bubble--ia">Tú envías el mensaje cuando esté todo listo.</p>
      </div>
    </section>

    <!-- 6. Cómo funciona Elysia -->
    <section class="section section--alt">
      <h2 class="section__title">Cómo funciona Elysia</h2>
      <p class="section__lead">De cero a tu primera agenda en línea, en cuatro pasos.</p>

      <ol class="steps">
        <li v-for="step in steps" :key="step.number" class="step">
          <span class="step__number">{{ step.number }}</span>
          <h3 class="step__title">{{ step.title }}</h3>
          <p class="step__description">{{ step.description }}</p>
        </li>
      </ol>
    </section>

    <!-- 7. Comparación de planes (resumen) -->
    <section class="section">
      <h2 class="section__title">Un plan mensual</h2>

      <div class="plan-grid">
        <article
          v-for="plan in plans"
          :key="plan.name"
          class="plan-card"
          :class="{ 'plan-card--highlight': plan.highlight }"
        >
          <h3 class="plan-card__name">{{ plan.name }}</h3>
          <p class="plan-card__price">
            {{ plan.price }}<span class="plan-card__period"> COP / mes</span>
          </p>
          <p class="plan-card__tagline">{{ plan.tagline }}</p>
          <ul class="plan-card__features">
            <li v-for="feature in plan.features" :key="feature">{{ feature }}</li>
          </ul>
          <RouterLink
            class="btn"
            :class="plan.highlight ? 'btn--primary' : 'btn--secondary'"
            to="/register"
          >
            {{ plan.cta }}
          </RouterLink>
        </article>
      </div>

      <p class="section__cta">
        <RouterLink class="btn btn--secondary" to="/precios">Ver detalles del plan</RouterLink>
      </p>
    </section>

    <!-- 8. Preguntas frecuentes -->
    <section class="section section--alt">
      <h2 class="section__title">Preguntas frecuentes</h2>
      <p class="section__lead">Lo que suelen preguntarnos antes de empezar.</p>

      <div class="faq">
        <AccordionItem v-for="faq in faqs" :key="faq.question" :question="faq.question">
          {{ faq.answer }}
        </AccordionItem>
      </div>
    </section>

    <!-- CTA final -->
    <section class="section final-cta">
      <h2 class="section__title">Abre tu agenda en Elysia</h2>
      <p class="section__lead">
        Crea tu perfil y comparte tu enlace para recibir reservas.
      </p>
      <RouterLink class="btn btn--primary btn--lg" to="/registro">Crear cuenta</RouterLink>
    </section>
  </div>
</template>

<style scoped>
.landing {
  overflow: hidden;
}

/* ---------- Hero ---------- */
.hero {
  position: relative;
  max-width: var(--container-max);
  margin: 0 auto;
  padding: clamp(48px, 8vw, 96px) var(--space-4);
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: var(--space-7);
  align-items: center;
  text-align: left;
}

/* Resplandor radial suave con --accent-soft */
.hero::before {
  content: '';
  position: absolute;
  top: -20%;
  left: 20%;
  width: 700px;
  height: 700px;
  max-width: 90vw;
  background: radial-gradient(circle, var(--accent-soft) 0%, transparent 65%);
  z-index: -1;
  pointer-events: none;
}

.hero__eyebrow {
  display: inline-block;
  font-size: var(--font-size-xs);
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--accent);
  border: 1px solid var(--accent-border);
  border-radius: var(--radius-pill);
  padding: 6px 14px;
  margin-bottom: var(--space-5);
  background: var(--accent-soft);
}

.hero__title {
  font-size: clamp(2.2rem, 6vw, 4rem);
  line-height: 1.08;
  margin-bottom: var(--space-5);
}

.hero__title-accent {
  color: var(--accent);
}

.hero__subtitle {
  max-width: 560px;
  margin-bottom: var(--space-6);
  color: var(--text-muted);
  font-size: var(--font-size-md);
}

.hero__actions {
  display: flex;
  gap: var(--space-4);
  justify-content: flex-start;
  flex-wrap: wrap;
}

/* Maqueta de agenda (solo HTML/CSS) */
.hero-mock {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.hero-mock__head {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.hero-mock__dot {
  width: 10px;
  height: 10px;
  border-radius: var(--radius-full);
  background: var(--accent);
}

.hero-mock__title {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: var(--font-size-sm);
}

.hero-mock__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.hero-mock__row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  background: var(--surface-2);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-md);
}

.hero-mock__time {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: var(--font-size-md);
  color: var(--text);
}

.hero-mock__info {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.hero-mock__info strong {
  font-size: var(--font-size-sm);
  font-weight: 600;
}

.hero-mock__info small {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
}

/* ---------- Secciones genéricas ---------- */
.section {
  max-width: var(--container-max);
  margin: 0 auto;
  padding: clamp(48px, 7vw, 88px) var(--space-4);
  text-align: center;
}

.section--alt {
  max-width: none;
  background: var(--surface);
  border-top: 1px solid var(--border-soft);
  border-bottom: 1px solid var(--border-soft);
}

.section--alt > * {
  max-width: var(--container-max);
  margin-left: auto;
  margin-right: auto;
}

.section__title {
  font-size: clamp(1.6rem, 4vw, 2.4rem);
  margin-bottom: var(--space-3);
}

.section__lead {
  color: var(--text-muted);
  max-width: 620px;
  margin: 0 auto var(--space-6);
}

.section__cta {
  margin-top: var(--space-6);
}

/* ---------- Selector de producto ---------- */
.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-5);
  text-align: left;
}

.product-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  transition:
    border-color var(--motion) ease,
    transform var(--motion) ease,
    box-shadow var(--motion) ease;
}

.product-card:hover {
  border-color: var(--accent);
  transform: translateY(-4px);
  box-shadow: var(--shadow-md);
}

.product-card__icon {
  width: 52px;
  height: 52px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-md);
  background: var(--accent-soft);
  color: var(--accent);
  margin-bottom: var(--space-1);
}

.product-card__icon svg {
  width: 26px;
  height: 26px;
}

.product-card__title {
  font-size: var(--font-size-lg);
  color: var(--text);
}

.product-card__description {
  color: var(--text-muted);
  font-size: var(--font-size-sm);
}

.product-card__points {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  font-size: var(--font-size-sm);
  margin: var(--space-2) 0;
}

.product-card__points li::before {
  content: '';
  display: inline-block;
  width: 1em;
  height: 1em;
  margin-right: 0.35em;
  vertical-align: -0.15em;
  background-color: var(--success);
  -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 6 9 17l-5-5'/%3E%3C/svg%3E") center / contain no-repeat;
  mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 6 9 17l-5-5'/%3E%3C/svg%3E") center / contain no-repeat;
}

.product-card__link {
  margin-top: auto;
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--accent);
}

.product-card__link:hover {
  color: var(--accent-hover);
}

/* ---------- Funcionalidades ---------- */
.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: var(--space-5);
  text-align: left;
}

.feature-card {
  background: var(--surface);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-md);
  padding: var(--space-5);
  transition: border-color var(--motion) ease, transform var(--motion) ease;
}

.feature-card:hover {
  border-color: var(--accent-border);
  transform: translateY(-2px);
}

.feature-card__icon {
  width: 46px;
  height: 46px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-full);
  background: var(--accent-soft);
  color: var(--accent);
  margin-bottom: var(--space-3);
}

.feature-card__icon svg {
  width: 22px;
  height: 22px;
}

.feature-card__title {
  font-size: var(--font-size-md);
  margin-bottom: var(--space-2);
}

.feature-card__description {
  color: var(--text-muted);
  font-size: var(--font-size-sm);
}

/* ---------- IA ---------- */
.ai-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-7);
  align-items: center;
  text-align: left;
}

.ai-section__eyebrow {
  display: inline-block;
  font-size: var(--font-size-xs);
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--accent);
  border: 1px solid var(--accent-border);
  border-radius: var(--radius-pill);
  padding: 6px 14px;
  margin-bottom: var(--space-5);
  background: var(--accent-soft);
}

.ai-section__lead {
  margin-left: 0;
  text-align: left;
}

.ai-section__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  font-size: var(--font-size-sm);
}

.ai-section__list li::before {
  content: '';
  display: inline-block;
  width: 1em;
  height: 1em;
  margin-right: 0.35em;
  vertical-align: -0.1em;
  background-color: var(--accent);
  -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='black'%3E%3Cpath d='M12 2c1 6 4 9 10 10-6 1-9 4-10 10-1-6-4-9-10-10 6-1 9-4 10-10z'/%3E%3C/svg%3E") center / contain no-repeat;
  mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='black'%3E%3Cpath d='M12 2c1 6 4 9 10 10-6 1-9 4-10 10-1-6-4-9-10-10 6-1 9-4 10-10z'/%3E%3C/svg%3E") center / contain no-repeat;
}

.ai-section__demo {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  box-shadow: var(--shadow-md);
}

.ai-chat__bubble {
  max-width: 85%;
  padding: 10px 14px;
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
}

.ai-chat__bubble--client {
  align-self: flex-end;
  background: var(--surface-2);
  border: 1px solid var(--border);
}

.ai-chat__bubble--ia {
  align-self: flex-start;
  background: var(--accent-soft);
  border: 1px solid var(--accent-border);
  color: var(--text);
}

/* ---------- Pasos ---------- */
.steps {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--space-5);
  text-align: left;
  counter-reset: step;
}

.step {
  position: relative;
  background: var(--surface);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-md);
  padding: var(--space-5);
}

/* Línea conectora entre pasos (solo en escritorio) */
.step:not(:last-child)::after {
  content: '';
  position: absolute;
  top: 32px;
  right: -14px;
  width: 12px;
  height: 2px;
  background: var(--accent-border);
}

.step__number {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: var(--font-size-lg);
  color: var(--accent);
  display: inline-grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: var(--radius-full);
  background: var(--accent-soft);
  margin-bottom: var(--space-3);
}

.step__title {
  font-size: var(--font-size-md);
  margin-bottom: var(--space-2);
}

.step__description {
  color: var(--text-muted);
  font-size: var(--font-size-sm);
}

/* ---------- Planes ---------- */
.plan-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-5);
  text-align: left;
}

.plan-card {
  position: relative;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.plan-card--highlight {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent), var(--shadow-md);
}

.plan-card__name {
  font-size: var(--font-size-md);
  color: var(--text);
}

.plan-card__price {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: var(--font-size-xl);
}

.plan-card__period {
  font-family: var(--font-body);
  font-weight: 400;
  font-size: var(--font-size-sm);
  color: var(--text-muted);
}

.plan-card__tagline {
  color: var(--text-muted);
  font-size: var(--font-size-sm);
}

.plan-card__features {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  font-size: var(--font-size-sm);
  margin: var(--space-3) 0;
}

.plan-card__features li::before {
  content: '';
  display: inline-block;
  width: 1em;
  height: 1em;
  margin-right: 0.35em;
  vertical-align: -0.15em;
  background-color: var(--success);
  -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 6 9 17l-5-5'/%3E%3C/svg%3E") center / contain no-repeat;
  mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 6 9 17l-5-5'/%3E%3C/svg%3E") center / contain no-repeat;
}

.plan-card .btn {
  margin-top: auto;
  width: 100%;
}

/* ---------- FAQ ---------- */
.faq {
  max-width: 720px;
  margin: 0 auto;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

/* ---------- CTA final ---------- */
.final-cta {
  background: linear-gradient(180deg, var(--surface) 0%, var(--bg) 100%);
}

.final-cta .btn {
  margin-top: var(--space-2);
}

/* ---------- Responsive ---------- */
@media (max-width: 900px) {
  .hero {
    grid-template-columns: 1fr;
    text-align: center;
  }

  .hero__subtitle,
  .hero__actions {
    margin-left: auto;
    margin-right: auto;
    justify-content: center;
  }

  .hero-mock {
    max-width: 440px;
    margin: 0 auto;
    width: 100%;
  }

  .step:not(:last-child)::after {
    display: none;
  }
}

@media (max-width: 820px) {
  .ai-section {
    grid-template-columns: 1fr;
  }

  .ai-section__lead {
    text-align: left;
  }
}
</style>
