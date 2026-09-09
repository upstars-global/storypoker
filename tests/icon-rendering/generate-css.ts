import { getIconsCSS } from '@iconify/utils'
import type { IconifyJSON } from '@iconify/types'

export function iconClassName(fullName: string): string {
  return `sp-icon-${fullName.replace(':', '-')}`
}

export function generateIconCss(collections: IconifyJSON[]): { css: string; classes: Record<string, string> } {
  const classes: Record<string, string> = {}
  let css = ''
  for (const collection of [...collections].sort((a, b) => a.prefix.localeCompare(b.prefix))) {
    const names = Object.keys(collection.icons).sort()
    if (!names.length) continue
    for (const name of names) classes[`${collection.prefix}:${name}`] = iconClassName(`${collection.prefix}:${name}`)
    css += getIconsCSS(collection, names, {
      iconSelector: '.sp-icon-{prefix}-{name}',
      commonSelector: '.sp-icon',
    })
  }
  return { css, classes }
}
