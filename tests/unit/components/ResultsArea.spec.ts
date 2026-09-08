import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import ResultsArea from '~/components/ResultsArea.vue'

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  missingWarn: false,
  fallbackWarn: false,
  messages: { en: {} },
})

function mountResults(props: {
  votes: Record<string, number>
  groupedVotes: { general: Record<string, number>; qa: Record<string, number> } | null
  disableCelebration?: boolean
}) {
  return mount(ResultsArea, {
    props: { showNewRound: false, ...props },
    global: {
      plugins: [i18n],
      directives: { wave: {} },
      stubs: { AppIcon: true, PieChart: true, AppTooltip: true },
    },
  })
}

describe('ResultsArea celebration without a qa split', () => {
  it('celebrates when every vote matches and grouped votes are absent', () => {
    const wrapper = mountResults({ votes: { '5': 3 }, groupedVotes: null })
    expect(wrapper.find('.celebration-layer').exists()).toBe(true)
  })

  it('does not celebrate a single voter', () => {
    const wrapper = mountResults({ votes: { '5': 1 }, groupedVotes: null })
    expect(wrapper.find('.celebration-layer').exists()).toBe(false)
  })

  it('does not celebrate mixed votes', () => {
    const wrapper = mountResults({ votes: { '5': 2, '8': 1 }, groupedVotes: null })
    expect(wrapper.find('.celebration-layer').exists()).toBe(false)
  })

  it('respects disableCelebration for the last round view', () => {
    const wrapper = mountResults({ votes: { '5': 3 }, groupedVotes: null, disableCelebration: true })
    expect(wrapper.find('.celebration-layer').exists()).toBe(false)
  })
})
