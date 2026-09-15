import { ref } from 'vue'

const STORAGE_KEY = 'sp-volume'
const DECISION_STORAGE_KEY = 'sp-decision-sound'

const DEFAULT_VOLUME = 0.5

const volume = ref(DEFAULT_VOLUME)
const decisionSoundEnabled = ref(false)

function clamp(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_VOLUME
  return Math.min(1, Math.max(0, value))
}

export function useSoundVolume() {
  function initVolume() {
    let stored: string | null = null
    try { stored = localStorage.getItem(STORAGE_KEY) } catch {}
    volume.value = stored === null ? DEFAULT_VOLUME : clamp(Number(stored))

    let storedDecision: string | null = null
    try { storedDecision = localStorage.getItem(DECISION_STORAGE_KEY) } catch {}
    decisionSoundEnabled.value = storedDecision === 'true'
  }

  function setVolume(value: number) {
    volume.value = clamp(value)
    try { localStorage.setItem(STORAGE_KEY, String(volume.value)) } catch {}
  }

  function setDecisionSoundEnabled(value: boolean) {
    decisionSoundEnabled.value = value
    try { localStorage.setItem(DECISION_STORAGE_KEY, String(value)) } catch {}
  }

  return { volume, decisionSoundEnabled, initVolume, setVolume, setDecisionSoundEnabled }
}
