import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { soundVolumeStore, useSoundVolume } from '~/hooks/useSoundVolume'

describe('useSoundVolume', () => {
  beforeEach(() => {
    localStorage.clear()
    soundVolumeStore.getState().setVolume(0)
    localStorage.clear()
  })

  it('defaults to muted', () => {
    const { result } = renderHook(() => useSoundVolume())
    act(() => result.current.initVolume())
    expect(result.current.volume).toBe(0)
  })

  it('persists a new value', () => {
    const { result } = renderHook(() => useSoundVolume())
    act(() => result.current.setVolume(0.4))
    expect(result.current.volume).toBe(0.4)
    expect(localStorage.getItem('sp-volume')).toBe('0.4')
  })

  it('shares state between callers', () => {
    const first = renderHook(() => useSoundVolume())
    const second = renderHook(() => useSoundVolume())
    act(() => first.result.current.setVolume(0.25))
    expect(second.result.current.volume).toBe(0.25)
  })

  it('clamps values outside the range', () => {
    const { result } = renderHook(() => useSoundVolume())
    act(() => result.current.setVolume(2))
    expect(result.current.volume).toBe(1)
    act(() => result.current.setVolume(-1))
    expect(result.current.volume).toBe(0)
  })

  it('reads a stored value on init', () => {
    localStorage.setItem('sp-volume', '0.6')
    const { result } = renderHook(() => useSoundVolume())
    act(() => result.current.initVolume())
    expect(result.current.volume).toBe(0.6)
  })

  it('falls back to the default for a corrupted stored value', () => {
    localStorage.setItem('sp-volume', 'loud')
    const { result } = renderHook(() => useSoundVolume())
    act(() => result.current.initVolume())
    expect(result.current.volume).toBe(0)
  })

  it('mutes and restores the previous volume', () => {
    const { result } = renderHook(() => useSoundVolume())
    act(() => result.current.setVolume(0.4))
    act(() => result.current.toggleMute())
    expect(result.current.volume).toBe(0)
    act(() => result.current.toggleMute())
    expect(result.current.volume).toBe(0.4)
  })

  it('unmutes to an audible level without a prior audible volume', async () => {
    vi.resetModules()
    const { soundVolumeStore: fresh } = await import('~/hooks/useSoundVolume')
    localStorage.setItem('sp-volume', '0')
    const { initVolume, toggleMute } = fresh.getState()
    initVolume()
    toggleMute()
    expect(fresh.getState().volume).toBe(0.1)
  })

  it('reads the stored value when the store is created', async () => {
    vi.resetModules()
    localStorage.setItem('sp-volume', '0.7')
    const { soundVolumeStore: fresh } = await import('~/hooks/useSoundVolume')
    expect(fresh.getState().volume).toBe(0.7)
    expect(localStorage.getItem('sp-volume')).toBe('0.7')
  })
})
