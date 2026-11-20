import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
// Orden del sistema de diseño (D1): tokens → base → estilos legacy → componentes
// (components.css va al final para que .btn/.card/.input ganen sobre las homónimas de main.css)
import './styles/tokens.css'
import './styles/base.css'
import './styles/main.css'
import './styles/components.css'

createApp(App).use(createPinia()).use(router).mount('#app')
