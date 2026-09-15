import { ref } from 'vue'

const STORAGE_KEY = 'sp-volume'

const DEFAULT_VOLUME = 0.5

const volume = ref(DEFAULT_VOLUME)

function clamp(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_VOLUME
  return Math.min(1, Math.max(0, value))
}

export function useSoundVolume() {
  function initVolume() {
    let stored: string | null = null
    try { stored = localStorage.getItem(STORAGE_KEY) } catch {}
    volume.value = stored === null ? DEFAULT_VOLUME : clamp(Number(stored))
  }

  function setVolume(value: number) {
    volume.value = clamp(value)
    try { localStorage.setItem(STORAGE_KEY, String(volume.value)) } catch {}
  }

  return { volume, initVolume, setVolume }
}
