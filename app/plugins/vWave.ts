import VWave from 'v-wave'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(VWave, {
    color: 'currentColor',
    initialOpacity: 0.35,
    finalOpacity: 0,
    duration: 0.4,
    easing: 'ease-out',
  })
})
