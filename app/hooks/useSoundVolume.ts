import { createStore, useStore } from 'zustand'

const STORAGE_KEY = 'sp-volume'

const DEFAULT_VOLUME = 0
const UNMUTE_VOLUME = 0.1

type SoundVolumeState = {
  volume: number
  volumeBeforeMute: number
  initVolume: () => void
  setVolume: (value: number) => void
  toggleMute: () => void
}

function clamp(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_VOLUME
  return Math.min(1, Math.max(0, value))
}

function storedVolume(): number {
  let stored: string | null = null
  try { stored = localStorage.getItem(STORAGE_KEY) } catch {}
  return stored === null ? DEFAULT_VOLUME : clamp(Number(stored))
}

export const soundVolumeStore = createStore<SoundVolumeState>()((set, get) => {
  const initial = storedVolume()
  return {
    volume: initial,
    volumeBeforeMute: initial > 0 ? initial : UNMUTE_VOLUME,

    initVolume() {
      const volume = storedVolume()
      set(volume > 0 ? { volume, volumeBeforeMute: volume } : { volume })
    },

    setVolume(value) {
      const volume = clamp(value)
      set(volume > 0 ? { volume, volumeBeforeMute: volume } : { volume })
      try { localStorage.setItem(STORAGE_KEY, String(volume)) } catch {}
    },

    toggleMute() {
      const { volume, volumeBeforeMute, setVolume } = get()
      setVolume(volume > 0 ? 0 : volumeBeforeMute || UNMUTE_VOLUME)
    },
  }
})

export function useSoundVolume() {
  const volume = useStore(soundVolumeStore, s => s.volume)
  const { initVolume, setVolume, toggleMute } = soundVolumeStore.getState()
  return { volume, initVolume, setVolume, toggleMute }
}
