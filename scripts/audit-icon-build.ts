import { readdirSync, readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { gzipSync } from 'node:zlib'

const root = resolve(import.meta.dirname, '..')
const reportDir = join(root, 'test-results/icon-rendering')
const baselinePath = join(root, 'docs/audits/icon-bundle-baseline.json')
const budgetGzipBytes = 25 * 1024

const FORBIDDEN_SOURCES = [
  /@iconify-json\/[^/]+\/icons\.json/,
  /@iconify[/\\]vue/,
  /generated[/\\]iconCollections\.json/,
  /scripts\/generate-icons\.ts/,
  /scripts\/icons\//,
]

const distDir = resolve(root, process.argv[2] ?? 'dist')
if (!existsSync(distDir)) {
  console.error(`missing dist directory: ${distDir}`)
  process.exit(1)
}

function walk(dir: string, out: string[]): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else out.push(full)
  }
  return out
}

const artifacts = walk(distDir, []).filter(file => file.endsWith('.js') || file.endsWith('.css'))
const files = artifacts.map(file => {
  const raw = readFileSync(file)
  return { path: relative(distDir, file), rawBytes: raw.length, gzipBytes: gzipSync(raw).length }
}).sort((a, b) => a.path.localeCompare(b.path))

const REQUIRED_SOURCE = /@supabase[/\\](?:auth-js|gotrue-js)/

const forbiddenSources: string[] = []
let sawRequiredSource = false
let checkedMaps = 0
for (const file of artifacts) {
  if (!file.endsWith('.js')) continue
  const mapPath = `${file}.map`
  if (!existsSync(mapPath)) {
    if (relative(distDir, file) === 'registerSW.js') continue
    console.error(`missing sourcemap for ${relative(distDir, file)}`)
    process.exit(1)
  }
  checkedMaps += 1
  const sources: string[] = JSON.parse(readFileSync(mapPath, 'utf8')).sources ?? []
  for (const source of sources) {
    if (FORBIDDEN_SOURCES.some(pattern => pattern.test(source))) forbiddenSources.push(source)
    if (REQUIRED_SOURCE.test(source)) sawRequiredSource = true
  }
}

const entryCandidates = files.filter(file => /(^|\/)assets\/index-[^/]+\.js$/.test(file.path))
if (entryCandidates.length !== 1) {
  console.error(`expected exactly one entry chunk, found ${entryCandidates.length}: `
    + entryCandidates.map(file => file.path).join(', '))
  process.exit(1)
}
const entryFile = entryCandidates[0]!

const cssGzipBytes = files
  .filter(file => file.path.endsWith('.css'))
  .reduce((total, file) => total + file.gzipBytes, 0)
const jsCssGzipBytes = entryFile.gzipBytes + cssGzipBytes

const baselineGzipBytes: number = JSON.parse(readFileSync(baselinePath, 'utf8')).jsCss.gzipBytes
const deltaGzipBytes = jsCssGzipBytes - baselineGzipBytes

const report = {
  generatedAt: new Date().toISOString(),
  dist: relative(root, distDir),
  checkedSourcemaps: checkedMaps,
  files,
  forbiddenSources: [...new Set(forbiddenSources)].sort(),
  sawRequiredSource,
  entryChunk: {
    path: entryFile.path,
    gzipBytes: entryFile.gzipBytes,
    cssGzipBytes,
    jsCssGzipBytes,
    baselineGzipBytes,
    deltaGzipBytes,
    budgetGzipBytes,
    chunking: 'single entry chunk; the budget covers JS+CSS because the mask renderer moves bytes into CSS',
  },
}

mkdirSync(reportDir, { recursive: true })
writeFileSync(join(reportDir, 'bundle.json'), JSON.stringify(report, null, 2) + '\n')

if (!sawRequiredSource) {
  console.error('the Supabase auth client (@supabase/auth-js or its @supabase/gotrue-js predecessor)'
    + ' is missing from the browser graph: the build ran without'
    + ' VITE_SUPABASE_URL/VITE_SUPABASE_KEY, so the client was tree-shaken and the weights'
    + ' are not comparable to the baseline')
  process.exit(1)
}

if (report.forbiddenSources.length) {
  console.error(`forbidden modules in the browser graph:\n${report.forbiddenSources.join('\n')}`)
  process.exit(1)
}
if (deltaGzipBytes > budgetGzipBytes) {
  console.error(`entry chunk grew by ${deltaGzipBytes} B gzip, budget is ${budgetGzipBytes} B`)
  process.exit(1)
}

console.log(`icon build audit passed: delta ${deltaGzipBytes} B gzip over ${checkedMaps} sourcemaps`)
