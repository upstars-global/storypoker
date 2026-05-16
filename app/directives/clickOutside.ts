import type { Directive } from 'vue'

type ClickOutsideEl = HTMLElement & { _clickOutside?: (e: MouseEvent) => void }

export const clickOutside: Directive<ClickOutsideEl, () => void> = {
  mounted(el, binding) {
    el._clickOutside = (e: MouseEvent) => {
      if (!el.contains(e.target as Node)) binding.value()
    }
    document.addEventListener('click', el._clickOutside)
  },
  unmounted(el) {
    if (el._clickOutside) document.removeEventListener('click', el._clickOutside)
  },
}
