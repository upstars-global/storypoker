import { describe, expect, it } from 'vitest'
import { MULTI_ANSWER_SEPARATOR, countVoters, splitVote, toggleAnswer } from '~/utils/pollAnswers'

const deck = ['Option A', 'Option B', 'Option C']

describe('splitVote', () => {
  it('splits a multi-answer vote on the separator', () => {
    expect(MULTI_ANSWER_SEPARATOR).toBe('\n')
    expect(splitVote('Option A\nOption C')).toEqual(['Option A', 'Option C'])
  })

  it('keeps a single vote as one answer', () => {
    expect(splitVote('Option A')).toEqual(['Option A'])
    expect(splitVote('1/2')).toEqual(['1/2'])
  })
})

describe('toggleAnswer', () => {
  it('adds an answer in deck order regardless of click order', () => {
    expect(toggleAnswer('Option C', 'Option A', deck)).toBe('Option A\nOption C')
    expect(toggleAnswer('Option A', 'Option C', deck)).toBe('Option A\nOption C')
  })

  it('starts a vote from no answers', () => {
    expect(toggleAnswer(null, 'Option B', deck)).toBe('Option B')
  })

  it('removes a selected answer only', () => {
    expect(toggleAnswer('Option A\nOption C', 'Option C', deck)).toBe('Option A')
  })

  it('returns null when the last answer is removed', () => {
    expect(toggleAnswer('Option A', 'Option A', deck)).toBeNull()
  })

  it('drops answers that are no longer in the deck', () => {
    expect(toggleAnswer('Gone\nOption A', 'Option B', deck)).toBe('Option A\nOption B')
  })
})

describe('countVoters', () => {
  it('counts players with at least one answer', () => {
    expect(countVoters(['Option A\nOption B', 'Option A', null, 'Option B\nOption C'])).toBe(3)
  })
})
