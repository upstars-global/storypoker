import { describe, it, expect } from 'vitest'
import { votingProgress } from '~/utils/votingProgress'

function player(id: string, vote: string | null, shields: string[] = []) {
  return { id, name: id, vote, shields }
}

describe('votingProgress', () => {
  it('counts voted players and overall percent', () => {
    const result = votingProgress([
      player('a', '5'),
      player('b', null),
      player('c', '8'),
      player('d', null),
    ])
    expect(result.total).toBe(4)
    expect(result.voted).toBe(2)
    expect(result.percent).toBe(50)
  })

  it('lists players who have not voted yet', () => {
    const result = votingProgress([player('a', '5'), player('b', null)])
    expect(result.waiting).toEqual([{ id: 'b', name: 'b' }])
  })

  it('splits players into dev, qa and other groups', () => {
    const result = votingProgress([
      player('fe', '3', ['fe']),
      player('be', null, ['be']),
      player('qa', '5', ['qa']),
      player('aqa', null, ['aqa']),
      player('po', '8', ['po']),
      player('none', null),
    ])
    expect(result.groups).toEqual([
      { key: 'dev', total: 2, voted: 1, percent: 50 },
      { key: 'qa', total: 2, voted: 1, percent: 50 },
      { key: 'other', total: 2, voted: 1, percent: 50 },
    ])
  })

  it('omits empty groups', () => {
    const result = votingProgress([player('a', '5', ['dev']), player('b', null, ['dev'])])
    expect(result.groups).toEqual([{ key: 'dev', total: 2, voted: 1, percent: 50 }])
  })

  it('treats ? and ☕ as given votes', () => {
    const result = votingProgress([player('a', '?'), player('b', '☕')])
    expect(result.voted).toBe(2)
    expect(result.percent).toBe(100)
  })

  it('handles an empty room', () => {
    const result = votingProgress([])
    expect(result).toEqual({ total: 0, voted: 0, percent: 0, groups: [], waiting: [] })
  })
})
