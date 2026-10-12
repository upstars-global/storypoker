import { ref } from 'vue'

const STORAGE_KEY = 'sp-timer-alarm'

const DEFAULT_MINUTES = 5
export const ALARM_MIN_MINUTES = 3
export const ALARM_MAX_MINUTES = 20
const CHIME_GAIN = 0.2
const ALARM_BLINK_PERIOD_S = 0.6
const ALARM_BLINK_COUNT = 3

const alarmMinutes = ref(DEFAULT_MINUTES)
const alarmMuted = ref(false)

function clampMinutes(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_MINUTES
  return Math.min(ALARM_MAX_MINUTES, Math.max(ALARM_MIN_MINUTES, Math.round(value)))
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ minutes: alarmMinutes.value, muted: alarmMuted.value }))
  } catch {}
}

let audioCtx: AudioContext | undefined
export function playAlarmChime() {
  audioCtx ??= new AudioContext()
  const ctx = audioCtx
  for (let i = 0; i < ALARM_BLINK_COUNT; i++) {
    const startAt = ctx.currentTime + i * ALARM_BLINK_PERIOD_S
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 1320
    gain.gain.setValueAtTime(CHIME_GAIN, startAt)
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.45)
    osc.connect(gain).connect(ctx.destination)
    osc.start(startAt)
    osc.stop(startAt + 0.5)
  }
}

export function useTimerAlarm() {
  function initAlarm() {
    let stored: { minutes?: unknown; muted?: unknown } | null = null
    try { stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') } catch {}
    alarmMinutes.value = typeof stored?.minutes === 'number' ? clampMinutes(stored.minutes) : DEFAULT_MINUTES
    alarmMuted.value = typeof stored?.muted === 'boolean' ? stored.muted : false
  }

  function setAlarmMinutes(value: number) {
    alarmMinutes.value = clampMinutes(value)
    persist()
  }

  function toggleAlarmMuted() {
    alarmMuted.value = !alarmMuted.value
    persist()
  }

  return { alarmMinutes, alarmMuted, initAlarm, setAlarmMinutes, toggleAlarmMuted }
}
