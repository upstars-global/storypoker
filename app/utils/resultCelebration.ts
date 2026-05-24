type VoteCounts = Record<string, number>

export interface CelebrationParticle {
  left: number
  top: number
  size: number
  delay: number
  duration: number
  angle: number
  curveX: number
  curveY: number
  driftX: number
  driftY: number
  hue: number
}

function getUnanimousVote(votes: VoteCounts): string | null {
  const entries = Object.entries(votes).filter(([, count]) => count > 0)
  return entries.length === 1 ? entries[0]![0] : null
}

export function shouldCelebrateGroupedVotes(groupedVotes: {
  general: VoteCounts
  qa: VoteCounts
} | null | undefined): boolean {
  if (!groupedVotes) return false

  const generalVote = getUnanimousVote(groupedVotes.general)
  const qaVote = getUnanimousVote(groupedVotes.qa)

  return !!generalVote && generalVote === qaVote
}

export function createCelebrationParticles(count = 120, random = Math.random): CelebrationParticle[] {
  return Array.from({ length: count }, () => {
    const left = Math.round(random() * 1000) / 10
    const top = Math.round(random() * 1000) / 10
    const size = 8 + Math.round(random() * 20)
    const delay = 0
    const duration = 2200
    const angle = Math.round(random() * 360)
    const curveX = Math.round((random() * 2 - 1) * 260)
    const curveY = Math.round((random() * 2 - 1) * 220)
    const driftX = Math.round((random() * 2 - 1) * 320)
    const driftY = Math.round((random() * 2 - 1) * 260)
    const hue = [0, 34, 48, 120, 188, 280][Math.floor(random() * 6)]!

    return { left, top, size, delay, duration, angle, curveX, curveY, driftX, driftY, hue }
  })
}
