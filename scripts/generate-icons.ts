import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { icons as ic } from '@iconify-json/ic'
import { icons as lucide } from '@iconify-json/lucide'
import { icons as tabler } from '@iconify-json/tabler'
import type { IconifyJSON } from '@iconify/types'
import { buildCollections, serializeCollections } from './icons/subset.ts'
import { isIconUsageSource, scanIconUsage, validateIconUsage } from './icons/scan.ts'
import { dynamicBindings, flagCases, inputNames } from '../app/utils/iconManifest.ts'
import { resolveIconName } from '../app/utils/iconResolver.ts'

const root = resolve(import.meta.dirname, '..')
const outputPath = join(root, 'app/generated/iconCollections.json')
const sets: Record<string, IconifyJSON> = { ic, lucide, tabler }

function collectSources(dir: string, sources: Record<string, string>): void {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      collectSources(full, sources)
      continue
    }
    if (!entry.endsWith('.vue') && !entry.endsWith('.ts')) continue
    const file = relative(root, full)
    if (!isIconUsageSource(file)) continue
    sources[file] = readFileSync(full, 'utf8')
  }
}

function resolvedNames(): string[] {
  const names = new Set<string>()
  for (const name of inputNames) {
    for (const flags of flagCases) names.add(resolveIconName(name, flags))
  }
  return [...names].sort()
}

function build(): string {
  const sources: Record<string, string> = {}
  collectSources(join(root, 'app'), sources)
  const issues = validateIconUsage(scanIconUsage(sources), inputNames, dynamicBindings)
  if (issues.length) {
    console.error(issues.join('\n'))
    throw new Error('icon manifest is out of sync with the application sources')
  }
  const external = resolvedNames().filter(name => !name.startsWith('app:'))
  return serializeCollections(buildCollections(sets, external))
}

const flag = process.argv[2]
if (flag !== undefined && flag !== '--check') {
  console.error(`unknown flag: ${flag}`)
  process.exit(1)
}

const expected = build()

if (flag === '--check') {
  let actual: string | null = null
  try {
    actual = readFileSync(outputPath, 'utf8')
  } catch {
    console.error(`missing generated file: ${relative(root, outputPath)}`)
    process.exit(1)
  }
  if (actual !== expected) {
    console.error('generated icon subset is stale: run npm run icons:generate')
    process.exit(1)
  }
  console.log('icon subset is up to date')
} else {
  mkdirSync(join(root, 'app/generated'), { recursive: true })
  writeFileSync(outputPath, expected)
  console.log(`wrote ${relative(root, outputPath)}`)
}
