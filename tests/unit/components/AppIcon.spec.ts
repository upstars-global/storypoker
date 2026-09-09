import { expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AppIcon from '~/components/AppIcon.vue'
import classes from '~/generated/iconClasses.json'

it('renders a monochrome icon as a mask span', () => {
  const wrapper = mount(AppIcon, { props: { icon: 'lucide:id-card' } })
  const root = wrapper.find('span')
  expect(root.classes()).toContain('sp-icon')
  expect(root.classes()).toContain((classes as Record<string, string>)['lucide:id-card'])
  expect(root.element.innerHTML).toBe('')
  wrapper.unmount()
})

it('renders the colored exception as inline markup that keeps its fills', () => {
  const wrapper = mount(AppIcon, { props: { icon: 'app:town-hall' } })
  const root = wrapper.find('span')
  expect(root.classes()).toContain('sp-icon-inline')
  expect(root.classes()).not.toContain('sp-icon')
  const svg = wrapper.find('svg')
  expect(svg.exists()).toBe(true)
  expect(svg.html()).toContain('#0057B7')
  expect(svg.html()).toContain('currentColor')
  wrapper.unmount()
})

it('throws for an icon without local data', () => {
  expect(() => mount(AppIcon, { props: { icon: 'ic:missing-review-fixture' } }))
    .toThrow('Missing local icon: ic:missing-review-fixture')
})

it('marks every icon root as decorative', () => {
  for (const icon of ['lucide:id-card', 'app:town-hall']) {
    const wrapper = mount(AppIcon, { props: { icon } })
    expect(wrapper.find('span').attributes('aria-hidden')).toBe('true')
    wrapper.unmount()
  }
})
