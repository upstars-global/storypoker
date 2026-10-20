import { describe, it, expect, vi, afterEach } from 'vitest'
import { clampAlarmMinutes } from '~/utils/timerAlarm'

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

describe('alarm audio', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  function stubAudioContext(state: AudioContextState) {
    const resume = vi.fn(() => Promise.resolve())
    const node = () => ({
      type: '',
      frequency: { value: 0 },
      gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: vi.fn((next: unknown) => next),
      start: vi.fn(),
      stop: vi.fn(),
    })
    const AudioContextStub = vi.fn(function (this: Record<string, unknown>) {
      Object.assign(this, { state, currentTime: 0, destination: {}, resume, createOscillator: node, createGain: node })
    })
    vi.stubGlobal('AudioContext', AudioContextStub)
    return { resume, AudioContextStub }
  }

  it('resumes a suspended context before the chime', async () => {
    const { resume } = stubAudioContext('suspended')
    const { playAlarmChime } = await import('~/utils/timerAlarm')
    playAlarmChime()
    expect(resume).toHaveBeenCalledTimes(1)
  })

  it('unlocks the shared context on a user gesture so later chimes can play', async () => {
    const { resume, AudioContextStub } = stubAudioContext('suspended')
    const { unlockAlarmAudio, playAlarmChime } = await import('~/utils/timerAlarm')
    unlockAlarmAudio()
    playAlarmChime()
    expect(AudioContextStub).toHaveBeenCalledTimes(1)
    expect(resume).toHaveBeenCalledTimes(2)
  })
})
