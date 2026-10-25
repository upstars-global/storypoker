import { expect, it } from 'vitest'
import { icons as ic } from '@iconify-json/ic'
import { icons as lucide } from '@iconify-json/lucide'
import { getIconData } from '@iconify/utils'
import { buildCollections, serializeCollections } from '../../../scripts/icons/subset'
import { scanIconUsage } from '../../../scripts/icons/scan'
import generated from '~/generated/iconCollections.json'

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

it('detects a dropped record in a committed copy of the subset', () => {
  const committed = JSON.parse(JSON.stringify(generated)) as { prefix: string; icons: Record<string, unknown> }[]
  const expected = serializeCollections(committed as never)
  const firstPrefix = committed[0]!
  delete firstPrefix.icons[Object.keys(firstPrefix.icons).sort()[0]!]
  expect(serializeCollections(committed as never)).not.toBe(expected)
})

it('scans literal and expression icon names in .tsx sources', () => {
  const usage = scanIconUsage({
    'app/components/Probe.tsx': 'export function Probe({ on }: { on: boolean }) {\n'
      + '  return <div><AppIcon name="ic:baseline-add" /><AppIcon name={on ? \'ic:baseline-check\' : \'tabler:star\'} /></div>\n'
      + '}\n',
  })
  expect(usage.literals).toEqual(['ic:baseline-add', 'ic:baseline-check', 'tabler:star'])
  expect(usage.bindings).toEqual([
    { file: 'app/components/Probe.tsx', expression: "on ? 'ic:baseline-check' : 'tabler:star'" },
  ])
})

it('ignores the name prop of elements other than AppIcon in .tsx sources', () => {
  const usage = scanIconUsage({
    'app/components/Probe.tsx': 'export const Probe = () => <input name="sm:hidden" /> ',
  })
  expect(usage.literals).toEqual([])
  expect(usage.bindings).toEqual([])
})

it('reads generic arrows in .ts sources without treating them as JSX', () => {
  const usage = scanIconUsage({
    'app/utils/probe.ts': "export const pick = <T,>(value: T) => value\nexport const ICON = 'ic:baseline-add'\n",
  })
  expect(usage.literals).toEqual(['ic:baseline-add'])
})
