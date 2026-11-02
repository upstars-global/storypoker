import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { i18n } from '~/i18n'
import CardsArea, { ResultsLayer } from '~/components/CardsArea'
import iconClasses from '~/generated/iconClasses.json'
import { mapIconName } from '~/utils/iconMap'

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

  it('switches the reset button to an enabled undo state', () => {
    mountCards({ canReset: false, resetUndoAvailable: true })
    const button = screen.getByTestId('reset-button') as HTMLButtonElement
    expect(button.getAttribute('aria-label')).toBe(i18n.t('cards.undoReset'))
    expect(button.getAttribute('aria-pressed')).toBe('true')
    expect(button.disabled).toBe(false)
    expect(button.querySelector(`.${(iconClasses as Record<string, string>)[mapIconName('ic:baseline-undo')]}`)).not.toBeNull()
  })

  it('shows the reset icon outside the undo state', () => {
    mountCards()
    const button = screen.getByTestId('reset-button')
    expect(button.getAttribute('aria-pressed')).toBe('false')
    expect(button.querySelector(`.${(iconClasses as Record<string, string>)[mapIconName('ic:baseline-restart-alt')]}`)).not.toBeNull()
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

  it.each([
    ['the last-round view', { showLastRound: true }],
    ['fewer than two votes', { hasVotes: false }],
    ['a running countdown', { countdownRunning: true }],
  ])('keeps the reveal button in place but disabled during %s', (_name, overrides) => {
    mountCards(overrides)
    const reveal = screen.getByTestId('reveal-button') as HTMLButtonElement
    expect(reveal.disabled).toBe(true)
  })

  it('enables the reveal button when votes can be revealed', () => {
    mountCards()
    expect((screen.getByTestId('reveal-button') as HTMLButtonElement).disabled).toBe(false)
  })

  it('sizes cards to a third of the row below the lg breakpoint and keeps the desktop width', () => {
    mountCards()
    const slot = screen.getAllByTestId('vote-card')[0]!.parentElement!
    expect(slot.className).toContain('w-[calc((100%-1.5rem)/3)]')
    expect(slot.className).toContain('sm:w-[calc((100%-2rem)/3)]')
    expect(slot.className).toContain('lg:w-[151.66px]')
  })

  it.each([false, true])('stacks cards and the last-round view in one cell (showLastRound=%s)', showLastRound => {
    mountCards({ showLastRound, lastRoundView: <div data-testid="last-round-content" /> })
    const cards = screen.getByTestId('cards-layer')
    const lastRound = screen.getByTestId('last-round-layer')
    expect(cards.parentElement).toBe(lastRound.parentElement)
    expect(cards.classList.contains('invisible')).toBe(showLastRound)
    expect(lastRound.classList.contains('invisible')).toBe(!showLastRound)
    expect(screen.getByTestId('reveal-button')).toBeTruthy()
  })

  it('shows the results layer and disables every panel control after reveal', () => {
    mountCards({ revealed: true, resetUndoAvailable: true, lastRoundView: <div /> })
    expect(screen.getByTestId('cards-layer').classList.contains('invisible')).toBe(true)
    expect(screen.getByTestId('last-round-layer').classList.contains('invisible')).toBe(false)
    for (const id of ['reveal-button', 'reset-button', 'last-round-button']) {
      expect((screen.getByTestId(id) as HTMLButtonElement).disabled).toBe(true)
    }
  })

  it('keeps the moderator panel below a cards zone whose height comes from the cards only', () => {
    mountCards({ showLastRound: true, lastRoundView: <div /> })
    const zone = screen.getByTestId('cards-zone')
    const lastRound = screen.getByTestId('last-round-layer')
    expect(lastRound.className.split(' ')).toEqual(expect.arrayContaining(['absolute', 'inset-0']))
    expect(zone.contains(screen.getByTestId('cards-layer'))).toBe(true)
    expect(zone.nextElementSibling).toBe(screen.getByTestId('moderator-panel'))
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

describe('ResultsLayer', () => {
  function mockHeights(zone: number, content: number) {
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(zone)
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(content)
  }

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('scales the results down proportionally to fit the cards zone', () => {
    mockHeights(300, 600)
    render(<ResultsLayer visible fits><div /></ResultsLayer>)
    const layer = screen.getByTestId('last-round-layer')
    expect(layer.dataset.scale).toBe('0.5')
    expect((layer.firstElementChild as HTMLElement).style.transform).toBe('scale(0.5)')
    expect(layer.className.split(' ')).toContain('overflow-hidden')
  })

  it('keeps full size when the results already fit', () => {
    mockHeights(600, 300)
    render(<ResultsLayer visible fits><div /></ResultsLayer>)
    expect(screen.getByTestId('last-round-layer').dataset.scale).toBe('1')
  })

  it('scrolls at full size when too many circles are shown', () => {
    mockHeights(300, 600)
    render(<ResultsLayer visible fits={false}><div /></ResultsLayer>)
    const layer = screen.getByTestId('last-round-layer')
    expect(layer.dataset.scale).toBe('1')
    expect(layer.className.split(' ')).toContain('overflow-y-auto')
  })
})

