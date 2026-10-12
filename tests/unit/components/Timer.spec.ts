import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import Timer from '~/components/Timer.vue'
import { useTimerAlarm } from '~/composables/useTimerAlarm'

const playAlarmChime = vi.hoisted(() => vi.fn())
vi.mock('~/composables/useTimerAlarm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/composables/useTimerAlarm')>()
  return { ...actual, playAlarmChime }
})

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  missingWarn: false,
  fallbackWarn: false,
  messages: { en: { timer: { roundDuration: 'Round duration: {duration}' } } },
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
    localStorage.clear()
    useTimerAlarm().initAlarm()
    useTimerAlarm().setAlarmMinutes(3)
    playAlarmChime.mockClear()
    vi.useFakeTimers()
  })
  afterEach(() => vi.useRealTimers())

  it('blinks the whole widget, rings and pauses once the interval elapses', async () => {
    vi.setSystemTime(START + THREE_MIN - 2000)
    const wrapper = mountTimer()
    await vi.advanceTimersByTimeAsync(1000)
    expect(blinking(wrapper)).toBe(false)
    await vi.advanceTimersByTimeAsync(1000)
    expect(blinking(wrapper)).toBe(true)
    expect(playAlarmChime).toHaveBeenCalledTimes(1)
    expect(wrapper.emitted('pause')).toHaveLength(1)
    await wrapper.get('[data-testid="timer-widget"]').trigger('animationend')
    expect(blinking(wrapper)).toBe(false)
  })

  it('stays silent when muted and leaves pausing to moderators', async () => {
    useTimerAlarm().toggleAlarmMuted()
    vi.setSystemTime(START + THREE_MIN - 500)
    const wrapper = mountTimer({ canControl: false })
    await vi.advanceTimersByTimeAsync(1000)
    expect(blinking(wrapper)).toBe(true)
    expect(playAlarmChime).not.toHaveBeenCalled()
    expect(wrapper.emitted('pause')).toBeUndefined()
  })

  it('fires again one interval after play resumes the timer', async () => {
    vi.setSystemTime(START + THREE_MIN - 500)
    const wrapper = mountTimer()
    await vi.advanceTimersByTimeAsync(1000)
    const pausedAt = new Date(Date.now()).toISOString()
    await wrapper.setProps({ pausedAt })
    await vi.advanceTimersByTimeAsync(30_000)
    await wrapper.setProps({ pausedAt: null, pausedElapsedMs: 30_000 })
    await vi.advanceTimersByTimeAsync(THREE_MIN - 2000)
    expect(playAlarmChime).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(2000)
    expect(playAlarmChime).toHaveBeenCalledTimes(2)
    expect(wrapper.emitted('pause')).toHaveLength(2)
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

  it('opens settings with the gear and commits minutes on Enter', async () => {
    const wrapper = mountTimer()
    expect(wrapper.find('[data-testid="timer-alarm-settings"]').exists()).toBe(false)
    await wrapper.get('[data-testid="timer-alarm-toggle"]').trigger('click')
    const input = wrapper.get<HTMLInputElement>('[data-testid="timer-alarm-minutes"]')
    input.element.focus()
    input.element.addEventListener('blur', () => input.element.dispatchEvent(new Event('change')))
    await input.setValue('50')
    await input.trigger('keydown', { key: 'Enter' })
    expect(document.activeElement).not.toBe(input.element)
    expect(useTimerAlarm().alarmMinutes.value).toBe(20)
    expect(input.element.value).toBe('20')
    await wrapper.get('[data-testid="timer-alarm-mute"]').trigger('click')
    expect(useTimerAlarm().alarmMuted.value).toBe(true)
  })
})
