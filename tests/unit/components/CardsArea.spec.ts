import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import CardsArea from '~/components/CardsArea.vue'

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  missingWarn: false,
  fallbackWarn: false,
  messages: { en: { cards: { reset: 'Reset Estimates', lastRound: 'Previous Round' } } },
})

function mountCards(showLastRound: boolean) {
  return mount(CardsArea, {
    props: {
      activeCards: ['1', '2', '3'],
      selectedVote: null,
      isModerator: true,
      hasVotes: true,
      canReset: true,
      countdownCounter: 0,
      countdownRunning: false,
      pollMode: false,
      voteQuestionMode: false,
      pollQuestion: null,
      hasLastRound: true,
      showLastRound,
    },
    global: {
      plugins: [i18n],
      directives: { wave: {} },
      stubs: { AppIcon: true, AppTooltip: { template: '<div><slot name="trigger" /></div>' } },
    },
  })
}

describe('CardsArea moderator icon buttons', () => {
  it('names the reset button', () => {
    const wrapper = mountCards(false)
    expect(wrapper.get('[data-testid="reset-button"]').attributes('aria-label')).toBe('Reset Estimates')
  })

  it('exposes the last-round toggle as a pressed button', () => {
    const off = mountCards(false).get('[data-testid="last-round-button"]')
    expect(off.attributes('aria-label')).toBe('Previous Round')
    expect(off.attributes('aria-pressed')).toBe('false')

    const on = mountCards(true).get('[data-testid="last-round-button"]')
    expect(on.attributes('aria-pressed')).toBe('true')
  })
})
