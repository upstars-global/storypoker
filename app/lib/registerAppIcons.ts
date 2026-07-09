import { addCollection } from '@iconify/vue'
import moderatorSvg from '~/assets/icons/moderator.svg?raw'
import decidingSvg from '~/assets/icons/deciding.svg?raw'
import offlineSvg from '~/assets/icons/offline.svg?raw'
import leaveRoomSvg from '~/assets/icons/leave-room.svg?raw'
import bankSvg from '~/assets/icons/bank.svg?raw'
import townHallSvg from '~/assets/icons/town-hall.svg?raw'
import fibonacciSvg from '~/assets/icons/fibonacci.svg?raw'
import scrumSvg from '~/assets/icons/scrum.svg?raw'

function parseSvg(svg: string): { body: string; width: number; height: number } {
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

export function registerAppIcons(): void {
  addCollection({
    prefix: 'app',
    icons: {
      moderator: parseSvg(moderatorSvg),
      deciding: parseSvg(decidingSvg),
      offline: parseSvg(offlineSvg),
      'leave-room': parseSvg(leaveRoomSvg),
      bank: parseSvg(bankSvg),
      'town-hall': parseSvg(townHallSvg),
      fibonacci: parseSvg(fibonacciSvg),
      scrum: parseSvg(scrumSvg),
    },
  })
}
