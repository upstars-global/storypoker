import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useCountdown } from '~/hooks/useCountdown'
import { soundVolumeStore } from '~/hooks/useSoundVolume'

const created: FakeAudio[] = []

class FakeAudio {
  volume = 1
  currentTime = 0
  duration = 10
  paused = true
  onended: (() => void) | null = null
  constructor() { created.push(this) }
  play() {
    this.paused = false
    return Promise.resolve()
  }
  pause() { this.paused = true }
}

describe('useCountdown volume', () => {
  beforeEach(() => {
    created.length = 0
    localStorage.clear()
    vi.stubGlobal('Audio', FakeAudio)
    soundVolumeStore.getState().setVolume(1)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('applies the stored volume to every audio element on mount', () => {
    soundVolumeStore.getState().setVolume(0.5)
    renderHook(() => useCountdown())
    expect(created).toHaveLength(5)
    expect(created.every(a => a.volume === 0.5)).toBe(true)
  })

  it('applies a later volume change to already created elements', () => {
    renderHook(() => useCountdown())
    act(() => soundVolumeStore.getState().setVolume(0.2))
    expect(created.every(a => a.volume === 0.2)).toBe(true)
  })

  it('stops following volume changes after unmount', () => {
    const { unmount } = renderHook(() => useCountdown())
    unmount()
    soundVolumeStore.getState().setVolume(0.3)
    expect(created.some(a => a.volume === 0.3)).toBe(false)
  })
})

describe('useCountdown modes', () => {
  beforeEach(() => {
    created.length = 0
    vi.stubGlobal('Audio', FakeAudio)
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('counts down silently for the fallback ten seconds and then completes', () => {
    const onComplete = vi.fn()
    const { result } = renderHook(() => useCountdown())
    act(() => result.current.startCountdown('silent', onComplete))

    expect(result.current.countdownActive).toBe(true)
    expect(result.current.countdownRunning).toBe(true)
    expect(result.current.countdownTimerTotal).toBe(10)
    expect(result.current.countdownTimerCounter).toBe(10)
    expect(created.every(a => a.paused)).toBe(true)

    act(() => vi.advanceTimersByTime(3000))
    expect(result.current.countdownTimerCounter).toBe(7)

    act(() => vi.advanceTimersByTime(7000))
    expect(onComplete).toHaveBeenCalledOnce()
    expect(result.current.countdownActive).toBe(false)
    expect(result.current.countdownRunning).toBe(false)
    expect(result.current.countdownTimerCounter).toBe(0)
  })

  it('ignores a second start while a countdown runs', () => {
    const first = vi.fn()
    const second = vi.fn()
    const { result } = renderHook(() => useCountdown())
    act(() => result.current.startCountdown('silent', first))
    act(() => result.current.startCountdown('silent', second))

    act(() => vi.advanceTimersByTime(10_000))
    expect(first).toHaveBeenCalledOnce()
    expect(second).not.toHaveBeenCalled()
  })

  it('plays the dry track and times the countdown by its duration', () => {
    const { result } = renderHook(() => useCountdown())
    const dry = created[1]!
    dry.duration = 4.2
    act(() => result.current.startCountdown('dry'))

    expect(dry.paused).toBe(false)
    expect(result.current.countdownTimerTotal).toBe(5)
  })

  it('plays the vote prompt before the wet track and ambience without consensus', () => {
    const onComplete = vi.fn()
    const { result } = renderHook(() => useCountdown())
    const [votePrompt, , wet, ambience] = created
    act(() => result.current.startCountdown('wet', onComplete, () => false))

    expect(votePrompt!.paused).toBe(false)
    expect(wet!.paused).toBe(true)
    expect(result.current.countdownActive).toBe(false)

    act(() => votePrompt!.onended?.())
    expect(wet!.paused).toBe(false)
    expect(result.current.countdownActive).toBe(true)

    act(() => vi.advanceTimersByTime(10_000))
    expect(onComplete).toHaveBeenCalledOnce()
    expect(ambience!.paused).toBe(false)
  })

  it('skips the ambience after a wet countdown with consensus', () => {
    const { result } = renderHook(() => useCountdown())
    const [votePrompt, , , ambience] = created
    act(() => result.current.startCountdown('wet', undefined, () => true))
    act(() => votePrompt!.onended?.())
    act(() => vi.advanceTimersByTime(10_000))
    expect(ambience!.paused).toBe(true)
  })

  it('stops the countdown and its audio without completing', () => {
    const onComplete = vi.fn()
    const { result } = renderHook(() => useCountdown())
    act(() => result.current.startCountdown('dry', onComplete))
    act(() => result.current.stopCountdown())

    act(() => vi.advanceTimersByTime(10_000))
    expect(onComplete).not.toHaveBeenCalled()
    expect(result.current.countdownRunning).toBe(false)
    expect(created.every(a => a.paused)).toBe(true)
  })

  it('stops a running countdown on unmount', () => {
    const onComplete = vi.fn()
    const { result, unmount } = renderHook(() => useCountdown())
    act(() => result.current.startCountdown('silent', onComplete))
    unmount()

    vi.advanceTimersByTime(10_000)
    expect(onComplete).not.toHaveBeenCalled()
  })

  it('plays the decision sound from the start', () => {
    const { result } = renderHook(() => useCountdown())
    const decision = created[4]!
    decision.currentTime = 3
    act(() => result.current.playDecision())
    expect(decision.currentTime).toBe(0)
    expect(decision.paused).toBe(false)
  })
})
