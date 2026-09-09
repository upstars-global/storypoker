import { describe, expect, it } from 'vitest'
import { type IconFlags, resolveIconName } from '~/utils/iconResolver'

const flagCases: IconFlags[] = [
  { iconsLucide: false, iconsRounded: false },
  { iconsLucide: false, iconsRounded: true },
  { iconsLucide: true, iconsRounded: false },
  { iconsLucide: true, iconsRounded: true },
]

it('keeps fallback and gives Lucide precedence', () => {
  const both = { iconsLucide: true, iconsRounded: true }
  expect(resolveIconName('ic:baseline-close', both)).toBe('lucide:x')
  expect(resolveIconName('ic:baseline-palette', both)).toBe('ic:baseline-palette')
  expect(resolveIconName('lucide:id-card', both)).toBe('lucide:id-card')
  expect(resolveIconName('lucide:undo', both)).toBe('lucide:undo')
  expect(resolveIconName('ic:baseline-close', {
    iconsLucide: false, iconsRounded: true,
  })).toBe('ic:round-close')
  expect(resolveIconName('ic:baseline-close', {
    iconsLucide: false, iconsRounded: false,
  })).toBe('ic:baseline-close')
})

describe.each(flagCases)('flags %o', flags => {
  it('returns a non-empty prefixed name', () => {
    for (const name of ['ic:baseline-close', 'ic:baseline-palette', 'lucide:undo', 'app:timer', 'tabler:dice-5']) {
      const resolved = resolveIconName(name, flags)
      expect(resolved).toMatch(/^[a-z-]+:[a-z0-9-]+$/)
    }
  })

  it('leaves non-baseline prefixes untouched', () => {
    expect(resolveIconName('app:timer', flags)).toBe('app:timer')
    expect(resolveIconName('tabler:dice-5', flags)).toBe('tabler:dice-5')
  })
})

it('maps every table entry only when Lucide is enabled', () => {
  const rounded = resolveIconName('ic:baseline-settings', { iconsLucide: false, iconsRounded: true })
  expect(rounded).toBe('ic:round-settings')
  expect(resolveIconName('ic:baseline-settings', { iconsLucide: true, iconsRounded: false })).toBe('lucide:settings')
})
