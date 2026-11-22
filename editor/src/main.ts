import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import vuetify from './plugins/vuetify'
import './styles/compactInputs.css'
import './styles/iconButtons.css'
import './styles/reset.css'

createApp(App)
  .use(createPinia())
  .use(vuetify)
  .mount('#app')
