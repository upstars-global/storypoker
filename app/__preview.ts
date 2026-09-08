import { createApp, h, ref } from 'vue'
import VWave from 'v-wave'
import RolePicker from '~/components/RolePicker.vue'
import { i18n } from './i18n'
import '~/assets/css/main.css'

const role = ref('QA')

createApp({
  render: () => h('div', { class: 'bg-app min-h-screen p-8' }, [
    h('div', { class: 'mui-paper p-6', style: 'max-width: 420px;' }, [
      h(RolePicker, { modelValue: role.value, 'onUpdate:modelValue': (v: string) => { role.value = v } }),
    ]),
  ]),
})
  .use(i18n)
  .use(VWave, { color: 'currentColor', initialOpacity: 0.35, finalOpacity: 0, duration: 0.4, easing: 'ease-out' })
  .mount('#app')
