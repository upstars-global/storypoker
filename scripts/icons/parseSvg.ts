export interface ParsedSvg {
  body: string
  width: number
  height: number
}

export function parseSvg(svg: string): ParsedSvg {
  let width = 24
  let height = 24
  const viewBox = svg.match(/\bviewBox=["']([^"']+)["']/)
  if (viewBox?.[1]) {
    const parts = viewBox[1].trim().split(/\s+/).map(Number)
    const vbWidth = parts[2]
    const vbHeight = parts[3]
    if (parts.length === 4 && vbWidth !== undefined && vbHeight !== undefined
      && !Number.isNaN(vbWidth) && !Number.isNaN(vbHeight)) {
      width = vbWidth
      height = vbHeight
    }
  } else {
    const w = svg.match(/\bwidth=["'](\d+)["']/)
    const h = svg.match(/\bheight=["'](\d+)["']/)
    if (w?.[1]) width = parseInt(w[1], 10)
    if (h?.[1]) height = parseInt(h[1], 10)
  }
  const body = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').trim()
  return { body, width, height }
}
