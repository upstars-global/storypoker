import { ref, computed } from 'vue'

type Theme = 'light' | 'dark'
const STORAGE_KEY = 'sp-theme'

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => { ready: Promise<void> }
}

const theme = ref<Theme>('dark')

function apply(value: Theme, persist: boolean) {
  theme.value = value
  document.documentElement.setAttribute('data-theme', value)
  if (persist) {
    try { localStorage.setItem(STORAGE_KEY, value) } catch {}
  }
}

export function useTheme() {
  function init() {
    let stored: string | null = null
    try { stored = localStorage.getItem(STORAGE_KEY) } catch {}
    if (stored === 'light' || stored === 'dark') {
      apply(stored, false)
    } else {
      apply('dark', false)
    }
  }

  function toggle(event?: MouseEvent) {
    const next: Theme = theme.value === 'light' ? 'dark' : 'light'
    const doc = document as ViewTransitionDocument
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (typeof doc.startViewTransition !== 'function' || prefersReduced) {
      apply(next, true)
      return
    }

    const x = event?.clientX ?? window.innerWidth / 2
    const y = event?.clientY ?? window.innerHeight / 2

    const transition = doc.startViewTransition(() => apply(next, true))
    transition.ready
      .then(() => {
        const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))
        document.documentElement.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          { duration: 450, easing: 'ease-in-out', pseudoElement: '::view-transition-new(root)' },
        )
      })
      .catch(() => {})
  }

  function setTheme(value: Theme) {
    apply(value, true)
  }

  const isLight = computed(() => theme.value === 'light')

  return { theme, isLight, init, toggle, setTheme }
}
