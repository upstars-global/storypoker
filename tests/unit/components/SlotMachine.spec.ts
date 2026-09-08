import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import SlotMachine from '~/components/SlotMachine.vue'

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  missingWarn: false,
  fallbackWarn: false,
  messages: { en: {} },
})

function mountSlot() {
  return mount(SlotMachine, {
    props: { spinsLeft: 1, canSpin: true },
    global: {
      plugins: [i18n],
      directives: { wave: {} },
      stubs: { AppIcon: true, AppTooltip: { template: '<div><slot name="trigger" /></div>' } },
    },
  })
}

function mockReducedMotion(matches: boolean) {
  vi.spyOn(window, 'matchMedia').mockReturnValue({ matches } as MediaQueryList)
}

describe('SlotMachine under prefers-reduced-motion', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('shows the final symbols without a reel strip and ends the spin after 300ms', async () => {
    mockReducedMotion(true)
    const wrapper = mountSlot()
    await wrapper.get('[data-testid="slot-spin-button"]').trigger('click')
    const reels = wrapper.findAll('[data-testid="slot-reel"]')
    expect(reels).toHaveLength(3)
    for (const reel of reels) expect(reel.findAll('.slot-cell')).toHaveLength(1)
    expect(wrapper.emitted('spin')).toHaveLength(1)
    expect(wrapper.emitted('spinEnd')).toBeUndefined()
    vi.advanceTimersByTime(300)
    expect(wrapper.emitted('spinEnd')).toHaveLength(1)
  })

  it('builds a multi-cell strip when motion is allowed', async () => {
    mockReducedMotion(false)
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 0)
    const wrapper = mountSlot()
    await wrapper.get('[data-testid="slot-spin-button"]').trigger('click')
    const firstReel = wrapper.findAll('[data-testid="slot-reel"]')[0]!
    expect(firstReel.findAll('.slot-cell').length).toBeGreaterThan(1)
  })
})
