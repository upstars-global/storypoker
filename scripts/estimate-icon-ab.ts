import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { gzipSync } from 'node:zlib'
import { getIconsCSS } from '@iconify/utils'
import type { IconifyJSON } from '@iconify/types'
import { icons as ic } from '@iconify-json/ic'
import { icons as lucide } from '@iconify-json/lucide'
import { icons as tabler } from '@iconify-json/tabler'
import { buildCollections } from './icons/subset.ts'
import { parseSvg } from './icons/parseSvg.ts'
import { appIconNames, inputNames } from '../app/utils/iconManifest.ts'
import { resolveIconName } from '../app/utils/iconResolver.ts'

const root = resolve(import.meta.dirname, '..')
const reportDir = join(root, 'test-results/icon-rendering')
const bundlePath = join(reportDir, 'bundle.json')

const SNAPSHOT = { instances: 27, uniqueIcons: 10, domElements: 57, markupBytes: 17430 }
const MASK_BYTES_PER_INSTANCE = 60
const DEFAULT_FLAGS = { iconsLucide: false, iconsRounded: true }
const JS_CSS_BUDGET_BYTES = 10 * 1024
const DOM_TARGET_MAX = 32

if (!existsSync(bundlePath)) {
  console.error('missing test-results/icon-rendering/bundle.json: run npm run build && npm run icons:audit-build')
  process.exit(1)
}

const bundle = JSON.parse(readFileSync(bundlePath, 'utf8'))
const entryGzipBytes: number = bundle.entryChunk.gzipBytes
const cssArtifact = bundle.files.find((file: { path: string }) => file.path.endsWith('.css'))

function appCollection(): IconifyJSON {
  const icons: IconifyJSON['icons'] = {}
  for (const fullName of appIconNames) {
    const name = fullName.slice('app:'.length)
    icons[name] = parseSvg(readFileSync(join(root, `app/assets/icons/${name}.svg`), 'utf8'))
  }
  return { prefix: 'app', icons }
}

const resolved = [...new Set(inputNames.map(name => resolveIconName(name, DEFAULT_FLAGS)))].sort()
const external = resolved.filter(name => !name.startsWith('app:'))
const collections = [...buildCollections({ ic, lucide, tabler }, external), appCollection()]

let css = ''
for (const collection of collections) {
  const names = Object.keys(collection.icons)
  if (!names.length) continue
  css += getIconsCSS(collection, names, { mode: 'mask' })
}
const cssRawBytes = Buffer.byteLength(css)
const cssGzipBytes = gzipSync(Buffer.from(css)).length

const MEASURED_STUB_BUILD_GZIP = 414970

const jsGzipA = entryGzipBytes
const jsGzipBWorst = entryGzipBytes
const jsGzipB = MEASURED_STUB_BUILD_GZIP
const sharedCssGzipBytes: number = cssArtifact?.gzipBytes ?? 0

const totalA = jsGzipA + sharedCssGzipBytes
const totalB = jsGzipB + sharedCssGzipBytes + cssGzipBytes
const totalBWorst = jsGzipBWorst + sharedCssGzipBytes + cssGzipBytes
const domA = SNAPSHOT.domElements
const domB = SNAPSHOT.instances
const markupB = SNAPSHOT.instances * MASK_BYTES_PER_INSTANCE

const passesBudget = totalBWorst <= totalA + JS_CSS_BUDGET_BYTES
const passesDom = domB <= DOM_TARGET_MAX && domA - domB >= 25
const verdict = passesBudget && passesDom ? 'proceed' : 'stop'

const estimate = {
  generatedAt: new Date().toISOString(),
  flags: DEFAULT_FLAGS,
  resolvedNames: resolved.length,
  domElements: { a: domA, b: domB },
  markupBytes: { a: SNAPSHOT.markupBytes, b: markupB },
  cssBytes: cssRawBytes,
  cssGzipBytes,
  jsGzipBytes: { a: jsGzipA, b: jsGzipB, bWorst: jsGzipBWorst },
  totalJsCssGzipBytes: {
    a: totalA,
    b: totalB,
    bWorst: totalBWorst,
    deltaBforA: totalB - totalA,
    deltaBworstForA: totalBWorst - totalA,
    budget: JS_CSS_BUDGET_BYTES,
  },
  passes: { jsCssBudget: passesBudget, domReduction: passesDom },
  assumptions: [
    `variant A DOM taken from the design snapshot of /core-platform: ${SNAPSHOT.instances} instances, `
      + `${SNAPSHOT.domElements} elements, ${SNAPSHOT.markupBytes} B markup`,
    `variant B assumed to render one span per instance at ${MASK_BYTES_PER_INSTANCE} B of markup`,
    'variant B JS is the measured gzip of a build with AppIcon, both register modules and the icon policy '
      + 'stubbed out (414 970 B): the best case where the whole Iconify runtime and the subset JSON are gone',
    'the shared application CSS is counted in both variants because it is unchanged by the renderer choice',
    'CSS weight is generated for the default flag case only (iconsLucide=false, iconsRounded=true)',
    'bWorst assumes the mask renderer removes no Iconify runtime at all; the budget gate is judged on it',
  ],
  verdict,
}

mkdirSync(reportDir, { recursive: true })
writeFileSync(join(reportDir, 'estimate.json'), JSON.stringify(estimate, null, 2) + '\n')
console.log(JSON.stringify(estimate, null, 2))
