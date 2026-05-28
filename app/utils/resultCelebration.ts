type VoteCounts = Record<string, number>

export interface CelebrationParticle {
  startX: number
  startY: number
  vx: number
  vy: number
  fall: number
  size: number
  spin: number
  delay: number
  duration: number
  hue: number
}

function getUnanimousVote(votes: VoteCounts): string | null {
  const entries = Object.entries(votes).filter(([, count]) => count > 0)
  return entries.length === 1 ? entries[0]![0] : null
}

function hasVotes(votes: VoteCounts): boolean {
  return Object.values(votes).some(c => c > 0)
}

export function shouldCelebrateGroupedVotes(groupedVotes: {
  general: VoteCounts
  qa: VoteCounts
} | null | undefined): boolean {
  if (!groupedVotes) return false

  const generalVote = getUnanimousVote(groupedVotes.general)
  const qaVote = getUnanimousVote(groupedVotes.qa)
  const hasGeneralVotes = hasVotes(groupedVotes.general)
  const hasQaVotes = hasVotes(groupedVotes.qa)

  if (hasGeneralVotes && !!generalVote) return true
  if (hasQaVotes && !!qaVote) return true
  return false
}

export function createCelebrationParticles(count = 180, random = Math.random, centerX = 50, centerY = 50): CelebrationParticle[] {
  return Array.from({ length: count }, () => {
    const angleDeg = 25 + Math.round(random() * 130)
    const speed = 15 + Math.round(random() * 20)
    const angleRad = (angleDeg * Math.PI) / 180
    const startX = Math.round((centerX + (random() - 0.5) * 4) * 10) / 10
    const startY = Math.round((centerY + (random() - 0.5) * 2) * 10) / 10
    const fall = 35 + Math.round(random() * 35)
    const size = 6 + Math.round(random() * 10)
    const spin = 180 + Math.round(random() * 540)
    const delay = Math.round(random() * 120)
    const duration = 2400 + Math.round(random() * 1200)
    const hue = [0, 34, 48, 120, 188, 270, 320][Math.floor(random() * 7)]!
    const vx = Math.round(Math.cos(angleRad) * speed * 10) / 10
    const vy = Math.round(-Math.sin(angleRad) * speed * 10) / 10

    return { startX, startY, vx, vy, fall, size, spin, delay, duration, hue }
  })
}
