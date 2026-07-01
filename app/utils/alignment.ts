const NON_ESTIMATE = new Set(['?', '☕'])

export function alignmentScore(
  votes: Record<string, number>,
  deckOrder: string[] | undefined | null,
): number | null {
  if (!deckOrder?.length) return null
  const estimateCards = deckOrder.filter(c => !NON_ESTIMATE.has(c))
  const pos = new Map(estimateCards.map((c, i) => [c, i]))
  const indices: number[] = []
  for (const [vote, count] of Object.entries(votes)) {
    const p = pos.get(vote)
    if (p === undefined) continue
    for (let k = 0; k < count; k++) indices.push(p)
  }
  if (indices.length < 2) return null
  const span = estimateCards.length - 1
  if (span <= 0) return 100
  const spread = Math.max(...indices) - Math.min(...indices)
  return Math.round(100 * (1 - spread / span))
}
