import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, ref, nextTick } from 'vue'
import { useMenuKeyboard } from '~/composables/useMenuKeyboard'

const Host = defineComponent({
  setup() {
    const open = ref(false)
    const trigger = ref<HTMLElement | null>(null)
    const picked = ref<string | null>(null)
    const menuEl = ref<HTMLElement | null>(null)
    const { onKeydown, onFocusout } = useMenuKeyboard(open, trigger, menuEl)
    return { open, trigger, picked, menuEl, onKeydown, onFocusout }
  },
  template: `
    <div>
      <button ref="trigger" :aria-expanded="open" @click="open = !open">menu</button>
      <ul v-if="open" ref="menuEl" role="menu" @keydown="onKeydown" @focusout="onFocusout">
        <li role="menuitem" tabindex="-1" @click="picked = 'a'">A</li>
        <li role="menuitemradio" tabindex="-1" aria-checked="false" @click="picked = 'b'">B</li>
        <li role="menuitem" tabindex="-1" @click="picked = 'c'">C</li>
      </ul>
    </div>
  `,
})

function mountHost() {
  return mount(Host, { attachTo: document.body })
}

async function openMenu(wrapper: ReturnType<typeof mountHost>) {
  await wrapper.get('button').trigger('click')
  await nextTick()
  return wrapper.findAll('[role^="menuitem"]')
}

describe('useMenuKeyboard', () => {
  it('focuses the first item on open', async () => {
    const wrapper = mountHost()
    const items = await openMenu(wrapper)
    expect(document.activeElement).toBe(items[0]!.element)
    wrapper.unmount()
  })

  it('moves with ArrowDown/ArrowUp and wraps around', async () => {
    const wrapper = mountHost()
    const items = await openMenu(wrapper)
    const menu = wrapper.get('[role="menu"]')
    await menu.trigger('keydown', { key: 'ArrowDown' })
    expect(document.activeElement).toBe(items[1]!.element)
    await menu.trigger('keydown', { key: 'ArrowDown' })
    await menu.trigger('keydown', { key: 'ArrowDown' })
    expect(document.activeElement).toBe(items[0]!.element)
    await menu.trigger('keydown', { key: 'ArrowUp' })
    expect(document.activeElement).toBe(items[2]!.element)
    wrapper.unmount()
  })

  it('jumps with Home and End', async () => {
    const wrapper = mountHost()
    const items = await openMenu(wrapper)
    const menu = wrapper.get('[role="menu"]')
    await menu.trigger('keydown', { key: 'End' })
    expect(document.activeElement).toBe(items[2]!.element)
    await menu.trigger('keydown', { key: 'Home' })
    expect(document.activeElement).toBe(items[0]!.element)
    wrapper.unmount()
  })

  it('activates a menuitemradio with Enter', async () => {
    const wrapper = mountHost()
    const items = await openMenu(wrapper)
    await items[1]!.trigger('keydown', { key: 'Enter' })
    expect((wrapper.vm as { picked: string | null }).picked).toBe('b')
    wrapper.unmount()
  })

  it('closes with Escape and returns focus to the trigger', async () => {
    const wrapper = mountHost()
    await openMenu(wrapper)
    await wrapper.get('[role="menu"]').trigger('keydown', { key: 'Escape' })
    await nextTick()
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
    expect(document.activeElement).toBe(wrapper.get('button').element)
    wrapper.unmount()
  })

  it('closes when focus leaves the menu with Tab', async () => {
    const outside = document.createElement('input')
    document.body.appendChild(outside)
    const wrapper = mountHost()
    const items = await openMenu(wrapper)
    await items[0]!.trigger('focusout', { relatedTarget: outside })
    await nextTick()
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
    wrapper.unmount()
    outside.remove()
  })

  it('stays open while focus moves between its own items', async () => {
    const wrapper = mountHost()
    const items = await openMenu(wrapper)
    await items[0]!.trigger('focusout', { relatedTarget: items[1]!.element })
    await nextTick()
    expect(wrapper.find('[role="menu"]').exists()).toBe(true)
    wrapper.unmount()
  })

  it('leaves focus alone when the menu closes because focus moved elsewhere', async () => {
    const outside = document.createElement('input')
    document.body.appendChild(outside)
    const wrapper = mountHost()
    await openMenu(wrapper)
    outside.focus()
    ;(wrapper.vm as { open: boolean }).open = false
    await nextTick()
    expect(document.activeElement).toBe(outside)
    wrapper.unmount()
    outside.remove()
  })
})
