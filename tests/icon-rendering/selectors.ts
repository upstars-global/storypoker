import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { resolveIconName } from '../../app/utils/iconResolver'

export const isMaskVariant = process.env.ICON_RENDERER === 'mask'
export const variant = isMaskVariant ? 'b' : 'a'
export const iconSelector = isMaskVariant ? 'span.sp-icon' : 'svg.iconify'

export const VIEWPORT = { width: 1440, height: 900 }

const HARNESS_FLAGS = { iconsLucide: false, iconsRounded: true }

interface Collection { prefix: string; icons: Record<string, { body: string }> }

let cached: Collection[] | null = null

function collections(): Collection[] {
  cached ??= JSON.parse(
    readFileSync(resolve(import.meta.dirname, '../../app/generated/iconCollections.json'), 'utf8'),
  ) as Collection[]
  return cached
}

function iconBody(name: string): string {
  const resolved = resolveIconName(name, HARNESS_FLAGS)
  const [prefix, icon] = resolved.split(':')
  const set = collections().find(entry => entry.prefix === prefix)
  const body = set?.icons[icon!]?.body
  if (!body) throw new Error(`Unknown harness icon: ${resolved}`)
  return body
}

export function iconLocator(name: string): string {
  if (isMaskVariant) return `span.sp-icon-${resolveIconName(name, HARNESS_FLAGS).replace(':', '-')}`
  return `svg.iconify:has(> path[d="${iconBody(name).match(/ d="([^"]+)"/)![1]}"])`
}
