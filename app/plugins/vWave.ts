import VWave from 'v-wave'

export default defineNuxtPlugin((nuxtApp) => {
  if (import.meta.server) {
    nuxtApp.vueApp.directive('wave', { getSSRProps: () => ({}) })
    return
  }
  nuxtApp.vueApp.use(VWave, {
    color: 'currentColor',
    initialOpacity: 0.35,
    finalOpacity: 0,
    duration: 0.4,
    easing: 'ease-out',
  })
})
