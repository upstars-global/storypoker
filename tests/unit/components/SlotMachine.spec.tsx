import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { i18n } from '~/i18n'
import SlotMachine from '~/components/SlotMachine'

type SlotMachineProps = ComponentProps<typeof SlotMachine>

function mountSlot(overrides: Partial<SlotMachineProps> = {}) {
  const props: SlotMachineProps = {
    spinsLeft: 1,
    canSpin: true,
    onSpin: vi.fn(),
    onSpinEnd: vi.fn(),
    onWin: vi.fn(),
    onSwitchWidget: vi.fn(),
    ...overrides,
  }
  const result = render(<SlotMachine {...props} />)
  return { ...result, props }
}

function mockReducedMotion(matches: boolean) {
  vi.spyOn(window, 'matchMedia').mockReturnValue({ matches } as MediaQueryList)
}

function spinButton() {
  return screen.getByTestId('slot-spin-button')
}

beforeEach(() => vi.useFakeTimers())

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('SlotMachine under prefers-reduced-motion', () => {
  it('shows the final symbols without a reel strip and ends the spin after 300ms', () => {
    mockReducedMotion(true)
    const { props } = mountSlot()
    fireEvent.click(spinButton())
    const reels = screen.getAllByTestId('slot-reel')
    expect(reels).toHaveLength(3)
    for (const reel of reels) expect(reel.querySelectorAll('.slot-cell')).toHaveLength(1)
    expect(props.onSpin).toHaveBeenCalledTimes(1)
    expect(props.onSpinEnd).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(props.onSpinEnd).toHaveBeenCalledTimes(1)
  })

  it('builds a multi-cell strip when motion is allowed', () => {
    mockReducedMotion(false)
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 0)
    mountSlot()
    fireEvent.click(spinButton())
    const firstReel = screen.getAllByTestId('slot-reel')[0]!
    expect(firstReel.querySelectorAll('.slot-cell').length).toBeGreaterThan(1)
  })
})

describe('SlotMachine spin gating', () => {
  it('jams instead of spinning and flashes the vote-first hint when the player cannot spin yet', () => {
    mockReducedMotion(true)
    const { props, container } = mountSlot({ spinsLeft: 3, canSpin: false })
    expect(spinButton().hasAttribute('disabled')).toBe(false)
    fireEvent.click(spinButton())
    expect(props.onSpin).not.toHaveBeenCalled()
    expect(container.querySelector('.slot-window')!.classList.contains('is-jammed')).toBe(true)
    expect(screen.getByTestId('slot-spins-left').textContent).toBe(i18n.t('slot.voteFirst'))
    act(() => {
      vi.advanceTimersByTime(400)
    })
    expect(container.querySelector('.slot-window')!.classList.contains('is-jammed')).toBe(false)
    act(() => {
      vi.advanceTimersByTime(1100)
    })
    expect(screen.getByTestId('slot-spins-left').textContent).toBe(i18n.t('slot.spinsLeft', { n: 3 }))
  })

  it('disables the button and says so when no spins are left', () => {
    mountSlot({ spinsLeft: 0 })
    expect(spinButton().hasAttribute('disabled')).toBe(true)
    expect(screen.getByTestId('slot-spins-left').textContent).toBe(i18n.t('slot.noSpinsLeft'))
  })

  it('disables the button while spinning and reports a jackpot when the spin ends', () => {
    mockReducedMotion(true)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const { props } = mountSlot({ spinsLeft: 2 })
    fireEvent.click(spinButton())
    expect(spinButton().hasAttribute('disabled')).toBe(true)
    expect(spinButton().textContent).toBe('…')
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(props.onSpinEnd).toHaveBeenCalledTimes(1)
    expect(props.onWin).toHaveBeenCalledTimes(1)
    expect(spinButton().hasAttribute('disabled')).toBe(false)
  })

  it('switches back to the timer from the header button', () => {
    const { props } = mountSlot()
    const toggle = screen.getByTestId('widget-toggle-timer')
    expect(toggle.getAttribute('aria-label')).toBe(i18n.t('slot.switchToTimer'))
    fireEvent.click(toggle)
    expect(props.onSwitchWidget).toHaveBeenCalledTimes(1)
  })
})
