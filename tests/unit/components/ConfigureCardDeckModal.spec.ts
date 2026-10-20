import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import ConfigureCardDeckModal from '~/components/ConfigureCardDeckModal.vue'

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  missingWarn: false,
  fallbackWarn: false,
  messages: { en: {} },
})

function mountModal(props: { deckPreset?: 'scrum' | 'voting' | 'goal_clarity'; resultCohorts?: string[] } = {}) {
  return mount(ConfigureCardDeckModal, {
    props: {
      deckPreset: props.deckPreset ?? 'scrum',
      activeCards: ['1', '2', '3'],
      resultCohorts: props.resultCohorts ?? ['DEV', 'BE', 'FE', 'SRE', 'QA'],
    },
    global: { plugins: [i18n], directives: { wave: {} }, stubs: { AppIcon: true } },
    attachTo: document.body,
  })
}

function cohortCheckbox(wrapper: ReturnType<typeof mountModal>, cohort: string) {
  return wrapper.get(`#deck-cohort-${cohort}`)
}

describe('ConfigureCardDeckModal result cohorts', () => {
  it('lists the cohorts next to the cards and saves the chosen ones in canonical order', async () => {
    const wrapper = mountModal({ resultCohorts: ['QA'] })
    expect(wrapper.findAll('[data-testid="deck-result-cohorts"] .mui-chip').map(l => l.text()))
      .toEqual(['DEV', 'BE', 'FE', 'SRE', 'QA'])
    expect(wrapper.find('#deck-cohort-QA').exists()).toBe(false)
    await cohortCheckbox(wrapper, 'FE').trigger('change')
    await cohortCheckbox(wrapper, 'BE').trigger('change')
    await wrapper.get('button.mui-btn').trigger('click')
    expect(wrapper.emitted('save')![0]![0]).toMatchObject({ deckPreset: 'scrum', cohorts: ['BE', 'FE', 'QA'] })
  })

  it('unchecks a cohort', async () => {
    const wrapper = mountModal()
    await cohortCheckbox(wrapper, 'SRE').trigger('change')
    await wrapper.get('button.mui-btn').trigger('click')
    expect(wrapper.emitted('save')![0]![0]).toMatchObject({ cohorts: ['DEV', 'BE', 'FE', 'QA'] })
  })

  it('hides cohorts for decks without pie results', () => {
    expect(mountModal({ deckPreset: 'voting' }).find('[data-testid="deck-result-cohorts"]').exists()).toBe(false)
    expect(mountModal({ deckPreset: 'goal_clarity' }).find('[data-testid="deck-result-cohorts"]').exists()).toBe(false)
  })
})
