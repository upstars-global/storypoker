import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
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
