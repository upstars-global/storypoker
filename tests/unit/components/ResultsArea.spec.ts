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
  groups?: { label: string; votes: Record<string, number> }[]
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
    const wrapper = mountResults({ votes: { '5': 3 } })
    expect(wrapper.find('.celebration-layer').exists()).toBe(true)
  })

  it('does not celebrate a single voter', () => {
    const wrapper = mountResults({ votes: { '5': 1 } })
    expect(wrapper.find('.celebration-layer').exists()).toBe(false)
  })

  it('does not celebrate mixed votes', () => {
    const wrapper = mountResults({ votes: { '5': 2, '8': 1 } })
    expect(wrapper.find('.celebration-layer').exists()).toBe(false)
  })

  it('respects disableCelebration for the last round view', () => {
    const wrapper = mountResults({ votes: { '5': 3 }, disableCelebration: true })
    expect(wrapper.find('.celebration-layer').exists()).toBe(false)
  })
})

describe('ResultsArea cohort circles', () => {
  it('renders one circle per cohort group with its label and average', () => {
    const wrapper = mountResults({
      votes: { '3': 2, '5': 1, '8': 2 },
      groups: [
        { label: 'FE', votes: { '3': 2 } },
        { label: 'BE', votes: { '5': 1 } },
        { label: 'QA', votes: { '8': 2 } },
      ],
    })
    const headings = wrapper.findAll('.mui-h6').map(h => h.text())
    expect(headings).toEqual(['FE: 3.0', 'BE: 5.0', 'QA: 8.0'])
    expect(wrapper.findAllComponents({ name: 'PieChart' })).toHaveLength(3)
  })

  it('celebrates when any cohort is unanimous', () => {
    const wrapper = mountResults({
      votes: { '3': 2, '5': 1, '8': 1 },
      groups: [{ label: 'FE', votes: { '3': 2 } }, { label: 'BE', votes: { '5': 1, '8': 1 } }],
    })
    expect(wrapper.find('.celebration-layer').exists()).toBe(true)
  })
})
