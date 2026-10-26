import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { i18n } from '~/i18n'
import CardsArea from '~/components/CardsArea'

type CardsAreaProps = ComponentProps<typeof CardsArea>

function mountCards(overrides: Partial<CardsAreaProps> = {}) {
  const props: CardsAreaProps = {
    activeCards: ['1', '2', '3'],
    selectedVote: null,
    isModerator: true,
    hasVotes: true,
    canReset: true,
    countdownCounter: 0,
    countdownRunning: false,
    pollMode: false,
    voteQuestionMode: false,
    pollQuestion: null,
    hasLastRound: true,
    showLastRound: false,
    onVote: vi.fn(),
    onReveal: vi.fn(),
    onReset: vi.fn(),
    onStartCountdown: vi.fn(),
    onSetPollQuestion: vi.fn(),
    onStartVoteQuestion: vi.fn(),
    onToggleLastRound: vi.fn(),
    ...overrides,
  }
  const result = render(<CardsArea {...props} />)
  return { ...result, props }
}

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  document.body.innerHTML = ''
})

describe('CardsArea moderator icon buttons', () => {
  it('names the reset button', () => {
    mountCards()
    expect(screen.getByTestId('reset-button').getAttribute('aria-label')).toBe(i18n.t('cards.reset'))
  })

  it('exposes the last-round toggle as a pressed button', () => {
    mountCards()
    const off = screen.getByTestId('last-round-button')
    expect(off.getAttribute('aria-label')).toBe(i18n.t('cards.lastRound'))
    expect(off.getAttribute('aria-pressed')).toBe('false')
    cleanup()

    mountCards({ showLastRound: true })
    expect(screen.getByTestId('last-round-button').getAttribute('aria-pressed')).toBe('true')
  })
})

describe('CardsArea voting', () => {
  it('marks the selected card and votes on click', () => {
    const { props } = mountCards({ selectedVote: '2' })
    const cards = screen.getAllByTestId('vote-card')
    expect(cards.map(card => card.getAttribute('data-value'))).toEqual(['1', '2', '3'])
    expect(cards[1]!.classList.contains('is-selected')).toBe(true)
    expect(cards[1]!.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(cards[2]!)
    expect(props.onVote).toHaveBeenCalledWith('3')
  })

  it('hides moderator controls from a plain player', () => {
    mountCards({ isModerator: false })
    expect(screen.queryByTestId('reveal-button')).toBeNull()
    expect(screen.queryByTestId('countdown-mode')).toBeNull()
  })

  it('disables cards in poll mode until the question is set', () => {
    mountCards({ pollMode: true, isModerator: false })
    expect(screen.getAllByTestId('vote-card').every(card => (card as HTMLButtonElement).disabled)).toBe(true)
    expect(screen.getByText(i18n.t('poll.waiting'))).toBeTruthy()
  })

  it('starts the countdown only after holding a mode button', async () => {
    vi.useFakeTimers()
    const { props } = mountCards()
    const [silent] = screen.getAllByTestId('countdown-mode-option')
    fireEvent.pointerDown(silent!)
    await act(async () => { vi.advanceTimersByTime(1000) })
    fireEvent.pointerUp(silent!)
    await act(async () => { vi.advanceTimersByTime(1000) })
    expect(props.onStartCountdown).not.toHaveBeenCalled()

    fireEvent.pointerDown(silent!)
    expect(silent!.classList.contains('is-holding')).toBe(true)
    await act(async () => { vi.advanceTimersByTime(1400) })
    expect(props.onStartCountdown).toHaveBeenCalledWith('silent')
  })

  it('shows the ticker while the countdown runs', () => {
    mountCards({ countdownRunning: true, countdownCounter: 7 })
    expect(screen.getByTestId('countdown-ticker').textContent).toBe('7')
    expect(screen.queryAllByTestId('countdown-mode-option')).toHaveLength(0)
  })
})
