<script setup>
import AccordionItem from '../components/AccordionItem.vue'

const productOptions = [
  {
    key: 'barbero',
    title: 'Para ti, barbero',
    description:
      'Eres independiente y quieres dejar el cuaderno y los mensajes sueltos. Agenda, clientes y cobros desde el celular.',
    points: ['Agenda personal', 'Recordatorios automáticos', 'Historial de clientes'],
  },
  {
    key: 'barberia',
    title: 'Para tu barbería',
    description:
      'Tienes un equipo y necesitas verlo todo: turnos de cada barbero, caja del día, productos e inventario.',
    points: ['Agenda por barbero', 'Caja e informes', 'Inventario de productos'],
  },
]

const features = [
  {
    icon: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
    title: 'Agenda inteligente',
    description: 'Turnos por barbero, duración por servicio y bloqueos automáticos de horarios.',
  },
  {
    icon: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0',
    title: 'Recordatorios automáticos',
    description: 'El cliente recibe la confirmación y el recordatorio de su turno sin que tú hagas nada.',
  },
  {
    icon: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
    title: 'Ficha de cada cliente',
    description: 'Cortes preferidos, alergias, visitas y gasto histórico en una sola pantalla.',
  },
  {
    icon: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
    title: 'Cobros y caja',
    description: 'Registra cobros en segundos y cierra la caja del día con un resumen claro.',
  },
  {
    icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
    title: 'Equipo y comisiones',
    description: 'Suma barberos, reparte turnos y calcula comisiones sin hojas de cálculo.',
  },
  {
    icon: 'M18 20V10M12 20V4M6 20v-6',
    title: 'Reportes claros',
    description: 'Ingresos, horas pico y rendimiento por barbero para decidir con datos.',
  },
]

const steps = [
  {
    number: '01',
    title: 'Crea tu cuenta',
    description: 'Solo necesitas nombre, correo y contraseña. Tarda menos de un minuto.',
  },
  {
    number: '02',
    title: 'Elige tu tipo de cuenta',
    description: 'Barbero individual o dueño de barbería. Elysia adapta todo el panel a tu caso.',
  },
  {
    number: '03',
    title: 'Configura tus servicios',
    description: 'Define cortes, duraciones y precios. Tu agenda queda lista para recibir turnos.',
  },
  {
    number: '04',
    title: 'Empieza a recibir turnos',
    description: 'Comparte tu agenda y deja que los recordatorios trabajen por ti.',
  },
]

const plans = [
  {
    name: 'Plan Barbero',
    price: '$9.900',
    period: '/mes',
    tagline: 'Para el barbero independiente',
    features: [
      'Agenda personal inteligente',
      'Recordatorios automáticos',
      'Ficha de clientes',
      'Cobros y cierre de caja',
    ],
    cta: 'Empezar gratis',
  },
  {
    name: 'Plan Barbería',
    price: '$24.900',
    period: '/mes',
    tagline: 'Para equipos y locales con varios barberos',
    features: [
      'Todo lo del Plan Barbero',
      'Agenda por cada barbero del equipo',
      'Roles de empleado y permisos',
      'Inventario de productos',
      'Reportes e informes de negocio',
    ],
    highlight: true,
    cta: 'Empezar gratis',
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
    question: '¿Puedo usarlo con varios barberos?',
    answer:
      'Sí. El Plan Barbería está pensado para equipos: cada barbero tiene su agenda y tú ves el negocio completo en un solo lugar.',
  },
  {
    question: '¿Qué pasa con la IA? ¿Va a responder por mí?',
    answer:
      'La IA propone horarios y responde consultas repetitivas, pero siempre dentro de tus reglas: tú decides qué puede y qué no puede hacer.',
  },
  {
    question: '¿Cuándo puedo cancelar?',
    answer:
      'Cuando quieras, desde tu panel. Sin permanencia mínima ni preguntas incómodas.',
  },
]
</script>

<template>
  <div class="landing">
    <!-- 2. Hero principal -->
    <section class="hero">
      <div class="hero__content">
        <p class="hero__eyebrow">Software de gestión para barberías</p>
        <h1 class="hero__title">
          Tu barbería,<br />
          <span class="hero__title-accent">automatizada</span> de principio a fin.
        </h1>
        <p class="hero__subtitle">
          Elysia agenda tus turnos, recuerda a tus clientes, controla tu caja y usa inteligencia
          artificial para que dejes de apagar incendios y te dediques a cortar pelo.
        </p>
        <div class="hero__actions">
          <RouterLink class="btn btn--primary btn--lg" to="/register">Crear cuenta gratis</RouterLink>
          <RouterLink class="btn btn--secondary btn--lg" to="/precios">Ver planes</RouterLink>
        </div>
        <p class="hero__note">Sin tarjeta de crédito. Configúralo en menos de 5 minutos.</p>
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
      <h2 class="section__title">¿Para quién es Elysia?</h2>
      <p class="section__lead">Elige tu perfil y el panel se adapta a cómo trabajas.</p>

      <div class="product-grid">
        <article v-for="option in productOptions" :key="option.key" class="product-card">
          <span class="product-card__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path v-if="option.key === 'barbero'" d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle v-if="option.key === 'barbero'" cx="12" cy="7" r="4" />
              <path v-if="option.key === 'barberia'" d="M3 21h18" />
              <path v-if="option.key === 'barberia'" d="M5 21V7l7-4 7 4v14" />
              <path v-if="option.key === 'barberia'" d="M9 21v-6h6v6" />
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
      <h2 class="section__title">Todo lo que tu barbería necesita</h2>
      <p class="section__lead">Un solo lugar para agendar, cobrar, vender y analizar.</p>

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

    <!-- 5. Sección de automatización con IA -->
    <section class="section ai-section">
      <div class="ai-section__content">
        <p class="ai-section__eyebrow">Inteligencia artificial</p>
        <h2 class="section__title">La IA atiende, tú cortas</h2>
        <p class="section__lead ai-section__lead">
          Elysia usa IA para responder consultas, sugerir horarios libres y detectar clientes
          que están por irse. Trabaja con tus reglas, nunca por su cuenta.
        </p>
        <ul class="ai-section__list">
          <li>Responde dudas frecuentes por WhatsApp las 24 horas.</li>
          <li>Sugiere el mejor horario disponible cuando un cliente pide turno.</li>
          <li>Alerta a los clientes que hace meses no visitan la barbería.</li>
        </ul>
      </div>
      <div class="ai-section__demo" aria-hidden="true">
        <p class="ai-chat__bubble ai-chat__bubble--client">¿Tienen turno mañana tarde?</p>
        <p class="ai-chat__bubble ai-chat__bubble--ia">
          ¡Hola Carlos! Sí: tengo 16:30 o 18:00 con Andrés. ¿Cuál te sirve?
        </p>
        <p class="ai-chat__bubble ai-chat__bubble--client">16:30, perfecto.</p>
        <p class="ai-chat__bubble ai-chat__bubble--ia">
          Listo ✅ Turno reservado. Te recuerdo mañana a las 10:00.
        </p>
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
      <h2 class="section__title">Planes simples, sin sorpresas</h2>
      <p class="section__lead">Empieza gratis. Crece cuando tu barbería lo pida.</p>

      <div class="plan-grid">
        <article
          v-for="plan in plans"
          :key="plan.name"
          class="plan-card"
          :class="{ 'plan-card--highlight': plan.highlight }"
        >
          <span v-if="plan.highlight" class="plan-card__badge">Recomendado</span>
          <h3 class="plan-card__name">{{ plan.name }}</h3>
          <p class="plan-card__price">
            {{ plan.price }}<span class="plan-card__period">{{ plan.period }}</span>
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
        <RouterLink class="btn btn--secondary" to="/precios">Comparar planes en detalle</RouterLink>
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
      <h2 class="section__title">Deja el cuaderno. Empieza con Elysia.</h2>
      <p class="section__lead">
        Crea tu cuenta hoy y ten tu barbería funcionando con agenda en línea esta misma semana.
      </p>
      <RouterLink class="btn btn--primary btn--lg" to="/register">Crear cuenta gratis</RouterLink>
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

.hero__note {
  margin-top: var(--space-4);
  font-size: var(--font-size-xs);
  color: var(--text-muted);
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
  content: '✓ ';
  color: var(--success);
  font-weight: 700;
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
  content: '✦ ';
  color: var(--accent);
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

.plan-card__badge {
  position: absolute;
  top: -12px;
  left: var(--space-6);
  background: var(--accent);
  color: var(--accent-contrast);
  font-size: var(--font-size-xs);
  font-weight: 700;
  padding: 4px 12px;
  border-radius: var(--radius-pill);
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
  content: '✓ ';
  color: var(--success);
  font-weight: 700;
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
