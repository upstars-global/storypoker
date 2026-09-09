import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { gzipSync } from 'node:zlib'

const root = resolve(import.meta.dirname, '..')
const reportDir = join(root, 'test-results/icon-rendering')
const runsDir = join(reportDir, 'runs')

interface Run {
  variant: string
  cache: 'cold' | 'warm'
  icons: number
  iconElements: number
  markupBytes: number
  transferBytes: number
  readyMs: number
  requests: string[]
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2
}

function bundle(variant: string): { jsGzip: number; cssGzip: number; jsRaw: number; cssRaw: number } {
  const dir = join(reportDir, `dist-${variant}/assets`)
  let jsGzip = 0, cssGzip = 0, jsRaw = 0, cssRaw = 0
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.js') && !file.endsWith('.css')) continue
    const raw = readFileSync(join(dir, file))
    const gz = gzipSync(raw).length
    if (file.endsWith('.js')) { jsGzip += gz; jsRaw += raw.length } else { cssGzip += gz; cssRaw += raw.length }
  }
  return { jsGzip, cssGzip, jsRaw, cssRaw }
}

const FORBIDDEN = [
  /@iconify-json\/[^/]+\/icons\.json/,
  /scripts\/generate-icons\.ts/,
  /scripts\/icons\//,
]

function forbidden(variant: string): string[] {
  const dir = join(reportDir, `dist-${variant}/assets`)
  const found: string[] = []
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.js.map')) continue
    const sources: string[] = JSON.parse(readFileSync(join(dir, file), 'utf8')).sources ?? []
    for (const source of sources) {
      if (FORBIDDEN.some(pattern => pattern.test(source))) found.push(source)
    }
  }
  return [...new Set(found)]
}

const summary: Record<string, unknown> = {}
for (const variant of ['a', 'b']) {
  const runsPath = join(runsDir, `${variant}.json`)
  if (!existsSync(runsPath)) {
    console.error(`missing measurement runs for variant ${variant}: run the harness measure spec`)
    process.exit(1)
  }
  const runs: Run[] = JSON.parse(readFileSync(runsPath, 'utf8'))
  const cold = runs.filter(run => run.cache === 'cold')
  const warm = runs.filter(run => run.cache === 'warm')
  const weights = bundle(variant)
  summary[variant] = {
    pairs: cold.length,
    icons: cold[0]!.icons,
    iconElements: cold[0]!.iconElements,
    markupBytes: cold[0]!.markupBytes,
    bundle: { ...weights, totalGzip: weights.jsGzip + weights.cssGzip },
    forbiddenSources: forbidden(variant),
    remoteRequests: [...new Set(runs.flatMap(run => run.requests))],
    readyMs: {
      coldMedian: median(cold.map(run => run.readyMs)),
      coldMin: Math.min(...cold.map(run => run.readyMs)),
      coldMax: Math.max(...cold.map(run => run.readyMs)),
      warmMedian: median(warm.map(run => run.readyMs)),
      warmMin: Math.min(...warm.map(run => run.readyMs)),
      warmMax: Math.max(...warm.map(run => run.readyMs)),
    },
    transferBytes: { coldMedian: median(cold.map(run => run.transferBytes)) },
  }
}

interface VariantSummary {
  bundle: { totalGzip: number }
  iconElements: number
  readyMs: { coldMedian: number }
}

const a = summary.a as VariantSummary
const b = summary.b as VariantSummary

summary.comparison = {
  bundleGzipDelta: b.bundle.totalGzip - a.bundle.totalGzip,
  bundleBudget: 10 * 1024,
  domElementsReduction: a.iconElements - b.iconElements,
  domReductionTarget: 25,
  readyMsDeltaCold: b.readyMs.coldMedian - a.readyMs.coldMedian,
}

console.log(JSON.stringify(summary, null, 2))
