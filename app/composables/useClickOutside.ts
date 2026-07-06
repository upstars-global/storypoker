import { onMounted, onUnmounted } from 'vue'
import type { Ref } from 'vue'

export function useClickOutside(target: Ref<HTMLElement | null>, handler: () => void): void {
  function listener(e: MouseEvent) {
    if (!target.value || target.value.contains(e.target as Node)) return
    handler()
  }
  onMounted(() => document.addEventListener('mousedown', listener, true))
  onUnmounted(() => document.removeEventListener('mousedown', listener, true))
}
