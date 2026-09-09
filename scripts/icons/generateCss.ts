import { getIconsCSS } from '@iconify/utils'
import type { IconifyJSON } from '@iconify/types'

export function iconClassName(fullName: string): string {
  return `sp-icon-${fullName.replace(':', '-')}`
}

export function generateIconCss(collections: IconifyJSON[]): { css: string; classes: Record<string, string> } {
  const classes: Record<string, string> = {}
  const blocks: string[] = []
  let common = ''
  for (const collection of [...collections].sort((a, b) => a.prefix.localeCompare(b.prefix))) {
    const names = Object.keys(collection.icons).sort()
    if (!names.length) continue
    for (const name of names) classes[`${collection.prefix}:${name}`] = iconClassName(`${collection.prefix}:${name}`)
    const generated = getIconsCSS(collection, names, {
      iconSelector: '.sp-icon-{prefix}-{name}',
      commonSelector: '.sp-icon',
    })
    const match = generated.match(/^\.sp-icon \{[^}]*\}\n*/)
    if (match) {
      common ||= match[0]
      blocks.push(generated.slice(match[0].length))
      continue
    }
    blocks.push(generated)
  }
  const inline = '.sp-icon-inline {\n  display: inline-block;\n  width: 1em;\n  height: 1em;\n'
    + '  line-height: 1;\n}\n.sp-icon-inline > svg {\n  display: block;\n  width: 100%;\n  height: 100%;\n}\n'
  return { css: common + inline + blocks.join(''), classes }
}
