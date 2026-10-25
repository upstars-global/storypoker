import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import AppIcon from '~/components/AppIcon'
import AppTooltip from '~/components/AppTooltip'
import { Button } from '~/components/ui/button'
import { useRipple } from '~/hooks/useRipple'
import { soundVolumeStore } from '~/hooks/useSoundVolume'
import { buildReelStrip, isJackpot, spinReels } from '~/utils/slotMachine'

type SlotMachineProps = {
  spinsLeft: number
  canSpin: boolean
  onWin: () => void
  onSpin: () => void
  onSpinEnd: () => void
  onSwitchWidget: () => void
}

const CELL_PX = 56
const REEL_DURATIONS_MS = [1100, 1700, 2300] as const
const REEL_EASING_CSS = 'cubic-bezier(0.22, 0.9, 0.3, 1)'
const INITIAL_SYMBOL = 'tabler:play-card-7'
const IDLE_TRANSITIONS = ['none', 'none', 'none']
const IDLE_OFFSETS = [0, 0, 0]

function cubicBezierEasing(p1x: number, p1y: number, p2x: number, p2y: number) {
  const a = (a1: number, a2: number) => 1 - 3 * a2 + 3 * a1
  const b = (a1: number, a2: number) => 3 * a2 - 6 * a1
  const c = (a1: number) => 3 * a1
  const bezier = (t: number, a1: number, a2: number) => ((a(a1, a2) * t + b(a1, a2)) * t + c(a1)) * t
  const slope = (t: number, a1: number, a2: number) => 3 * a(a1, a2) * t * t + 2 * b(a1, a2) * t + c(a1)
  return (x: number) => {
    if (x <= 0) return 0
    if (x >= 1) return 1
    let t = x
    for (let i = 0; i < 8; i++) {
      const currentSlope = slope(t, p1x, p2x)
      if (Math.abs(currentSlope) < 1e-6) break
      t -= (bezier(t, p1x, p2x) - x) / currentSlope
    }
    return bezier(t, p1y, p2y)
  }
}

const reelEasing = cubicBezierEasing(0.22, 0.9, 0.3, 1)

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export default function SlotMachine({ spinsLeft, canSpin, onWin, onSpin, onSpinEnd, onSwitchWidget }: SlotMachineProps) {
  const { t } = useTranslation()
  const ripple = useRipple<HTMLButtonElement>()
  const [strips, setStrips] = useState<string[][]>(() => [[INITIAL_SYMBOL], [INITIAL_SYMBOL], [INITIAL_SYMBOL]])
  const [offsets, setOffsets] = useState<number[]>(IDLE_OFFSETS)
  const [transitions, setTransitions] = useState<string[]>(IDLE_TRANSITIONS)
  const [spinning, setSpinning] = useState(false)
  const [jammed, setJammed] = useState(false)
  const [showVoteFirstHint, setShowVoteFirstHint] = useState(false)
  const reels = useRef<string[]>([INITIAL_SYMBOL, INITIAL_SYMBOL, INITIAL_SYMBOL])
  const spinningRef = useRef(false)
  const jammedRef = useRef(false)
  const finishTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const jamTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const hintTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const tickRaf = useRef<number | undefined>(undefined)
  const audioCtx = useRef<AudioContext | undefined>(undefined)
  const live = useRef({ onWin, onSpinEnd })

  useEffect(() => {
    live.current = { onWin, onSpinEnd }
  })

  useEffect(() => () => {
    clearTimeout(finishTimer.current)
    clearTimeout(jamTimer.current)
    clearTimeout(hintTimer.current)
    if (tickRaf.current !== undefined) cancelAnimationFrame(tickRaf.current)
  }, [])

  function playTick() {
    const volume = soundVolumeStore.getState().volume
    if (volume === 0) return
    audioCtx.current ??= new AudioContext()
    const ctx = audioCtx.current
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.value = 1400
    gain.gain.setValueAtTime(0.045 * volume, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.025)
    osc.connect(gain).connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.03)
  }

  function startTickLoop(totalSteps: number[]) {
    const startTime = performance.now()
    const lastCell = [0, 0, 0]
    const lastCellTickTime = [0, 0, 0]
    const lastReelIndex = totalSteps.length - 1
    let finalLeadTickDone = false
    function frame(now: number) {
      let anyActive = false
      for (let i = 0; i < 3; i++) {
        const duration = REEL_DURATIONS_MS[i]!
        const elapsed = now - startTime
        if (elapsed >= duration) {
          if (i === lastReelIndex) playTick()
          continue
        }
        anyActive = true
        const progress = reelEasing(Math.min(elapsed / duration, 1))
        const cell = Math.floor(progress * totalSteps[i]!)
        if (cell > lastCell[i]!) {
          for (let c = lastCell[i]! + 1; c <= cell; c++) playTick()
          lastCell[i] = cell
          lastCellTickTime[i] = elapsed
        }
        if (i === lastReelIndex && !finalLeadTickDone) {
          const leadPoint = lastCellTickTime[i]! + (duration - lastCellTickTime[i]!) * 0.35
          if (elapsed >= leadPoint) {
            playTick()
            finalLeadTickDone = true
          }
        }
      }
      tickRaf.current = anyActive ? requestAnimationFrame(frame) : undefined
    }
    tickRaf.current = requestAnimationFrame(frame)
  }

  function triggerJam() {
    if (jammedRef.current) return
    jammedRef.current = true
    setJammed(true)
    clearTimeout(jamTimer.current)
    jamTimer.current = setTimeout(() => {
      jammedRef.current = false
      setJammed(false)
    }, 400)

    setShowVoteFirstHint(true)
    clearTimeout(hintTimer.current)
    hintTimer.current = setTimeout(() => setShowVoteFirstHint(false), 1500)
  }

  function finishSpin(targets: string[]) {
    reels.current = [...targets]
    setStrips(targets.map(target => [target]))
    setTransitions(IDLE_TRANSITIONS)
    setOffsets(IDLE_OFFSETS)
    spinningRef.current = false
    setSpinning(false)
    live.current.onSpinEnd()
    if (isJackpot(targets)) live.current.onWin()
  }

  function spin() {
    if (spinningRef.current || spinsLeft <= 0) return
    if (!canSpin) {
      triggerJam()
      return
    }
    onSpin()
    spinningRef.current = true
    setSpinning(true)
    if (tickRaf.current !== undefined) cancelAnimationFrame(tickRaf.current)
    const targets = spinReels()
    if (prefersReducedMotion()) {
      reels.current = [...targets]
      setStrips(targets.map(target => [target]))
      finishTimer.current = setTimeout(() => finishSpin(targets), 300)
      return
    }
    const nextStrips = targets.map((target, i) => [reels.current[i]!, ...buildReelStrip(10 + i * 6), target])
    setStrips(nextStrips)
    setTransitions(IDLE_TRANSITIONS)
    setOffsets(IDLE_OFFSETS)
    requestAnimationFrame(() => requestAnimationFrame(() => {
      setTransitions(REEL_DURATIONS_MS.map(d => `transform ${d}ms ${REEL_EASING_CSS}`))
      setOffsets(nextStrips.map(strip => -(strip.length - 1) * CELL_PX))
      startTickLoop(nextStrips.map(strip => strip.length - 1))
    }))
    finishTimer.current = setTimeout(() => finishSpin(targets), REEL_DURATIONS_MS[2] + 150)
  }

  let status = t('slot.spinsLeft', { n: spinsLeft })
  if (spinsLeft <= 0) status = t('slot.noSpinsLeft')
  else if (showVoteFirstHint) status = t('slot.voteFirst')

  return (
    <div
      className="mui-paper"
      data-testid="slot-machine"
    >
      <div className="mui-paper-header justify-center relative">
        <span>{t('slot.title')}</span>
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
          <AppTooltip
            side="top"
            sideOffset={6}
            trigger={(
              <button
                ref={ripple}
                type="button"
                className="mui-icon-btn"
                style={{ padding: '4px', color: 'inherit' }}
                aria-label={t('slot.switchToTimer')}
                data-testid="widget-toggle-timer"
                onClick={onSwitchWidget}
              >
                <AppIcon
                  className="mui-svg-icon"
                  name="ic:baseline-timer"
                  style={{ fontSize: '1.25rem' }}
                />
              </button>
            )}
          >
            {t('slot.switchToTimer')}
          </AppTooltip>
        </div>
      </div>
      <div className="flex flex-col items-center gap-3 px-4 py-4">
        <div className={jammed ? 'slot-window is-jammed' : 'slot-window'}>
          {strips.map((strip, i) => (
            <div
              key={i}
              className="slot-reel"
              data-testid="slot-reel"
            >
              <div
                className="slot-strip"
                style={{ transform: `translateY(${offsets[i]}px)`, transition: transitions[i] }}
              >
                {strip.map((symbol, j) => (
                  <span
                    key={j}
                    className="slot-cell"
                  >
                    <AppIcon
                      className="mui-svg-icon"
                      name={symbol}
                    />
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <Button
          ref={ripple}
          size="sm"
          className="w-full"
          style={{ maxWidth: '200px' }}
          disabled={spinning || spinsLeft <= 0}
          data-testid="slot-spin-button"
          onClick={spin}
        >
          {spinning ? '…' : t('slot.spin')}
        </Button>
        <span
          className="text-mui-caption text-muted"
          data-testid="slot-spins-left"
        >
          {status}
        </span>
      </div>
    </div>
  )
}
