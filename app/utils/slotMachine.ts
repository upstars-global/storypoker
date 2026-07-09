export const SLOT_SYMBOL_WEIGHTS: [symbol: string, weight: number][] = [
  ['🍒', 5],
  ['🍋', 5],
  ['🍊', 4],
  ['🍇', 4],
  ['🔔', 3],
  ['⭐', 2],
  ['7️⃣', 1],
]

export const SLOT_SYMBOLS = SLOT_SYMBOL_WEIGHTS.map(([symbol]) => symbol)

const TOTAL_WEIGHT = SLOT_SYMBOL_WEIGHTS.reduce((sum, [, weight]) => sum + weight, 0)

export function randomSlotSymbol(random: () => number = Math.random): string {
  let roll = random() * TOTAL_WEIGHT
  for (const [symbol, weight] of SLOT_SYMBOL_WEIGHTS) {
    roll -= weight
    if (roll < 0) return symbol
  }
  return SLOT_SYMBOL_WEIGHTS[SLOT_SYMBOL_WEIGHTS.length - 1]![0]
}

export function spinReels(random: () => number = Math.random): [string, string, string] {
  return [randomSlotSymbol(random), randomSlotSymbol(random), randomSlotSymbol(random)]
}

export function isJackpot(reels: readonly string[]): boolean {
  return reels.length === 3 && reels.every(s => s === reels[0])
}

export function buildReelStrip(length: number, random: () => number = Math.random): string[] {
  return Array.from({ length }, () => randomSlotSymbol(random))
}
