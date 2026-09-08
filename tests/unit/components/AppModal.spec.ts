import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import AppModal from '~/components/AppModal.vue'

describe('AppModal', () => {
  it('forwards labelledby and describedby to the dialog element', () => {
    const wrapper = mount(AppModal, {
      props: { open: false, labelledby: 'title-id', describedby: 'desc-id' },
    })
    const dialog = wrapper.get('dialog')
    expect(dialog.attributes('aria-labelledby')).toBe('title-id')
    expect(dialog.attributes('aria-describedby')).toBe('desc-id')
  })

  it('renders no aria attributes when ids are not provided', () => {
    const wrapper = mount(AppModal, { props: { open: false } })
    const dialog = wrapper.get('dialog')
    expect(dialog.attributes('aria-labelledby')).toBeUndefined()
    expect(dialog.attributes('aria-describedby')).toBeUndefined()
  })

  it('emits close on cancel unless lockDismiss is set', async () => {
    const wrapper = mount(AppModal, { props: { open: false } })
    await wrapper.get('dialog').trigger('cancel')
    expect(wrapper.emitted('close')).toHaveLength(1)

    const locked = mount(AppModal, { props: { open: false, lockDismiss: true } })
    await locked.get('dialog').trigger('cancel')
    expect(locked.emitted('close')).toBeUndefined()
  })
})

describe('AppModal focus return', () => {
  function focusedTrigger() {
    const trigger = document.createElement('button')
    document.body.appendChild(trigger)
    trigger.focus()
    return trigger
  }

  it('returns focus to the trigger when open becomes false', async () => {
    const trigger = focusedTrigger()
    const wrapper = mount(AppModal, { props: { open: true }, attachTo: document.body })
    await nextTick()
    expect(document.activeElement).not.toBe(trigger)
    await wrapper.setProps({ open: false })
    await nextTick()
    expect(document.activeElement).toBe(trigger)
    wrapper.unmount()
    trigger.remove()
  })

  it('returns focus to the trigger when unmounted while open', async () => {
    const trigger = focusedTrigger()
    const wrapper = mount(AppModal, { props: { open: true }, attachTo: document.body })
    await nextTick()
    wrapper.unmount()
    expect(document.activeElement).toBe(trigger)
    trigger.remove()
  })
})
