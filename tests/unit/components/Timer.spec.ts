import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import Timer from '~/components/Timer.vue'

const playAlarmChime = vi.hoisted(() => vi.fn())
vi.mock('~/utils/timerAlarm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/utils/timerAlarm')>()
  return { ...actual, playAlarmChime }
})

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  missingWarn: false,
  fallbackWarn: false,
  messages: { en: { timer: { roundDuration: 'Round duration: {duration}', roundStopped: 'Round stopped after {duration}' } } },
})

const START = new Date('2026-10-12T10:00:00Z').getTime()
const THREE_MIN = 3 * 60_000

function mountTimer(props: Partial<InstanceType<typeof Timer>['$props']> = {}) {
  return mount(Timer, {
    props: {
      roundStartedAt: new Date(START).toISOString(),
      phase: 'voting',
      pausedAt: null,
      pausedElapsedMs: 0,
      canControl: true,
      alarmMinutes: 3,
      alarmMuted: false,
      ...props,
    },
    global: {
      plugins: [i18n],
      directives: { wave: {} },
      stubs: { AppIcon: true, AppTooltip: { template: '<div><slot name="trigger" /></div>' } },
    },
  })
}

function blinking(wrapper: ReturnType<typeof mountTimer>) {
  return wrapper.get('[data-testid="timer-widget"]').classes().includes('timer-alarm-blink')
}

describe('Timer alarm', () => {
  beforeEach(() => {
    playAlarmChime.mockClear()
    vi.useFakeTimers()
  })
  afterEach(() => vi.useRealTimers())

  it('blinks the whole widget and rings once the interval elapses, without pausing the timer', async () => {
    vi.setSystemTime(START + THREE_MIN - 2000)
    const wrapper = mountTimer()
    await vi.advanceTimersByTimeAsync(1000)
    expect(blinking(wrapper)).toBe(false)
    await vi.advanceTimersByTimeAsync(1000)
    expect(blinking(wrapper)).toBe(true)
    expect(playAlarmChime).toHaveBeenCalledTimes(1)
    expect(wrapper.emitted('pause')).toBeUndefined()
    await wrapper.get('[data-testid="timer-widget"]').trigger('animationend')
    expect(blinking(wrapper)).toBe(false)
  })

  it('stays silent when muted', async () => {
    vi.setSystemTime(START + THREE_MIN - 500)
    const wrapper = mountTimer({ canControl: false, alarmMuted: true })
    await vi.advanceTimersByTimeAsync(1000)
    expect(blinking(wrapper)).toBe(true)
    expect(playAlarmChime).not.toHaveBeenCalled()
    expect(wrapper.emitted('pause')).toBeUndefined()
  })

  it('fires again every interval while the timer keeps running', async () => {
    vi.setSystemTime(START + THREE_MIN - 500)
    const wrapper = mountTimer()
    await vi.advanceTimersByTimeAsync(1000)
    expect(playAlarmChime).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(THREE_MIN - 2000)
    expect(playAlarmChime).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(2000)
    expect(playAlarmChime).toHaveBeenCalledTimes(2)
    expect(wrapper.emitted('pause')).toBeUndefined()
  })

  it('fires again one interval after a manual pause is resumed', async () => {
    vi.setSystemTime(START + THREE_MIN - 500)
    const wrapper = mountTimer()
    await vi.advanceTimersByTimeAsync(1000)
    await wrapper.setProps({ pausedAt: new Date(Date.now()).toISOString() })
    await vi.advanceTimersByTimeAsync(30_000)
    await wrapper.setProps({ pausedAt: null, pausedElapsedMs: 30_000 })
    await vi.advanceTimersByTimeAsync(THREE_MIN - 2000)
    expect(playAlarmChime).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(2000)
    expect(playAlarmChime).toHaveBeenCalledTimes(2)
  })

  it('rings once on a lagging clock when the pause crosses the interval, not again after play', async () => {
    vi.setSystemTime(START + THREE_MIN - 1500)
    const wrapper = mountTimer()
    await vi.advanceTimersByTimeAsync(1000)
    expect(playAlarmChime).not.toHaveBeenCalled()
    await wrapper.setProps({ pausedAt: new Date(START + THREE_MIN + 200).toISOString() })
    expect(playAlarmChime).toHaveBeenCalledTimes(1)
    expect(blinking(wrapper)).toBe(true)
    await vi.advanceTimersByTimeAsync(30_000)
    await wrapper.setProps({ pausedAt: null, pausedElapsedMs: 30_000 })
    await vi.advanceTimersByTimeAsync(3000)
    expect(playAlarmChime).toHaveBeenCalledTimes(1)
    expect(wrapper.emitted('pause')).toBeUndefined()
  })

  it('stops counting at one hour and stays silent past it', async () => {
    const ONE_HOUR = 60 * 60_000
    vi.setSystemTime(START + ONE_HOUR - 1500)
    const wrapper = mountTimer({ alarmMinutes: 7 })
    await vi.advanceTimersByTimeAsync(2000)
    expect(wrapper.text()).toContain('Round stopped after 1h 0m 0s')
    await vi.advanceTimersByTimeAsync(10 * 60_000)
    expect(wrapper.text()).toContain('Round stopped after 1h 0m 0s')
    expect(playAlarmChime).not.toHaveBeenCalled()
  })

  it('does not fire right away when the interval is shortened mid-round', async () => {
    vi.setSystemTime(START + 4 * 60_000)
    const wrapper = mountTimer({ alarmMinutes: 5 })
    await wrapper.setProps({ alarmMinutes: 3 })
    await vi.advanceTimersByTimeAsync(3000)
    expect(playAlarmChime).not.toHaveBeenCalled()
  })

  it('fires again in the next round after a new round starts', async () => {
    vi.setSystemTime(START + THREE_MIN - 500)
    const wrapper = mountTimer()
    await vi.advanceTimersByTimeAsync(1000)
    expect(playAlarmChime).toHaveBeenCalledTimes(1)
    await wrapper.setProps({ roundStartedAt: new Date(Date.now()).toISOString() })
    await vi.advanceTimersByTimeAsync(THREE_MIN)
    expect(playAlarmChime).toHaveBeenCalledTimes(2)
  })

  it('freezes the displayed duration at the pause when votes are revealed', async () => {
    vi.setSystemTime(START + THREE_MIN + 60_000)
    const wrapper = mountTimer({ pausedAt: new Date(START + THREE_MIN).toISOString() })
    await wrapper.setProps({ phase: 'revealed' })
    expect(wrapper.get('[data-testid="timer-display"]').text()).toContain('3m 0s')
  })

  it('does not fire when the round is already past the threshold on mount', async () => {
    vi.setSystemTime(START + THREE_MIN + 10_000)
    const wrapper = mountTimer()
    await vi.advanceTimersByTimeAsync(3000)
    expect(blinking(wrapper)).toBe(false)
  })

  it('does not fire after reveal', async () => {
    vi.setSystemTime(START + THREE_MIN - 2000)
    const wrapper = mountTimer({ phase: 'revealed' })
    await vi.advanceTimersByTimeAsync(5000)
    expect(blinking(wrapper)).toBe(false)
  })

  it('lets a moderator change the room alarm from the gear and commits minutes on Enter', async () => {
    const wrapper = mountTimer()
    expect(wrapper.find('[data-testid="timer-alarm-settings"]').exists()).toBe(false)
    await wrapper.get('[data-testid="timer-alarm-toggle"]').trigger('click')
    const input = wrapper.get<HTMLInputElement>('[data-testid="timer-alarm-minutes"]')
    input.element.focus()
    input.element.addEventListener('blur', () => input.element.dispatchEvent(new Event('change')))
    await input.setValue('50')
    await input.trigger('keydown', { key: 'Enter' })
    expect(document.activeElement).not.toBe(input.element)
    expect(input.element.value).toBe('20')
    await wrapper.get('[data-testid="timer-alarm-mute"]').trigger('click')
    expect(wrapper.emitted('updateAlarm')).toEqual([[{ minutes: 20 }], [{ muted: true }]])
  })

  it('hides the alarm settings from players who are not moderators', () => {
    const wrapper = mountTimer({ canControl: false })
    expect(wrapper.find('[data-testid="timer-alarm-toggle"]').exists()).toBe(false)
  })

  it('defaults to a 5 minute alarm when the room has no setting', async () => {
    vi.setSystemTime(START + 5 * 60_000 - 500)
    const wrapper = mountTimer({ alarmMinutes: null, alarmMuted: null })
    await vi.advanceTimersByTimeAsync(1000)
    expect(blinking(wrapper)).toBe(true)
    expect(playAlarmChime).toHaveBeenCalledTimes(1)
  })
})
