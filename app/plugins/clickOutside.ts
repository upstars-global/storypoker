export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive('click-outside', {
    getSSRProps: () => ({}),
    mounted(el, binding) {
      if (!import.meta.client) return
      el._clickOutside = (e: MouseEvent) => {
        if (!el.contains(e.target as Node)) binding.value()
      }
      document.addEventListener('click', el._clickOutside)
    },
    unmounted(el) {
      if (!import.meta.client) return
      document.removeEventListener('click', el._clickOutside)
    },
  })
})
