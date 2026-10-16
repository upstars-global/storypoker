import { describe, it, expect } from 'vitest'
import { clampAlarmMinutes } from '~/utils/timerAlarm'

describe('clampAlarmMinutes', () => {
  it('defaults to 5 minutes when the room has no value yet', () => {
    expect(clampAlarmMinutes(null)).toBe(5)
    expect(clampAlarmMinutes(undefined)).toBe(5)
    expect(clampAlarmMinutes(Number.NaN)).toBe(5)
  })

  it('rounds and clamps minutes to the 3-20 range', () => {
    expect(clampAlarmMinutes(7.6)).toBe(8)
    expect(clampAlarmMinutes(1)).toBe(3)
    expect(clampAlarmMinutes(999)).toBe(20)
  })
})
