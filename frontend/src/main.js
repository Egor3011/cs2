import './assets/main.css'
import './assets/match.css'
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { reveal } from './utils/reveal'
createApp(App).directive('reveal', reveal).use(router).mount('#app')
