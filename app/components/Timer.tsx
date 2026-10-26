import { useEffect, useState, type CSSProperties, type FocusEvent, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import AppIcon from '~/components/AppIcon'
import AppTooltip from '~/components/AppTooltip'
import { useRipple } from '~/hooks/useRipple'
import {
  ALARM_MAX_BEEPS,
  ALARM_MAX_MINUTES,
  ALARM_MIN_MINUTES,
  ROUND_TIMER_CAP_MS,
  clampAlarmMinutes,
  playAlarmChime,
  unlockAlarmAudio,
  type AlarmSettings,
} from '~/utils/timerAlarm'

type TimerProps = {
  roundStartedAt: string
  phase: 'voting' | 'revealed'
  pausedAt: string | null
  pausedElapsedMs: number
  canControl: boolean
  alarmMinutes?: number | null
  alarmMuted?: boolean | null
  onReset: () => void
  onPause: () => void
  onResume: () => void
  onAdjust: (deltaMs: number) => void
  onSwitchWidget: () => void
  onUpdateAlarm: (settings: Partial<AlarmSettings>) => void
}

const HEADER_BUTTON_STYLE: CSSProperties = { padding: '4px', color: 'inherit' }
const UNLOCK_ALARM_EVENTS = ['pointerdown', 'keydown'] as const

function formatDuration(ms: number) {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

function alarmIndexAt(ms: number, minutes: number) {
  return Math.floor(ms / (minutes * 60_000))
}

export default function Timer({
  roundStartedAt,
  phase,
  pausedAt,
  pausedElapsedMs,
  canControl,
  alarmMinutes: alarmMinutesProp,
  alarmMuted: alarmMutedProp,
  onReset,
  onPause,
  onResume,
  onAdjust,
  onSwitchWidget,
  onUpdateAlarm,
}: TimerProps) {
  const { t } = useTranslation()
  const ripple = useRipple<HTMLButtonElement>()
  const [now, setNow] = useState(() => Date.now())
  const [revealedPhase, setRevealedPhase] = useState(phase)
  const [revealedAt, setRevealedAt] = useState<number | null>(() => (phase === 'revealed' ? Date.now() : null))
  const [alarmSettingsOpen, setAlarmSettingsOpen] = useState(false)
  const [alarmBeeps, setAlarmBeeps] = useState(0)
  const [chime, setChime] = useState<{ beeps: number } | null>(null)

  if (revealedPhase !== phase) {
    setRevealedPhase(phase)
    setRevealedAt(phase === 'revealed' ? now : null)
  }

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    for (const type of UNLOCK_ALARM_EVENTS) window.addEventListener(type, unlockAlarmAudio, { once: true })
    return () => {
      for (const type of UNLOCK_ALARM_EVENTS) window.removeEventListener(type, unlockAlarmAudio)
    }
  }, [])

  const isPaused = Boolean(pausedAt)
  const pausedAtMs = pausedAt ? new Date(pausedAt).getTime() : null
  let pivotMs = now
  if (phase === 'revealed' && revealedAt !== null) {
    pivotMs = pausedAtMs === null ? revealedAt : Math.min(revealedAt, pausedAtMs)
  } else if (pausedAtMs !== null) {
    pivotMs = pausedAtMs
  }
  const startMs = new Date(roundStartedAt).getTime()
  const elapsedMs = Math.min(ROUND_TIMER_CAP_MS, Math.max(0, pivotMs - startMs - (pausedElapsedMs ?? 0)))

  const duration = formatDuration(elapsedMs)
  let text = t('timer.roundDuration', { duration })
  if (phase === 'voting') {
    text = elapsedMs >= ROUND_TIMER_CAP_MS
      ? t('timer.roundStopped', { duration })
      : t('timer.roundStartedAgo', { duration })
  }

  const showControls = canControl && phase === 'voting'
  const alarmMinutes = clampAlarmMinutes(alarmMinutesProp)
  const alarmMuted = alarmMutedProp ?? false

  const alarmIndex = alarmIndexAt(elapsedMs, alarmMinutes)
  const [firedAlarm, setFiredAlarm] = useState({ index: alarmIndex, roundStartedAt, alarmMinutes })

  if (firedAlarm.roundStartedAt !== roundStartedAt || firedAlarm.alarmMinutes !== alarmMinutes) {
    setFiredAlarm({ index: alarmIndex, roundStartedAt, alarmMinutes })
  } else if (alarmIndex > firedAlarm.index) {
    setFiredAlarm({ ...firedAlarm, index: alarmIndex })
    if (phase === 'voting' && alarmIndex <= ALARM_MAX_BEEPS) {
      setAlarmBeeps(alarmIndex)
      if (!alarmMuted) setChime({ beeps: alarmIndex })
    }
  }

  useEffect(() => {
    if (chime) playAlarmChime(chime.beeps)
  }, [chime])

  function commitAlarmMinutes(event: FocusEvent<HTMLInputElement>) {
    const input = event.currentTarget
    const minutes = clampAlarmMinutes(Number(input.value))
    input.value = String(minutes)
    if (minutes !== alarmMinutes) onUpdateAlarm({ minutes })
  }

  function onAlarmMinutesKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return
    event.preventDefault()
    event.currentTarget.blur()
  }

  function controlButton(label: string, icon: string, onClick: () => void) {
    return (
      <AppTooltip
        side="top"
        sideOffset={6}
        trigger={(
          <button
            ref={ripple}
            type="button"
            className="mui-icon-btn text-muted dark:text-inverse"
            aria-label={label}
            onClick={onClick}
          >
            <AppIcon
              className="mui-svg-icon"
              name={icon}
              style={{ fontSize: '1.5rem' }}
            />
          </button>
        )}
      >
        {label}
      </AppTooltip>
    )
  }

  return (
    <div
      className={alarmBeeps > 0 ? 'mui-paper timer-alarm-blink' : 'mui-paper'}
      style={alarmBeeps > 0 ? ({ '--alarm-blinks': alarmBeeps } as CSSProperties) : undefined}
      data-testid="timer-widget"
      onAnimationEnd={(event) => {
        if (event.target === event.currentTarget) setAlarmBeeps(0)
      }}
    >
      <div className="mui-paper-header justify-center relative">
        {canControl && (
          <div className="absolute left-1.5 top-1/2 -translate-y-1/2">
            <AppTooltip
              side="top"
              sideOffset={6}
              trigger={(
                <button
                  ref={ripple}
                  type="button"
                  className="mui-icon-btn"
                  style={HEADER_BUTTON_STYLE}
                  aria-label={t('timer.alarmSettings')}
                  aria-expanded={alarmSettingsOpen}
                  data-testid="timer-alarm-toggle"
                  onClick={() => setAlarmSettingsOpen(open => !open)}
                >
                  <AppIcon
                    className="mui-svg-icon"
                    name="ic:baseline-settings"
                    style={{ fontSize: '1.25rem' }}
                  />
                </button>
              )}
            >
              {t('timer.alarmSettings')}
            </AppTooltip>
          </div>
        )}
        <span>{t('timer.title')}</span>
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
          <AppTooltip
            side="top"
            sideOffset={6}
            trigger={(
              <button
                ref={ripple}
                type="button"
                className="mui-icon-btn"
                style={HEADER_BUTTON_STYLE}
                aria-label={t('slot.switchToSlot')}
                data-testid="widget-toggle-slot"
                onClick={onSwitchWidget}
              >
                <AppIcon
                  className="mui-svg-icon"
                  name="ic:baseline-casino"
                  style={{ fontSize: '1.25rem' }}
                />
              </button>
            )}
          >
            {t('slot.switchToSlot')}
          </AppTooltip>
        </div>
      </div>
      {canControl && alarmSettingsOpen && (
        <div
          className="flex items-center gap-2 px-4 pt-3 text-body"
          data-testid="timer-alarm-settings"
        >
          <label
            htmlFor="timer-alarm-minutes"
            className="mui-body"
          >
            {t('timer.alarmAfter')}
          </label>
          <input
            key={alarmMinutes}
            id="timer-alarm-minutes"
            type="number"
            min={ALARM_MIN_MINUTES}
            max={ALARM_MAX_MINUTES}
            step="1"
            className="mui-input"
            style={{ width: '72px' }}
            defaultValue={alarmMinutes}
            data-testid="timer-alarm-minutes"
            onBlur={commitAlarmMinutes}
            onKeyDown={onAlarmMinutesKeyDown}
          />
          <span className="mui-body">{t('timer.minutesShort')}</span>
          <AppTooltip
            side="top"
            sideOffset={6}
            trigger={(
              <button
                ref={ripple}
                type="button"
                className="mui-icon-btn text-muted dark:text-inverse"
                aria-label={t('timer.alarmSound')}
                aria-pressed={!alarmMuted}
                data-testid="timer-alarm-mute"
                onClick={() => onUpdateAlarm({ muted: !alarmMuted })}
              >
                <AppIcon
                  className="mui-svg-icon"
                  name={alarmMuted ? 'ic:baseline-notifications-off' : 'ic:baseline-notifications-active'}
                  style={{ fontSize: '1.5rem' }}
                />
              </button>
            )}
          >
            {t('timer.alarmSound')}
          </AppTooltip>
        </div>
      )}
      <p
        className="mui-body px-4 py-3 text-body"
        data-testid="timer-display"
      >
        {text}
      </p>
      {showControls && (
        <div className="timer-controls flex justify-between px-4 pb-3">
          {controlButton(t('timer.minus30'), 'ic:baseline-fast-rewind', () => onAdjust(-30000))}
          {controlButton(t('timer.reset'), 'ic:baseline-stop', onReset)}
          {isPaused
            ? controlButton(t('timer.continue'), 'ic:baseline-play-arrow', onResume)
            : controlButton(t('timer.pause'), 'ic:baseline-pause', onPause)}
          {controlButton(t('timer.plus30'), 'ic:baseline-fast-forward', () => onAdjust(30000))}
        </div>
      )}
    </div>
  )
}
