import { describe, it, expect, vi } from 'vitest'
import { ref, defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { useClickOutside } from '~/composables/useClickOutside'

function makeWrapper(handler: () => void) {
  const target = ref<HTMLElement | null>(null)
  const Comp = defineComponent({
    setup() {
      useClickOutside(target, handler)
      return () => h('div', { ref: (el) => { target.value = el as HTMLElement } })
    },
  })
  return mount(Comp)
}

describe('useClickOutside', () => {
  it('calls handler when clicking outside the target', () => {
    const handler = vi.fn()
    const wrapper = makeWrapper(handler)
    const outside = document.createElement('button')
    document.body.appendChild(outside)
    outside.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    expect(handler).toHaveBeenCalledOnce()
    document.body.removeChild(outside)
    wrapper.unmount()
  })

  it('does not call handler when clicking inside the target', () => {
    const handler = vi.fn()
    const wrapper = makeWrapper(handler)
    wrapper.element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    expect(handler).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('removes listener on unmount', () => {
    const handler = vi.fn()
    const wrapper = makeWrapper(handler)
    wrapper.unmount()
    const outside = document.createElement('button')
    document.body.appendChild(outside)
    outside.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    expect(handler).not.toHaveBeenCalled()
    document.body.removeChild(outside)
  })
})
