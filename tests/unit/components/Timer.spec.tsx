import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { i18n } from '~/i18n'
import Timer from '~/components/Timer'

const { playAlarmChime, unlockAlarmAudio } = vi.hoisted(() => ({ playAlarmChime: vi.fn(), unlockAlarmAudio: vi.fn() }))
vi.mock('~/utils/timerAlarm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/utils/timerAlarm')>()
  return { ...actual, playAlarmChime, unlockAlarmAudio }
})

type TimerProps = ComponentProps<typeof Timer>

const START = new Date('2026-10-12T10:00:00Z').getTime()
const THREE_MIN = 3 * 60_000

function mountTimer(overrides: Partial<TimerProps> = {}) {
  let props: TimerProps = {
    roundStartedAt: new Date(START).toISOString(),
    phase: 'voting',
    pausedAt: null,
    pausedElapsedMs: 0,
    canControl: true,
    alarmMinutes: 3,
    alarmMuted: false,
    onReset: vi.fn(),
    onPause: vi.fn(),
    onResume: vi.fn(),
    onAdjust: vi.fn(),
    onSwitchWidget: vi.fn(),
    onUpdateAlarm: vi.fn(),
    ...overrides,
  }
  const result = render(<Timer {...props} />)
  function setProps(next: Partial<TimerProps>) {
    props = { ...props, ...next }
    act(() => {
      result.rerender(<Timer {...props} />)
    })
  }
  return { ...result, props, setProps }
}

function widget() {
  return screen.getByTestId('timer-widget')
}

function blinking() {
  return widget().classList.contains('timer-alarm-blink')
}

function blinkCount() {
  return widget().style.getPropertyValue('--alarm-blinks')
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('Timer alarm', () => {
  beforeEach(() => {
    playAlarmChime.mockClear()
    vi.useFakeTimers()
  })

  it('blinks the whole widget and rings once the interval elapses, without pausing the timer', async () => {
    vi.setSystemTime(START + THREE_MIN - 2000)
    const { props } = mountTimer()
    await advance(1000)
    expect(blinking()).toBe(false)
    await advance(1000)
    expect(blinking()).toBe(true)
    expect(playAlarmChime).toHaveBeenCalledWith(1)
    expect(props.onPause).not.toHaveBeenCalled()
    fireEvent.animationEnd(widget())
    expect(blinking()).toBe(false)
  })

  it('ignores animationend bubbling from children', async () => {
    vi.setSystemTime(START + THREE_MIN - 500)
    mountTimer()
    await advance(1000)
    fireEvent.animationEnd(screen.getByTestId('timer-display'))
    expect(blinking()).toBe(true)
  })

  it('stays silent when muted', async () => {
    vi.setSystemTime(START + THREE_MIN - 500)
    const { props } = mountTimer({ canControl: false, alarmMuted: true })
    await advance(1000)
    expect(blinking()).toBe(true)
    expect(playAlarmChime).not.toHaveBeenCalled()
    expect(props.onPause).not.toHaveBeenCalled()
  })

  it('rings one, two, then three beeps on the first three intervals and stays quiet after', async () => {
    vi.setSystemTime(START + THREE_MIN - 500)
    const { props } = mountTimer()
    await advance(1000)
    expect(playAlarmChime).toHaveBeenLastCalledWith(1)
    expect(blinkCount()).toBe('1')
    await advance(THREE_MIN - 2000)
    expect(playAlarmChime).toHaveBeenCalledTimes(1)
    await advance(2000)
    expect(playAlarmChime).toHaveBeenLastCalledWith(2)
    expect(blinkCount()).toBe('2')
    await advance(THREE_MIN)
    expect(playAlarmChime).toHaveBeenLastCalledWith(3)
    expect(blinkCount()).toBe('3')
    fireEvent.animationEnd(widget())
    await advance(2 * THREE_MIN)
    expect(playAlarmChime).toHaveBeenCalledTimes(3)
    expect(blinking()).toBe(false)
    expect(props.onPause).not.toHaveBeenCalled()
  })

  it('fires again one interval after a manual pause is resumed', async () => {
    vi.setSystemTime(START + THREE_MIN - 500)
    const { setProps } = mountTimer()
    await advance(1000)
    setProps({ pausedAt: new Date(Date.now()).toISOString() })
    await advance(30_000)
    setProps({ pausedAt: null, pausedElapsedMs: 30_000 })
    await advance(THREE_MIN - 2000)
    expect(playAlarmChime).toHaveBeenCalledTimes(1)
    await advance(2000)
    expect(playAlarmChime).toHaveBeenCalledTimes(2)
  })

  it('rings once on a lagging clock when the pause crosses the interval, not again after play', async () => {
    vi.setSystemTime(START + THREE_MIN - 1500)
    const { props, setProps } = mountTimer()
    await advance(1000)
    expect(playAlarmChime).not.toHaveBeenCalled()
    setProps({ pausedAt: new Date(START + THREE_MIN + 200).toISOString() })
    expect(playAlarmChime).toHaveBeenCalledTimes(1)
    expect(blinking()).toBe(true)
    await advance(30_000)
    setProps({ pausedAt: null, pausedElapsedMs: 30_000 })
    await advance(3000)
    expect(playAlarmChime).toHaveBeenCalledTimes(1)
    expect(props.onPause).not.toHaveBeenCalled()
  })

  it('stops counting at one hour and stays silent past it', async () => {
    const ONE_HOUR = 60 * 60_000
    vi.setSystemTime(START + ONE_HOUR - 1500)
    mountTimer({ alarmMinutes: 7 })
    await advance(2000)
    const stopped = i18n.t('timer.roundStopped', { duration: '1h 0m 0s' })
    expect(screen.getByTestId('timer-display').textContent).toBe(stopped)
    await advance(10 * 60_000)
    expect(screen.getByTestId('timer-display').textContent).toBe(stopped)
    expect(playAlarmChime).not.toHaveBeenCalled()
  })

  it('does not fire right away when the interval is shortened mid-round', async () => {
    vi.setSystemTime(START + 4 * 60_000)
    const { setProps } = mountTimer({ alarmMinutes: 5 })
    setProps({ alarmMinutes: 3 })
    await advance(3000)
    expect(playAlarmChime).not.toHaveBeenCalled()
  })

  it('fires again in the next round after a new round starts', async () => {
    vi.setSystemTime(START + THREE_MIN - 500)
    const { setProps } = mountTimer()
    await advance(1000)
    expect(playAlarmChime).toHaveBeenCalledTimes(1)
    setProps({ roundStartedAt: new Date(Date.now()).toISOString() })
    await advance(THREE_MIN)
    expect(playAlarmChime).toHaveBeenCalledTimes(2)
  })

  it('freezes the displayed duration at the pause when votes are revealed', () => {
    vi.setSystemTime(START + THREE_MIN + 60_000)
    const { setProps } = mountTimer({ pausedAt: new Date(START + THREE_MIN).toISOString() })
    setProps({ phase: 'revealed' })
    expect(screen.getByTestId('timer-display').textContent).toContain('3m 0s')
  })

  it('does not fire when the round is already past the threshold on mount', async () => {
    vi.setSystemTime(START + THREE_MIN + 10_000)
    mountTimer()
    await advance(3000)
    expect(blinking()).toBe(false)
  })

  it('does not fire after reveal', async () => {
    vi.setSystemTime(START + THREE_MIN - 2000)
    mountTimer({ phase: 'revealed' })
    await advance(5000)
    expect(blinking()).toBe(false)
  })

  it('lets a moderator change the room alarm from the gear and commits minutes on Enter', () => {
    const { props } = mountTimer()
    expect(screen.queryByTestId('timer-alarm-settings')).toBeNull()
    const toggle = screen.getByTestId('timer-alarm-toggle')
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    const input = screen.getByTestId<HTMLInputElement>('timer-alarm-minutes')
    input.focus()
    input.value = '50'
    fireEvent.input(input)
    expect(props.onUpdateAlarm).not.toHaveBeenCalled()
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(document.activeElement).not.toBe(input)
    expect(input.value).toBe('20')
    const mute = screen.getByTestId('timer-alarm-mute')
    expect(mute.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(mute)
    expect(vi.mocked(props.onUpdateAlarm).mock.calls).toEqual([[{ minutes: 20 }], [{ muted: true }]])
  })

  it('hides the alarm settings from players who are not moderators', () => {
    mountTimer({ canControl: false })
    expect(screen.queryByTestId('timer-alarm-toggle')).toBeNull()
  })

  it('defaults to a 5 minute alarm when the room has no setting', async () => {
    vi.setSystemTime(START + 5 * 60_000 - 500)
    mountTimer({ alarmMinutes: null, alarmMuted: null })
    await advance(1000)
    expect(blinking()).toBe(true)
    expect(playAlarmChime).toHaveBeenCalledTimes(1)
  })
})

describe('Timer controls', () => {
  it('unlocks alarm audio on the first pointer or key press and stops listening on unmount', () => {
    unlockAlarmAudio.mockClear()
    const { unmount } = mountTimer()
    fireEvent.pointerDown(window)
    fireEvent.pointerDown(window)
    expect(unlockAlarmAudio).toHaveBeenCalledTimes(1)
    unmount()
    fireEvent.keyDown(window, { key: 'a' })
    expect(unlockAlarmAudio).toHaveBeenCalledTimes(1)
  })

  it('shows the moderator controls only while voting and emits their actions', () => {
    const { props, setProps } = mountTimer()
    fireEvent.click(screen.getByRole('button', { name: i18n.t('timer.minus30') }))
    fireEvent.click(screen.getByRole('button', { name: i18n.t('timer.plus30') }))
    fireEvent.click(screen.getByRole('button', { name: i18n.t('timer.reset') }))
    fireEvent.click(screen.getByRole('button', { name: i18n.t('timer.pause') }))
    expect(vi.mocked(props.onAdjust).mock.calls).toEqual([[-30000], [30000]])
    expect(props.onReset).toHaveBeenCalledTimes(1)
    expect(props.onPause).toHaveBeenCalledTimes(1)

    setProps({ pausedAt: new Date(START).toISOString() })
    expect(screen.queryByRole('button', { name: i18n.t('timer.pause') })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: i18n.t('timer.continue') }))
    expect(props.onResume).toHaveBeenCalledTimes(1)

    setProps({ phase: 'revealed' })
    expect(screen.queryByRole('button', { name: i18n.t('timer.reset') })).toBeNull()
  })

  it('hides the controls from players who are not moderators', () => {
    mountTimer({ canControl: false })
    expect(screen.queryByRole('button', { name: i18n.t('timer.reset') })).toBeNull()
  })

  it('switches to the slot machine from the header button', () => {
    const { props } = mountTimer({ canControl: false })
    const toggle = screen.getByTestId('widget-toggle-slot')
    expect(toggle.getAttribute('aria-label')).toBe(i18n.t('slot.switchToSlot'))
    fireEvent.click(toggle)
    expect(props.onSwitchWidget).toHaveBeenCalledTimes(1)
  })
})
