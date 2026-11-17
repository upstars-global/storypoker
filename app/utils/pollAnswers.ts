export const MULTI_ANSWER_SEPARATOR = '\n'

export function splitVote(vote: string): string[] {
  return vote.split(MULTI_ANSWER_SEPARATOR)
}

export function toggleAnswer(current: string | null, card: string, deckOrder: readonly string[]): string | null {
  const selected = new Set(current ? splitVote(current) : [])
  if (selected.has(card)) selected.delete(card)
  else selected.add(card)
  const ordered = deckOrder.filter(answer => selected.has(answer))
  return ordered.length ? ordered.join(MULTI_ANSWER_SEPARATOR) : null
}

export function countVoters(votes: readonly (string | null)[]): number {
  return votes.filter(vote => vote !== null).length
}
