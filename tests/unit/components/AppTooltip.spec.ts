import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AppTooltip from '~/components/AppTooltip.vue'

describe('AppTooltip', () => {
  function mountTooltip() {
    return mount(AppTooltip, {
      slots: {
        trigger: '<button>info</button>',
        content: 'Tooltip text',
      },
      attachTo: document.body,
    })
  }

  it('exposes tooltip role and links trigger via aria-describedby', () => {
    const wrapper = mountTooltip()
    const tooltip = wrapper.get('[role="tooltip"]')
    const trigger = wrapper.get('button')
    expect(tooltip.attributes('id')).toBeTruthy()
    expect(trigger.attributes('aria-describedby')).toBe(tooltip.attributes('id'))
  })

  it('shows content on focusin and hides on focusout', async () => {
    const wrapper = mountTooltip()
    const tooltip = wrapper.get('[role="tooltip"]')
    expect(tooltip.isVisible()).toBe(false)
    await wrapper.trigger('focusin')
    expect(tooltip.isVisible()).toBe(true)
    await wrapper.trigger('focusout')
    expect(tooltip.isVisible()).toBe(false)
  })
})
