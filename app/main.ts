import { createApp } from 'vue'
import { createPinia } from 'pinia'
import VWave from 'v-wave'
import App from './App.vue'
import { router } from './router'
import { i18n } from './i18n'
import { clickOutside } from './directives/clickOutside'
import { initSupabase } from './lib/supabase-instance'
import { registerAppIcons } from './lib/registerAppIcons'
import '~/assets/css/main.css'

initSupabase()
registerAppIcons()

createApp(App)
  .use(createPinia())
  .use(router)
  .use(i18n)
  .use(VWave, {
    color: 'currentColor',
    initialOpacity: 0.35,
    finalOpacity: 0,
    duration: 0.4,
    easing: 'ease-out',
  })
  .directive('click-outside', clickOutside)
  .mount('#app')
