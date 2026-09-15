import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useSoundVolume } from '~/composables/useSoundVolume'

describe('useSoundVolume', () => {
  beforeEach(() => {
    localStorage.clear()
    useSoundVolume().setVolume(0)
    localStorage.clear()
  })

  it('defaults to muted', () => {
    const { volume, initVolume } = useSoundVolume()
    initVolume()
    expect(volume.value).toBe(0)
  })

  it('persists a new value', () => {
    const { volume, setVolume } = useSoundVolume()
    setVolume(0.4)
    expect(volume.value).toBe(0.4)
    expect(localStorage.getItem('sp-volume')).toBe('0.4')
  })

  it('shares state between callers', () => {
    const first = useSoundVolume()
    const second = useSoundVolume()
    first.setVolume(0.25)
    expect(second.volume.value).toBe(0.25)
  })

  it('clamps values outside the range', () => {
    const { volume, setVolume } = useSoundVolume()
    setVolume(2)
    expect(volume.value).toBe(1)
    setVolume(-1)
    expect(volume.value).toBe(0)
  })

  it('reads a stored value on init', () => {
    localStorage.setItem('sp-volume', '0.6')
    const { volume, initVolume } = useSoundVolume()
    initVolume()
    expect(volume.value).toBe(0.6)
  })

  it('falls back to the default for a corrupted stored value', () => {
    localStorage.setItem('sp-volume', 'loud')
    const { volume, initVolume } = useSoundVolume()
    initVolume()
    expect(volume.value).toBe(0)
  })

  it('mutes and restores the previous volume', () => {
    const { volume, setVolume, toggleMute } = useSoundVolume()
    setVolume(0.4)
    toggleMute()
    expect(volume.value).toBe(0)
    toggleMute()
    expect(volume.value).toBe(0.4)
  })

  it('unmutes to an audible level without a prior audible volume', async () => {
    vi.resetModules()
    const { useSoundVolume: fresh } = await import('~/composables/useSoundVolume')
    localStorage.setItem('sp-volume', '0')
    const { volume, initVolume, toggleMute } = fresh()
    initVolume()
    toggleMute()
    expect(volume.value).toBe(0.1)
  })
})
