import { describe, it, expect, beforeEach } from 'vitest'
import { useTimerAlarm } from '~/composables/useTimerAlarm'

describe('useTimerAlarm', () => {
  beforeEach(() => {
    localStorage.clear()
    useTimerAlarm().initAlarm()
  })

  it('defaults to 5 minutes with the chime on', () => {
    const { alarmMinutes, alarmMuted } = useTimerAlarm()
    expect(alarmMinutes.value).toBe(5)
    expect(alarmMuted.value).toBe(false)
  })

  it('persists minutes and mute state', () => {
    const { setAlarmMinutes, toggleAlarmMuted } = useTimerAlarm()
    setAlarmMinutes(7)
    toggleAlarmMuted()
    expect(JSON.parse(localStorage.getItem('sp-timer-alarm')!)).toEqual({ minutes: 7, muted: true })
  })

  it('reads stored settings on init', () => {
    localStorage.setItem('sp-timer-alarm', JSON.stringify({ minutes: 12, muted: true }))
    const { alarmMinutes, alarmMuted, initAlarm } = useTimerAlarm()
    initAlarm()
    expect(alarmMinutes.value).toBe(12)
    expect(alarmMuted.value).toBe(true)
  })

  it('falls back to defaults for corrupted storage', () => {
    localStorage.setItem('sp-timer-alarm', '{oops')
    const { alarmMinutes, alarmMuted, initAlarm } = useTimerAlarm()
    initAlarm()
    expect(alarmMinutes.value).toBe(5)
    expect(alarmMuted.value).toBe(false)
  })

  it('rounds and clamps minutes to the 3-20 range', () => {
    const { alarmMinutes, setAlarmMinutes } = useTimerAlarm()
    setAlarmMinutes(7.6)
    expect(alarmMinutes.value).toBe(8)
    setAlarmMinutes(1)
    expect(alarmMinutes.value).toBe(3)
    setAlarmMinutes(999)
    expect(alarmMinutes.value).toBe(20)
    setAlarmMinutes(Number.NaN)
    expect(alarmMinutes.value).toBe(5)
  })
})
