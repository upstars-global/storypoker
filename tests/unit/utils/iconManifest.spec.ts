import { expect, it } from 'vitest'
import { isIconUsageSource, scanIconUsage, validateIconUsage } from '../../../scripts/icons/scan'
import { appIconNames, dynamicBindings, flagCases, inputNames } from '~/utils/iconManifest'
import { SLOT_SYMBOLS } from '~/utils/slotMachine'

const modules = import.meta.glob('../../../app/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true })

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
    'app/components/Probe.tsx': 'export const Probe = () => <><AppIcon name="lucide:id-card" /><AppIcon name={nextIcon} /></>',
  })
  const issues = validateIconUsage(usage, ['lucide:undo'], [])
  expect(issues.join('\n')).toContain('lucide:id-card')
  expect(issues.join('\n')).toContain('nextIcon')
})

it('rejects a collection that local delivery cannot produce', () => {
  const usage = scanIconUsage({
    'app/components/Probe.tsx': 'export const Probe = () => <AppIcon name="mdi:account" />',
  })
  expect(validateIconUsage(usage, [], []).join('\n')).toContain('not available locally: mdi:account')
})

it('ignores prefixed strings that are not icon names', () => {
  const usage = scanIconUsage({
    'app/components/Probe.tsx': 'const cls = on ? \'sm:hidden\' : \'md:block\'\n'
      + 'export const Probe = () => <div className={cls} />',
  })
  expect(usage.literals).toEqual([])
  expect(validateIconUsage(usage, [], [])).toEqual([])
})

it('rejects a non-deliverable collection inside an icon binding', () => {
  const usage = scanIconUsage({
    'app/components/Probe.tsx': 'export const Probe = () => <AppIcon name={on ? \'mdi:account\' : \'ic:baseline-add\'} />',
  })
  expect(usage.literals).toContain('mdi:account')
  expect(validateIconUsage(usage, [], []).join('\n')).toContain('not available locally: mdi:account')
})

it('catches an unlisted collection that reaches an icon binding', () => {
  const usage = scanIconUsage({
    'app/components/Probe.tsx': 'const icon = \'ph:house\'\n'
      + 'export const Probe = () => <AppIcon name={icon} />',
  })
  expect(validateIconUsage(usage, [], []).join('\n')).toContain('undeclared dynamic icon binding: icon')
})

it('rejects a binding declared with no names, so an unlisted literal cannot slip through', () => {
  const usage = scanIconUsage({
    'app/components/Probe.tsx': 'const icon = \'ph:house\'\n'
      + 'export const Probe = () => <AppIcon name={icon} />',
  })
  const issues = validateIconUsage(usage, [], [
    { file: 'app/components/Probe.tsx', expression: 'icon', names: [] },
  ])
  expect(issues.join('\n')).toContain('dynamic icon binding declares no names: icon')
})

it('rejects a stale name that no source literal produces', () => {
  const usage = scanIconUsage({
    'app/components/Probe.tsx': 'export const Probe = () => <AppIcon name={icon} />',
  })
  const issues = validateIconUsage(usage, [], [
    { file: 'app/components/Probe.tsx', expression: 'icon', names: ['ic:baseline-add'] },
  ])
  expect(issues.join('\n')).toContain('declared icon name is absent from the sources: ic:baseline-add')
})

it('accepts a name whose literal lives in another scanned file', () => {
  const usage = scanIconUsage({
    'app/utils/symbols.ts': "export const SYMBOLS = ['ic:baseline-add']\n",
    'app/components/Probe.tsx': 'export const Probe = () => <AppIcon name={icon} />',
  })
  const issues = validateIconUsage(usage, ['ic:baseline-add'], [
    { file: 'app/components/Probe.tsx', expression: 'icon', names: ['ic:baseline-add'] },
  ])
  expect(issues).toEqual([])
})

it('rejects a third-party collection declared in a binding', () => {
  const issues = validateIconUsage({ literals: [], bindings: [] }, [], [
    { file: 'app/components/Probe.tsx', expression: 'icon', names: ['material-symbols:home'] },
  ])
  expect(issues.join('\n')).toContain('not available locally: material-symbols:home')
})

it('rejects a non-deliverable collection listed in the manifest or a binding', () => {
  const manifest = validateIconUsage({ literals: [], bindings: [] }, ['mdi:account'], [])
  expect(manifest.join('\n')).toContain('not available locally: mdi:account')
  const binding = validateIconUsage({ literals: [], bindings: [] }, [], [
    { file: 'app/components/Probe.tsx', expression: 'icon', names: ['mdi:account'] },
  ])
  expect(binding.join('\n')).toContain('not available locally: mdi:account')
})

it('matches the icons actually used in the application sources', () => {
  const issues = validateIconUsage(scanIconUsage(projectSources()), inputNames, dynamicBindings)
  expect(issues).toEqual([])
})

it('covers every dice face', () => {
  for (const face of [1, 2, 3, 4, 5, 6]) expect(inputNames).toContain(`tabler:dice-${face}`)
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

it('has local data for every manifest icon in every flag combination', async () => {
  const { default: classes } = await import('~/generated/iconClasses.json')
  const { default: colored } = await import('~/generated/coloredIcons.json')
  const { resolveIconName } = await import('~/utils/iconResolver')
  const known = { ...(classes as Record<string, string>), ...(colored as Record<string, string>) }
  const missing: string[] = []
  for (const name of inputNames) {
    for (const flags of flagCases) {
      const resolved = resolveIconName(name, flags)
      if (!(resolved in known)) missing.push(`${name} -> ${resolved}`)
    }
  }
  expect(missing).toEqual([])
})

it('covers every declared app icon as a mask class or a colored exception', async () => {
  const { default: classes } = await import('~/generated/iconClasses.json')
  const { default: colored } = await import('~/generated/coloredIcons.json')
  for (const name of appIconNames) {
    const inMask = name in (classes as Record<string, string>)
    const inColored = name in (colored as Record<string, string>)
    expect(inMask || inColored).toBe(true)
    expect(inMask && inColored).toBe(false)
  }
})
