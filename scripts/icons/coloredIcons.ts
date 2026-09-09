export const COLORED_ICONS = new Set(['app:town-hall'])

const FILL_ATTRIBUTE = /\bfill=["']([^"']+)["']/g

export function hasFixedColors(svg: string): boolean {
  for (const match of svg.matchAll(FILL_ATTRIBUTE)) {
    const value = match[1]!.trim().toLowerCase()
    if (value !== 'currentcolor' && value !== 'none') return true
  }
  return false
}

export function validateColoredIcons(svgs: Record<string, string>): string[] {
  const issues: string[] = []
  for (const [fullName, svg] of Object.entries(svgs)) {
    const colored = hasFixedColors(svg)
    if (colored && !COLORED_ICONS.has(fullName)) {
      issues.push(`${fullName} has fixed fills but is not listed in COLORED_ICONS`)
    }
    if (!colored && COLORED_ICONS.has(fullName)) {
      issues.push(`${fullName} is listed in COLORED_ICONS but uses only currentColor`)
    }
  }
  for (const fullName of COLORED_ICONS) {
    if (!(fullName in svgs)) issues.push(`${fullName} is listed in COLORED_ICONS but has no SVG source`)
  }
  return issues
}

export function inlineMarkup(svg: string): string {
  const viewBox = svg.match(/\bviewBox=["']([^"']+)["']/)?.[1] ?? '0 0 24 24'
  const body = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').trim()
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="1em" height="1em"`
    + ` aria-hidden="true" focusable="false">${body}</svg>`
}
