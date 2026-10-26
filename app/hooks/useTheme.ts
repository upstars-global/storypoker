import { createStore, useStore } from 'zustand'

export type Theme = 'light' | 'dark'
const STORAGE_KEY = 'sp-theme'
const PALETTE_STORAGE_KEY = 'sp-palette'

export type PaletteId = 'classic' | 'cyberdeck' | 'matcha'

export const PALETTES: { id: PaletteId; swatches: [string, string] }[] = [
  { id: 'classic', swatches: ['#546e7a', '#455a64'] },
  { id: 'cyberdeck', swatches: ['#00e5c3', '#0b1220'] },
  { id: 'matcha', swatches: ['#8fb573', '#5b7750'] },
]

const PALETTE_IDS = new Set<string>(PALETTES.map(p => p.id))

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => { ready: Promise<void>; finished: Promise<void> }
}

export type TransitionTrigger = Pick<MouseEvent, 'detail' | 'clientX' | 'clientY' | 'currentTarget'>

export function getTransitionOrigin(event?: TransitionTrigger): { x: number; y: number } {
  if (event && event.detail > 0) return { x: event.clientX, y: event.clientY }

  const target = event?.currentTarget
  if (target instanceof Element) {
    const rect = target.getBoundingClientRect()
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
  }

  return { x: window.innerWidth / 2, y: window.innerHeight / 2 }
}

function storedTheme(): Theme {
  let stored: string | null = null
  try { stored = localStorage.getItem(STORAGE_KEY) } catch {}
  return stored === 'light' || stored === 'dark' ? stored : 'dark'
}

function storedPalette(): PaletteId {
  let stored: string | null = null
  try { stored = localStorage.getItem(PALETTE_STORAGE_KEY) } catch {}
  return stored && PALETTE_IDS.has(stored) ? stored as PaletteId : 'classic'
}

type ThemeState = {
  theme: Theme
  palette: PaletteId
}

export const themeStore = createStore<ThemeState>()(() => ({
  theme: storedTheme(),
  palette: storedPalette(),
}))

function apply(value: Theme, persist: boolean) {
  themeStore.setState({ theme: value })
  document.documentElement.setAttribute('data-theme', value)
  if (persist) {
    try { localStorage.setItem(STORAGE_KEY, value) } catch {}
  }
}

function applyPalette(value: PaletteId, persist: boolean) {
  themeStore.setState({ palette: value })
  document.documentElement.setAttribute('data-palette', value)
  if (persist) {
    try { localStorage.setItem(PALETTE_STORAGE_KEY, value) } catch {}
  }
}

function init() {
  apply(storedTheme(), false)
  applyPalette(storedPalette(), false)
}

function toggle(event?: TransitionTrigger) {
  const next: Theme = themeStore.getState().theme === 'light' ? 'dark' : 'light'
  const doc = document as ViewTransitionDocument
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (typeof doc.startViewTransition !== 'function' || prefersReduced) {
    apply(next, true)
    return
  }

  const { x, y } = getTransitionOrigin(event)

  const root = document.documentElement
  root.setAttribute('data-theme-transition', '')
  const transition = doc.startViewTransition(() => apply(next, true))
  transition.ready
    .then(() => {
      const w = window.innerWidth
      const h = window.innerHeight
      const cx = (x / w) * 100
      const cy = (y / h) * 100
      const radius = Math.hypot(Math.max(x, w - x), Math.max(y, h - y))
      const r = (radius / (Math.hypot(w, h) / Math.SQRT2)) * 100
      root.animate(
        { clipPath: [`circle(0% at ${cx}% ${cy}%)`, `circle(${r}% at ${cx}% ${cy}%)`] },
        { duration: 900, easing: 'ease-in-out', pseudoElement: '::view-transition-new(root)' },
      )
    })
    .catch(() => {})
  void transition.finished.finally(() => root.removeAttribute('data-theme-transition'))
}

function setTheme(value: Theme) {
  apply(value, true)
}

function setPalette(value: PaletteId) {
  applyPalette(value, true)
}

export function useTheme() {
  const theme = useStore(themeStore, s => s.theme)
  const palette = useStore(themeStore, s => s.palette)
  const isLight = theme === 'light'
  return { theme, isLight, palette, init, toggle, setTheme, setPalette }
}
