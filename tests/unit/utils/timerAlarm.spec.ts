import { describe, it, expect, vi, afterEach } from 'vitest'
import { clampAlarmMinutes, isRoundTimerStale, ROUND_TIMER_CAP_MS } from '~/utils/timerAlarm'

describe('clampAlarmMinutes', () => {
  it('defaults to 5 minutes when the room has no value yet', () => {
    expect(clampAlarmMinutes(null)).toBe(5)
    expect(clampAlarmMinutes(undefined)).toBe(5)
    expect(clampAlarmMinutes(Number.NaN)).toBe(5)
  })

  it('rounds and clamps minutes to the 3-20 range', () => {
    expect(clampAlarmMinutes(7.6)).toBe(8)
    expect(clampAlarmMinutes(1)).toBe(3)
    expect(clampAlarmMinutes(999)).toBe(20)
  })
})

describe('isRoundTimerStale', () => {
  const START = new Date('2026-10-12T10:00:00Z').getTime()
  const state = (overrides: { phase?: 'voting' | 'revealed'; paused_at?: string | null; paused_elapsed_ms?: number } = {}) => ({
    phase: 'voting' as const,
    round_started_at: new Date(START).toISOString(),
    paused_at: null,
    paused_elapsed_ms: 0,
    ...overrides,
  })

  it('is stale once a voting round has run for the cap', () => {
    expect(isRoundTimerStale(state(), START + ROUND_TIMER_CAP_MS - 1)).toBe(false)
    expect(isRoundTimerStale(state(), START + ROUND_TIMER_CAP_MS)).toBe(true)
    expect(isRoundTimerStale(state(), START + 3 * 24 * 60 * 60_000)).toBe(true)
  })

  it('does not count paused time', () => {
    const days = START + 3 * 24 * 60 * 60_000
    expect(isRoundTimerStale(state({ paused_at: new Date(START + 60_000).toISOString() }), days)).toBe(false)
    expect(isRoundTimerStale(state({ paused_elapsed_ms: 30 * 60_000 }), START + ROUND_TIMER_CAP_MS)).toBe(false)
  })

  it('leaves revealed rounds alone', () => {
    expect(isRoundTimerStale(state({ phase: 'revealed' }), START + 3 * 24 * 60 * 60_000)).toBe(false)
  })
})

describe('alarm audio', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  function stubAudioContext(state: AudioContextState) {
    const resume = vi.fn(() => Promise.resolve())
    const createOscillator = vi.fn(() => node())
    const node = () => ({
      type: '',
      frequency: { value: 0 },
      gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: vi.fn((next: unknown) => next),
      start: vi.fn(),
      stop: vi.fn(),
    })
    const AudioContextStub = vi.fn(function (this: Record<string, unknown>) {
      Object.assign(this, { state, currentTime: 0, destination: {}, resume, createOscillator, createGain: node })
    })
    vi.stubGlobal('AudioContext', AudioContextStub)
    return { resume, AudioContextStub, createOscillator }
  }

  it('plays as many beeps as asked', async () => {
    const { createOscillator } = stubAudioContext('running')
    const { playAlarmChime } = await import('~/utils/timerAlarm')
    playAlarmChime(2)
    expect(createOscillator).toHaveBeenCalledTimes(2)
  })

  it('resumes a suspended context before the chime', async () => {
    const { resume } = stubAudioContext('suspended')
    const { playAlarmChime } = await import('~/utils/timerAlarm')
    playAlarmChime(1)
    expect(resume).toHaveBeenCalledTimes(1)
  })

  it('unlocks the shared context on a user gesture so later chimes can play', async () => {
    const { resume, AudioContextStub } = stubAudioContext('suspended')
    const { unlockAlarmAudio, playAlarmChime } = await import('~/utils/timerAlarm')
    unlockAlarmAudio()
    playAlarmChime(1)
    expect(AudioContextStub).toHaveBeenCalledTimes(1)
    expect(resume).toHaveBeenCalledTimes(2)
  })
})
