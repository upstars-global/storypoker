import { describe, it, expect, beforeEach } from 'vitest'
import { useSoundVolume } from '~/composables/useSoundVolume'

describe('useSoundVolume', () => {
  beforeEach(() => {
    localStorage.clear()
    useSoundVolume().setVolume(1)
    localStorage.clear()
  })

  it('defaults to full volume', () => {
    const { volume } = useSoundVolume()
    expect(volume.value).toBe(1)
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

  it('falls back to full volume for a corrupted stored value', () => {
    localStorage.setItem('sp-volume', 'loud')
    const { volume, initVolume } = useSoundVolume()
    initVolume()
    expect(volume.value).toBe(1)
  })
})
