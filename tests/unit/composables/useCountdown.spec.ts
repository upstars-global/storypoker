import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, nextTick } from 'vue'
import { useCountdown } from '~/composables/useCountdown'
import { useSoundVolume } from '~/composables/useSoundVolume'

const created: { volume: number }[] = []

class FakeAudio {
  volume = 1
  currentTime = 0
  duration = 10
  onended: (() => void) | null = null
  constructor() { created.push(this) }
  play() { return Promise.resolve() }
  pause() {}
}

const Host = defineComponent({
  setup() {
    return useCountdown()
  },
  template: '<div />',
})

describe('useCountdown volume', () => {
  beforeEach(() => {
    created.length = 0
    localStorage.clear()
    vi.stubGlobal('Audio', FakeAudio)
    useSoundVolume().setVolume(1)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('applies the stored volume to every audio element on mount', () => {
    useSoundVolume().setVolume(0.5)
    mount(Host)
    expect(created).toHaveLength(5)
    expect(created.every(a => a.volume === 0.5)).toBe(true)
  })

  it('applies a later volume change to already created elements', async () => {
    mount(Host)
    useSoundVolume().setVolume(0.2)
    await nextTick()
    expect(created.every(a => a.volume === 0.2)).toBe(true)
  })
})
