export const ALARM_DEFAULT_MINUTES = 5
export const ALARM_MIN_MINUTES = 3
export const ALARM_MAX_MINUTES = 20
export const ROUND_TIMER_CAP_MS = 60 * 60_000
export const ALARM_MAX_BEEPS = 3
const CHIME_GAIN = 0.2
const ALARM_BLINK_PERIOD_S = 0.6

export interface AlarmSettings {
  minutes: number
  muted: boolean
}

export function clampAlarmMinutes(value: number | null | undefined): number {
  if (value == null || !Number.isFinite(value)) return ALARM_DEFAULT_MINUTES
  return Math.min(ALARM_MAX_MINUTES, Math.max(ALARM_MIN_MINUTES, Math.round(value)))
}

interface RoundTimerState {
  phase: 'voting' | 'revealed'
  round_started_at: string
  paused_at: string | null
  paused_elapsed_ms: number | null
}

export function isRoundTimerStale(state: RoundTimerState, now: number): boolean {
  if (state.phase !== 'voting') return false
  const pivot = state.paused_at ? new Date(state.paused_at).getTime() : now
  const elapsed = pivot - new Date(state.round_started_at).getTime() - (state.paused_elapsed_ms ?? 0)
  return elapsed >= ROUND_TIMER_CAP_MS
}

let audioCtx: AudioContext | undefined
function runningAudioContext() {
  audioCtx ??= new AudioContext()
  if (audioCtx.state === 'suspended') void audioCtx.resume()
  return audioCtx
}

export function unlockAlarmAudio() {
  runningAudioContext()
}

export function playAlarmChime(beeps: number) {
  const ctx = runningAudioContext()
  for (let i = 0; i < beeps; i++) {
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
