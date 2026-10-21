# 🪒 CRUD Barbería

Panel web para administrar una barbería. Permite agendar **citas por barbero con validación de horarios** (sin solapamientos ni citas fuera del horario de atención), registrar **cobros**, llevar un programa de **fidelidad** para clientes frecuentes y ver **estadísticas** del negocio. Todos los datos se guardan en el `localStorage` del navegador, así que no necesita backend.

## Stack

- **Vue 3** (`<script setup>`) + **Vite**
- **SweetAlert2** (modales y confirmaciones)
- **VueUse** (utilidades reactivas)
- Estilos con CSS puro dentro del componente principal

## Instalación y ejecución

```bash
npm install
npm run dev      # servidor de desarrollo
npm run build    # build de producción en dist/
npm run preview  # previsualizar el build
```

## Despliegue

El proyecto está publicado en GitHub Pages:
**https://jhonpi33.github.io/CRUD_BARBERIA/**

`vite.config.js` ya configura `base: '/CRUD_BARBERIA/'`, necesario para que los assets carguen bien en Pages. Para republicar después de un cambio:

```bash
npm run deploy
```
