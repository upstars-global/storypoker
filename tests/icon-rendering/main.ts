import { createApp } from 'vue'
import { createPinia } from 'pinia'
import VWave from 'v-wave'
import { createRouter, createMemoryHistory } from 'vue-router'
import { i18n } from '~/i18n'
import { useTheme } from '~/composables/useTheme'
import { useSoundVolume } from '~/composables/useSoundVolume'
import RoomHarness from './RoomHarness.vue'
import '~/generated/icons.css'
import '~/assets/css/main.css'

const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/:pathMatch(.*)*', component: RoomHarness }],
})

const app = createApp(RoomHarness)
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

router.isReady().then(() => {
  app.mount('#app')
  useTheme().init()
  useSoundVolume().initVolume()
})
