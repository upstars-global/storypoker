import { expect, it } from 'vitest'
import { icons as ic } from '@iconify-json/ic'
import { icons as lucide } from '@iconify-json/lucide'
import { getIconData } from '@iconify/utils'
import { buildCollections, serializeCollections } from '../../../scripts/icons/subset'

it('includes only requested records and rejects unknown names', () => {
  const sets = buildCollections({ ic }, ['ic:baseline-close', 'ic:round-close'])
  expect(Object.keys(sets[0]!.icons).sort()).toEqual(['baseline-close', 'round-close'])
  expect(() => buildCollections({ ic }, ['ic:missing-review-fixture'])).toThrow('ic:missing-review-fixture')
})

it('resolves lucide aliases into full self-contained records', () => {
  const aliases = ['lucide:check-circle', 'lucide:user-circle', 'lucide:more-vertical']
  const [set] = buildCollections({ lucide }, aliases)
  for (const alias of aliases) {
    const name = alias.slice('lucide:'.length)
    const expected = getIconData(lucide, name)!
    const record = set!.icons[name]!
    expect(record.body).toBe(expected.body)
    expect(record.body.length).toBeGreaterThan(0)
    expect(record.width ?? set!.width).toBe(expected.width)
    expect(record.height ?? set!.height).toBe(expected.height)
  }
})

it('serializes stably regardless of input order', () => {
  const names = ['ic:baseline-close', 'ic:baseline-add', 'ic:round-close']
  const forward = serializeCollections(buildCollections({ ic }, names))
  const reversed = serializeCollections(buildCollections({ ic }, [...names].reverse()))
  expect(forward).toBe(reversed)
  expect(forward.endsWith('\n')).toBe(true)
})
