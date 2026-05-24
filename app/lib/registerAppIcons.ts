import { addCollection } from '@iconify/vue'
import moderatorSvg from '~/assets/icons/moderator.svg?raw'
import decidingSvg from '~/assets/icons/deciding.svg?raw'
import offlineSvg from '~/assets/icons/offline.svg?raw'
import leaveRoomSvg from '~/assets/icons/leave-room.svg?raw'
import fibonacciSvg from '~/assets/icons/fibonacci.svg?raw'

function parseSvg(svg: string): { body: string; width: number; height: number } {
  let width = 24
  let height = 24
  const viewBox = svg.match(/\bviewBox=["']([^"']+)["']/)
  if (viewBox) {
    const parts = viewBox[1].trim().split(/\s+/).map(Number)
    if (parts.length === 4 && !Number.isNaN(parts[2]) && !Number.isNaN(parts[3])) {
      width = parts[2]
      height = parts[3]
    }
  } else {
    const w = svg.match(/\bwidth=["'](\d+)["']/)
    const h = svg.match(/\bheight=["'](\d+)["']/)
    if (w) width = parseInt(w[1], 10)
    if (h) height = parseInt(h[1], 10)
  }
  const body = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').trim()
  return { body, width, height }
}

export function registerAppIcons(): void {
  addCollection({
    prefix: 'app',
    icons: {
      moderator: parseSvg(moderatorSvg),
      deciding: parseSvg(decidingSvg),
      offline: parseSvg(offlineSvg),
      'leave-room': parseSvg(leaveRoomSvg),
      fibonacci: parseSvg(fibonacciSvg),
    },
  })
}
