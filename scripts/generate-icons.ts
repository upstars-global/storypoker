import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { icons as ic } from '@iconify-json/ic'
import { icons as lucide } from '@iconify-json/lucide'
import { icons as tabler } from '@iconify-json/tabler'
import type { IconifyJSON } from '@iconify/types'
import { buildCollections, serializeCollections } from './icons/subset.ts'
import { isIconUsageSource, scanIconUsage, validateIconUsage } from './icons/scan.ts'
import { generateIconCss } from './icons/generateCss.ts'
import { parseSvg } from './icons/parseSvg.ts'
import { COLORED_ICONS, inlineMarkup, validateColoredIcons } from './icons/coloredIcons.ts'
import { appIconNames, dynamicBindings, flagCases, inputNames } from '../app/utils/iconManifest.ts'
import { resolveIconName } from '../app/utils/iconResolver.ts'

const root = resolve(import.meta.dirname, '..')
const generatedDir = join(root, 'app/generated')
const outputPath = join(generatedDir, 'iconCollections.json')
const cssPath = join(generatedDir, 'icons.css')
const classesPath = join(generatedDir, 'iconClasses.json')
const coloredPath = join(generatedDir, 'coloredIcons.json')
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

function appSvgs(): Record<string, string> {
  const svgs: Record<string, string> = {}
  for (const fullName of appIconNames) {
    const name = fullName.slice('app:'.length)
    svgs[fullName] = readFileSync(join(root, `app/assets/icons/${name}.svg`), 'utf8')
  }
  return svgs
}

interface Artifacts {
  collections: string
  css: string
  classes: string
  colored: string
}

function build(): Artifacts {
  const sources: Record<string, string> = {}
  collectSources(join(root, 'app'), sources)
  const issues = validateIconUsage(scanIconUsage(sources), inputNames, dynamicBindings)
  if (issues.length) {
    console.error(issues.join('\n'))
    throw new Error('icon manifest is out of sync with the application sources')
  }

  const svgs = appSvgs()
  const colorIssues = validateColoredIcons(svgs)
  if (colorIssues.length) {
    console.error(colorIssues.join('\n'))
    throw new Error('colored icon exceptions are out of sync with the SVG sources')
  }

  const external = resolvedNames().filter(name => !name.startsWith('app:'))
  const subset = buildCollections(sets, external)

  const appIcons: IconifyJSON['icons'] = {}
  for (const [fullName, svg] of Object.entries(svgs)) {
    if (COLORED_ICONS.has(fullName)) continue
    appIcons[fullName.slice('app:'.length)] = parseSvg(svg)
  }

  const { css, classes } = generateIconCss([...subset, { prefix: 'app', icons: appIcons }])
  const colored = Object.fromEntries(
    [...COLORED_ICONS].sort().map(fullName => [fullName, inlineMarkup(svgs[fullName]!)]),
  )

  return {
    collections: serializeCollections(subset),
    css,
    classes: JSON.stringify(classes, null, 2) + '\n',
    colored: JSON.stringify(colored, null, 2) + '\n',
  }
}

const flag = process.argv[2]
if (flag !== undefined && flag !== '--check') {
  console.error(`unknown flag: ${flag}`)
  process.exit(1)
}

const expected = build()
const artifacts: [string, string][] = [
  [outputPath, expected.collections],
  [cssPath, expected.css],
  [classesPath, expected.classes],
  [coloredPath, expected.colored],
]

if (flag === '--check') {
  for (const [path, content] of artifacts) {
    let actual: string | null = null
    try {
      actual = readFileSync(path, 'utf8')
    } catch {
      console.error(`missing generated file: ${relative(root, path)}`)
      process.exit(1)
    }
    if (actual !== content) {
      console.error(`generated file is stale: ${relative(root, path)} - run npm run icons:generate`)
      process.exit(1)
    }
  }
  console.log('icon artifacts are up to date')
} else {
  mkdirSync(generatedDir, { recursive: true })
  for (const [path, content] of artifacts) writeFileSync(path, content)
  console.log(`wrote ${artifacts.map(([path]) => relative(root, path)).join(', ')}`)
}
