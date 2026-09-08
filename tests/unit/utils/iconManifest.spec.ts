import { expect, it } from 'vitest'
import { isIconUsageSource, scanIconUsage, validateIconUsage } from '../../../scripts/icons/scan'
import { appIconNames, dynamicBindings, flagCases, inputNames } from '~/utils/iconManifest'
import { SLOT_SYMBOLS } from '~/utils/slotMachine'

const modules = import.meta.glob('../../../app/**/*.{vue,ts}', { query: '?raw', import: 'default', eager: true })

function projectSources(): Record<string, string> {
  const sources: Record<string, string> = {}
  for (const [path, code] of Object.entries(modules)) {
    const file = path.replace('../../../', '')
    if (!isIconUsageSource(file)) continue
    sources[file] = code as string
  }
  return sources
}

it('reports new literal and undeclared dynamic binding', () => {
  const usage = scanIconUsage({
    'app/components/Probe.vue': '<template><AppIcon icon="lucide:id-card" /><AppIcon :icon="nextIcon" /></template>',
  })
  const issues = validateIconUsage(usage, ['lucide:undo'], [])
  expect(issues.join('\n')).toContain('lucide:id-card')
  expect(issues.join('\n')).toContain('nextIcon')
})

it('matches the icons actually used in the application sources', () => {
  const issues = validateIconUsage(scanIconUsage(projectSources()), inputNames, dynamicBindings)
  expect(issues).toEqual([])
})

it('covers every dice face declared in PlayerRow', () => {
  const source = projectSources()['app/components/PlayerRow.vue']!
  const faces = [...source.matchAll(/'(tabler:dice-\d)'/g)].map(match => match[1]!)
  expect(new Set(faces).size).toBe(6)
  for (const name of faces) expect(inputNames).toContain(name)
})

it('covers every slot symbol', () => {
  for (const name of SLOT_SYMBOLS) expect(inputNames).toContain(name)
})

it('excludes legacy shield collections and keeps the direct Lucide names', () => {
  expect(inputNames.filter(name => name.startsWith('simple-icons:'))).toEqual([])
  expect(inputNames.filter(name => name.startsWith('game-icons:'))).toEqual([])
  expect(inputNames).toContain('lucide:id-card')
  expect(inputNames).toContain('lucide:undo')
})

it('enumerates all four flag combinations once', () => {
  expect(flagCases).toHaveLength(4)
  expect(new Set(flagCases.map(flags => `${flags.iconsLucide}/${flags.iconsRounded}`)).size).toBe(4)
})

it('registers every app icon that the manifest can request', () => {
  for (const name of inputNames.filter(name => name.startsWith('app:'))) {
    expect(appIconNames).toContain(name)
  }
})
