import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import AppIcon from '~/components/AppIcon'
import AppTooltip from '~/components/AppTooltip'
import { Button } from '~/components/ui/button'
import type { CountdownMode } from '~/hooks/useCountdown'
import { useCardLabel } from '~/hooks/useCardLabel'
import { useRipple } from '~/hooks/useRipple'

type CardsAreaProps = {
  activeCards: string[]
  selectedVote: string | null
  isModerator: boolean
  hasVotes: boolean
  canReset: boolean
  countdownCounter: number
  countdownRunning: boolean
  pollMode: boolean
  voteQuestionMode: boolean
  pollQuestion: string | null
  hasLastRound?: boolean
  showLastRound?: boolean
  onVote: (card: string) => void
  onReveal: () => void
  onReset: () => void
  onStartCountdown: (mode: CountdownMode) => void
  onSetPollQuestion: (question: string) => void
  onStartVoteQuestion: (question: string, answers: string[]) => void
  onToggleLastRound: () => void
}

const MAX_ANSWERS = 5
const HOLD_MS = 1400

const COUNTDOWN_MODE_OPTIONS: { value: CountdownMode; icon: string; label: string }[] = [
  { value: 'silent', icon: 'ic:baseline-volume-off', label: 'cards.countdownSilent' },
  { value: 'dry', icon: 'app:timer', label: 'cards.countdownDry' },
  { value: 'wet', icon: 'app:town-hall', label: 'cards.countdownWet' },
]

export default function CardsArea({
  activeCards,
  selectedVote,
  isModerator,
  hasVotes,
  canReset,
  countdownCounter,
  countdownRunning,
  pollMode,
  voteQuestionMode,
  pollQuestion,
  hasLastRound,
  showLastRound,
  onVote,
  onReveal,
  onReset,
  onStartCountdown,
  onSetPollQuestion,
  onStartVoteQuestion,
  onToggleLastRound,
}: CardsAreaProps) {
  const { t } = useTranslation()
  const cardLabel = useCardLabel()
  const ripple = useRipple<HTMLButtonElement>()
  const canVote = !(pollMode || voteQuestionMode) || !!pollQuestion
  const [questionDraft, setQuestionDraft] = useState('')
  const [answerDrafts, setAnswerDrafts] = useState<string[]>(['', ''])
  const focusAnswer = useRef<number | null>(null)
  const answerInputs = useRef<(HTMLInputElement | null)[]>([])
  const [holdingMode, setHoldingMode] = useState<CountdownMode | null>(null)
  const holdingModeRef = useRef<CountdownMode | null>(null)
  const holdTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [revealPending, setRevealPending] = useState(false)
  const live = useRef({ countdownRunning, showLastRound, canVote, onStartCountdown })

  useEffect(() => {
    live.current = { countdownRunning, showLastRound, canVote, onStartCountdown }
  })

  const [lastPollQuestion, setLastPollQuestion] = useState(pollQuestion)
  if (lastPollQuestion !== pollQuestion) {
    setLastPollQuestion(pollQuestion)
    if (!pollQuestion) {
      setQuestionDraft('')
      setAnswerDrafts(['', ''])
    }
  }

  const [wasRunning, setWasRunning] = useState(countdownRunning)
  if (wasRunning !== countdownRunning) {
    setWasRunning(countdownRunning)
    if (wasRunning && !countdownRunning) setRevealPending(true)
  }

  useEffect(() => {
    if (focusAnswer.current === null) return
    answerInputs.current[focusAnswer.current]?.focus()
    focusAnswer.current = null
  }, [answerDrafts.length])

  useEffect(() => () => clearTimeout(holdTimeout.current), [])

  function addAnswer() {
    if (answerDrafts.length >= MAX_ANSWERS) return
    setAnswerDrafts([...answerDrafts, ''])
    focusAnswer.current = answerDrafts.length
  }

  function removeAnswer(i: number) {
    setAnswerDrafts(answerDrafts.filter((_, index) => index !== i))
    answerInputs.current.splice(i, 1)
  }

  function updateAnswer(i: number, value: string) {
    setAnswerDrafts(answerDrafts.map((answer, index) => (index === i ? value : answer)))
  }

  function submitQuestion() {
    const value = questionDraft.trim()
    if (!value) return
    onSetPollQuestion(value)
  }

  function submitVoteQuestion() {
    const question = questionDraft.trim()
    const answers = answerDrafts.map(a => a.trim()).filter(Boolean)
    if (!question || answers.length < 2) return
    onStartVoteQuestion(question, answers)
  }

  function vqCardStyle(card: string): CSSProperties | undefined {
    if (!voteQuestionMode || !pollQuestion) return undefined
    const len = card.length
    if (len <= 3) return undefined
    const rem = len <= 6 ? 1.4 : len <= 9 ? 1.0 : 0.8
    return { fontSize: `${rem}rem`, wordBreak: 'break-word', padding: '0 8px', lineHeight: '1.2', textAlign: 'center' }
  }

  function canStartCountdown(): boolean {
    const state = live.current
    return !state.countdownRunning && !state.showLastRound && state.canVote
  }

  function setHolding(mode: CountdownMode | null) {
    holdingModeRef.current = mode
    setHoldingMode(mode)
  }

  function startHold(mode: CountdownMode) {
    if (!canStartCountdown()) return
    setHolding(mode)
    clearTimeout(holdTimeout.current)
    holdTimeout.current = setTimeout(() => {
      setHolding(null)
      if (canStartCountdown()) live.current.onStartCountdown(mode)
    }, HOLD_MS)
  }

  function cancelHold(mode: CountdownMode) {
    if (holdingModeRef.current !== mode) return
    clearTimeout(holdTimeout.current)
    holdTimeout.current = undefined
    setHolding(null)
  }

  function onHoldKeyDown(event: KeyboardEvent<HTMLButtonElement>, mode: CountdownMode) {
    if (event.key === ' ') event.preventDefault()
    if ((event.key === 'Enter' || event.key === ' ') && !event.repeat) startHold(mode)
  }

  function onHoldKeyUp(event: KeyboardEvent<HTMLButtonElement>, mode: CountdownMode) {
    if (event.key === 'Enter' || event.key === ' ') cancelHold(mode)
  }

  const lastRoundDisabled = (!hasLastRound && !showLastRound) || countdownRunning
  const resetDisabled = !canReset || countdownRunning
  const modeDisabled = showLastRound || !canVote

  function pollSection() {
    if (pollQuestion) {
      return (
        <h3
          className="text-center text-mui-h2 font-bold text-primary"
          data-testid="poll-question"
        >
          {pollQuestion}
        </h3>
      )
    }
    if (voteQuestionMode && isModerator) {
      return (
        <div className="flex flex-col gap-3">
          <input
            id="poll-question"
            value={questionDraft}
            type="text"
            name="poll-question"
            className="mui-input w-full"
            placeholder={t('poll.questionPlaceholder')}
            data-testid="poll-question-input"
            onChange={event => setQuestionDraft(event.target.value)}
          />
          {answerDrafts.map((answer, i) => (
            <div
              key={i}
              className="flex items-center justify-center gap-2"
            >
              <input
                id={`poll-answer-${i}`}
                ref={(el) => { answerInputs.current[i] = el }}
                value={answer}
                type="text"
                name={`poll-answer-${i}`}
                className="mui-input w-48"
                maxLength={12}
                placeholder={t('poll.answerPlaceholder', { n: i + 1 })}
                onChange={event => updateAnswer(i, event.target.value)}
              />
              <button
                ref={ripple}
                type="button"
                className="mui-icon-btn flex-none"
                aria-label={t('poll.removeAnswer')}
                data-testid="poll-remove-answer"
                onClick={() => removeAnswer(i)}
              >
                <AppIcon
                  name="ic:baseline-close"
                  style={{ fontSize: '1.5rem' }}
                />
              </button>
            </div>
          ))}
          {answerDrafts.length < MAX_ANSWERS && (
            <Button
              ref={ripple}
              type="button"
              variant="text"
              className="flex items-center gap-1 self-center normal-case"
              data-testid="poll-add-answer"
              onClick={addAnswer}
            >
              <AppIcon
                name="ic:baseline-add"
                style={{ fontSize: '1.125rem' }}
              />
              {t('poll.addAnswer')}
            </Button>
          )}
          <div className="flex justify-center mt-5">
            <Button
              ref={ripple}
              disabled={!questionDraft.trim() || answerDrafts.filter(a => a.trim()).length < 2 || answerDrafts.some(a => !a.trim())}
              data-testid="poll-start-button"
              onClick={submitVoteQuestion}
            >
              {t('poll.startVoting')}
            </Button>
          </div>
        </div>
      )
    }
    if (!voteQuestionMode && isModerator) {
      return (
        <div className="flex flex-col gap-3">
          <input
            id="poll-question-simple"
            value={questionDraft}
            type="text"
            name="poll-question"
            className="mui-input w-full"
            placeholder={t('poll.questionPlaceholder')}
            data-testid="poll-question-input"
            onChange={event => setQuestionDraft(event.target.value)}
            onKeyUp={(event) => {
              if (event.key === 'Enter') submitQuestion()
            }}
          />
          <div className="flex justify-center mt-5">
            <Button
              ref={ripple}
              disabled={!questionDraft.trim()}
              data-testid="poll-start-button"
              onClick={submitQuestion}
            >
              {t('poll.startVoting')}
            </Button>
          </div>
        </div>
      )
    }
    return (
      <p className="text-center text-mui-body text-muted">
        {t('poll.waiting')}
      </p>
    )
  }

  return (
    <div className="flex flex-col items-center w-full rounded">
      {(pollMode || voteQuestionMode || !!pollQuestion) && !showLastRound && (
        <div className="w-full max-w-[640px] mx-auto mb-8">
          {pollSection()}
        </div>
      )}

      {!showLastRound && (
        <div className={canVote
          ? 'flex flex-wrap justify-center gap-3 sm:gap-4 max-w-[1240px] mx-auto'
          : 'flex flex-wrap justify-center gap-3 sm:gap-4 max-w-[1240px] mx-auto pointer-events-none opacity-40'}
        >
          {activeCards.map(card => (
            <div
              key={card}
              className="relative w-[100px] sm:w-[151.66px] aspect-[2/3] flex-none"
            >
              <button
                ref={ripple}
                type="button"
                className={selectedVote === card ? 'mui-card is-selected' : 'mui-card'}
                data-testid="vote-card"
                data-value={card}
                aria-pressed={selectedVote === card}
                disabled={!canVote}
                onClick={() => onVote(card)}
              >
                <span
                  className="mui-card-value"
                  style={vqCardStyle(card)}
                >
                  {voteQuestionMode && !pollQuestion ? '?' : cardLabel(card)}
                </span>
              </button>
            </div>
          ))}
        </div>
      )}

      {isModerator && (
        <div className="flex flex-wrap items-center justify-center gap-6 pt-8">
          <div className="flex items-center gap-2">
            <AppTooltip
              side="top"
              sideOffset={6}
              trigger={(
                <button
                ref={ripple}
                  className="mui-icon-btn"
                  disabled={lastRoundDisabled}
                  style={{ color: lastRoundDisabled ? 'var(--text-disabled)' : undefined }}
                  aria-label={t('cards.lastRound')}
                  aria-pressed={showLastRound ? 'true' : 'false'}
                  data-testid="last-round-button"
                  onClick={onToggleLastRound}
                >
                  <AppIcon
                    name="lucide:undo"
                    style={{ fontSize: '1.5rem', transform: showLastRound ? 'scaleX(-1)' : undefined }}
                  />
                </button>
              )}
            >
              {showLastRound ? t('cards.backToCards') : t('cards.lastRound')}
            </AppTooltip>
            <AppTooltip
              side="top"
              sideOffset={6}
              trigger={(
                <button
                ref={ripple}
                  className="mui-icon-btn"
                  disabled={resetDisabled}
                  style={{ color: resetDisabled ? 'var(--text-disabled)' : undefined }}
                  aria-label={t('cards.reset')}
                  data-testid="reset-button"
                  onClick={onReset}
                >
                  <AppIcon
                    name="ic:baseline-restart-alt"
                    style={{ fontSize: '1.5rem' }}
                  />
                </button>
              )}
            >
              {t('cards.reset')}
            </AppTooltip>
          </div>
          <div
            className="border-l border-input self-stretch"
            style={{ width: 0 }}
          />
          <div className="flex items-center gap-4">
            {!showLastRound && (
              <Button
              ref={ripple}
                disabled={!hasVotes || countdownRunning || !canVote}
                data-testid="reveal-button"
                onClick={onReveal}
              >
                {t('cards.reveal')}
              </Button>
            )}
            <div
              className={modeDisabled
                ? 'mui-icon-group flex items-center justify-center pointer-events-none opacity-50'
                : 'mui-icon-group flex items-center justify-center'}
              role="group"
              aria-label={t('cards.countdownGroupLabel')}
              data-testid="countdown-mode"
            >
              {!countdownRunning && !revealPending
                ? COUNTDOWN_MODE_OPTIONS.map(option => (
                    <AppTooltip
                      key={option.value}
                      side="top"
                      sideOffset={6}
                      trigger={(
                        <button
                ref={ripple}
                          type="button"
                          className={holdingMode === option.value ? 'mui-icon-btn hold-btn is-holding' : 'mui-icon-btn hold-btn'}
                          style={{ color: modeDisabled ? 'var(--text-disabled)' : undefined }}
                          disabled={modeDisabled}
                          data-testid="countdown-mode-option"
                          onPointerDown={() => startHold(option.value)}
                          onPointerUp={() => cancelHold(option.value)}
                          onPointerLeave={() => cancelHold(option.value)}
                          onPointerCancel={() => cancelHold(option.value)}
                          onKeyDown={event => onHoldKeyDown(event, option.value)}
                          onKeyUp={event => onHoldKeyUp(event, option.value)}
                          onBlur={() => cancelHold(option.value)}
                          onContextMenu={event => event.preventDefault()}
                        >
                          <svg
                            className="hold-ring"
                            viewBox="0 0 36 36"
                            aria-hidden="true"
                          >
                            <circle
                              className="hold-ring-fill"
                              cx="18"
                              cy="18"
                              r="17"
                            />
                          </svg>
                          <AppIcon
                            className="mui-svg-icon"
                            style={{ fontSize: '1.5rem' }}
                            name={option.icon}
                          />
                        </button>
                      )}
                    >
                      {t(option.label)}
                    </AppTooltip>
                  ))
                : (
                    <span
                      className="text-xl font-bold text-primary tabular-nums"
                      data-testid="countdown-ticker"
                    >
                      {countdownCounter}
                    </span>
                  )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
