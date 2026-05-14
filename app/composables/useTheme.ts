type Theme = 'light' | 'dark'
const STORAGE_KEY = 'sp-theme'

const theme = ref<Theme>('dark')

function apply(value: Theme, persist: boolean) {
  theme.value = value
  if (import.meta.client) {
    document.documentElement.setAttribute('data-theme', value)
    if (persist) {
      try { localStorage.setItem(STORAGE_KEY, value) } catch {}
    }
  }
}

export function useTheme() {
  function init() {
    if (!import.meta.client) return
    let stored: string | null = null
    try { stored = localStorage.getItem(STORAGE_KEY) } catch {}
    if (stored === 'light' || stored === 'dark') {
      apply(stored, false)
    } else {
      apply('dark', false)
    }
  }

  function toggle() {
    apply(theme.value === 'light' ? 'dark' : 'light', true)
  }

  function setTheme(value: Theme) {
    apply(value, true)
  }

  const isLight = computed(() => theme.value === 'light')

  return { theme, isLight, init, toggle, setTheme }
}
