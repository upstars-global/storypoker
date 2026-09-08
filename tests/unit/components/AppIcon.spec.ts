import { afterEach, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { _api } from '@iconify/vue'
import AppIcon from '~/components/AppIcon.vue'
import { registerLocalIcons } from '~/lib/registerLocalIcons'
import { installIconPolicy } from '~/lib/iconPolicy'

const originalFetch = globalThis.fetch

afterEach(() => {
  _api.setFetch(originalFetch)
  globalThis.fetch = originalFetch
})

it('renders a direct Lucide icon from the registered subset', async () => {
  registerLocalIcons()
  const wrapper = mount(AppIcon, { props: { icon: 'lucide:id-card' } })
  await nextTick()
  expect(wrapper.find('svg').exists()).toBe(true)
  expect(wrapper.find('svg').element.childElementCount).toBeGreaterThan(0)
  wrapper.unmount()
})

it('throws for an unknown icon without touching the network transport', () => {
  registerLocalIcons()
  const transport = vi.fn(() => Promise.reject(new Error('blocked')))
  _api.setFetch(transport as unknown as typeof fetch)
  expect(() => mount(AppIcon, { props: { icon: 'ic:missing-review-fixture' } }))
    .toThrow('Missing local icon: ic:missing-review-fixture')
  expect(transport).not.toHaveBeenCalled()
})

it('leaves the global fetch untouched', () => {
  installIconPolicy()
  expect(globalThis.fetch).toBe(originalFetch)
})
