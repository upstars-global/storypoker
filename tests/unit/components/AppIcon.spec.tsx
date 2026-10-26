import { afterEach, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import AppIcon from '~/components/AppIcon'
import classes from '~/generated/iconClasses.json'

afterEach(() => {
  cleanup()
})

it('renders a monochrome icon as a mask span', () => {
  const { container } = render(<AppIcon name="lucide:id-card" />)
  const root = container.querySelector('span')!
  expect(root.classList).toContain('sp-icon')
  expect(root.classList).toContain((classes as Record<string, string>)['lucide:id-card'])
  expect(root.innerHTML).toBe('')
})

it('renders the colored exception as inline markup that keeps its fills', () => {
  const { container } = render(<AppIcon name="app:town-hall" />)
  const root = container.querySelector('span')!
  expect(root.classList).toContain('sp-icon-inline')
  expect(root.classList).not.toContain('sp-icon')
  const svg = root.querySelector('svg')
  expect(svg).not.toBeNull()
  expect(svg!.outerHTML).toContain('#0057B7')
  expect(svg!.outerHTML).toContain('currentColor')
})

it('throws for an icon without local data', () => {
  expect(() => render(<AppIcon name="ic:missing-review-fixture" />))
    .toThrow('Missing local icon: ic:missing-review-fixture')
})

it('marks every icon root as decorative', () => {
  for (const icon of ['lucide:id-card', 'app:town-hall']) {
    const { container, unmount } = render(<AppIcon name={icon} />)
    expect(container.querySelector('span')!.getAttribute('aria-hidden')).toBe('true')
    unmount()
  }
})

it('announces a labelled icon as an image instead of hiding it', () => {
  for (const icon of ['lucide:id-card', 'app:town-hall']) {
    const { container, unmount } = render(<AppIcon name={icon} aria-label="Moderator" />)
    const root = container.querySelector('span')!
    expect(root.getAttribute('role')).toBe('img')
    expect(root.getAttribute('aria-label')).toBe('Moderator')
    expect(root.hasAttribute('aria-hidden')).toBe(false)
    unmount()
  }
})
