import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import PieChart from '~/components/PieChart'
import { Button } from '~/components/ui/button'
import { useCardLabel } from '~/hooks/useCardLabel'
import { createCelebrationParticles, shouldCelebrate, type CelebrationParticle } from '~/utils/resultCelebration'
import { averageOf } from '~/utils/roundStats'
import { GOAL_CLARITY_THRESHOLDS } from '~/utils/cardDecks'
import type { ResultGroup } from '~/utils/resultCohorts'

type ResultsAreaProps = {
  votes: Record<string, number>
  groups?: ResultGroup[] | null
  showNewRound: boolean
  pollQuestion?: string | null
  disableCelebration?: boolean
  showAlignment?: boolean
  activeCards?: string[]
  playerVotes?: { name: string; vote: string }[]
  goalClarityScore?: boolean
  onStartNewRound?: () => void
}

const BUBBLE_COLORS = ['#546e7a', '#e64a19', '#fbc02d', '#43a047', '#5e35b1']
const BUBBLE_MIN = 60
const BUBBLE_MAX = 200

function particleStyle(particle: CelebrationParticle): CSSProperties {
  return {
    '--start-x': `${particle.startX}vw`,
    '--start-y': `${particle.startY}vh`,
    '--vx': `${particle.vx}vw`,
    '--vy': `${particle.vy}vw`,
    '--fall': `${particle.fall}vw`,
    '--size': `${particle.size}px`,
    '--spin': `${particle.spin}deg`,
    '--delay': `${particle.delay}ms`,
    '--duration': `${particle.duration}ms`,
    '--hue': `${particle.hue}deg`,
  } as CSSProperties
}

export default function ResultsArea({
  votes,
  groups,
  showNewRound,
  pollQuestion,
  disableCelebration,
  showAlignment,
  activeCards,
  playerVotes,
  goalClarityScore,
  onStartNewRound,
}: ResultsAreaProps) {
  const { t } = useTranslation()
  const cardLabel = useCardLabel()
  const chartsEl = useRef<HTMLDivElement>(null)

  const votingBubbles = (() => {
    if (!disableCelebration || showAlignment || !activeCards?.length) return null
    const counts = activeCards.map(card => votes[card] ?? 0)
    const maxCount = Math.max(...counts, 1)
    return activeCards.map((card, i) => {
      const count = counts[i]!
      const size = BUBBLE_MIN + (BUBBLE_MAX - BUBBLE_MIN) * Math.sqrt(count / maxCount)
      return { card, count, size, color: BUBBLE_COLORS[i % BUBBLE_COLORS.length]! }
    })
  })()

  const goalClarityAverage = goalClarityScore ? averageOf(votes) : null
  const goalClarityNumber = Number(goalClarityAverage)
  const goalClarityScoreColor = !Number.isFinite(goalClarityNumber)
    ? '#546e7a'
    : goalClarityNumber > GOAL_CLARITY_THRESHOLDS.clear
      ? '#43a047'
      : goalClarityNumber < GOAL_CLARITY_THRESHOLDS.unclear ? '#e64a19' : '#fbc02d'
  const showGoalClarityHint = Number.isFinite(goalClarityNumber) && goalClarityNumber <= GOAL_CLARITY_THRESHOLDS.clear

  const circles = groups
    ? groups.map(group => ({ ...group, average: averageOf(group.votes) }))
    : [{ label: t('results.general'), votes, average: averageOf(votes) }]

  const celebrate = !disableCelebration && shouldCelebrate(votes, groups?.map(group => group.votes))
  const [particles, setParticles] = useState<CelebrationParticle[]>([])
  const celebrating = useRef(false)

  useLayoutEffect(() => {
    if (celebrate && !celebrating.current) {
      let centerX = 50
      let centerY = 50
      if (chartsEl.current) {
        const rect = chartsEl.current.getBoundingClientRect()
        centerX = ((rect.left + rect.right) / 2 / window.innerWidth) * 100
        centerY = ((rect.top + rect.bottom) / 2 / window.innerHeight) * 100
      }
      setParticles(createCelebrationParticles(undefined, undefined, centerX, centerY))
    } else if (!celebrate && celebrating.current) {
      setParticles([])
    }
    celebrating.current = celebrate
  }, [celebrate])

  function charts() {
    if (goalClarityScore) {
      return (
        <div
          ref={chartsEl}
          className="flex flex-col items-center gap-3 py-4"
        >
          <div
            className="rounded-full flex items-center justify-center text-white font-bold"
            style={{ width: '96px', height: '96px', fontSize: '2rem', backgroundColor: goalClarityScoreColor }}
          >
            {goalClarityAverage ?? '-'}
          </div>
          {showGoalClarityHint && (
            <p className="text-mui-body text-center text-muted max-w-md">
              {t('results.goalClarityHint')}
            </p>
          )}
        </div>
      )
    }
    if (votingBubbles) {
      return (
        <div
          ref={chartsEl}
          className="flex items-end justify-center gap-10 flex-wrap py-4"
        >
          {votingBubbles.map(b => (
            <div
              key={b.card}
              className="flex flex-col items-center gap-3"
            >
              <div
                className="rounded-full flex items-center justify-center transition-all duration-500"
                style={{ width: `${b.size}px`, height: `${b.size}px`, backgroundColor: b.color, flexShrink: '0' }}
              >
                <span
                  className="font-semibold text-white text-center leading-none"
                  style={{
                    fontSize: `${Math.max(Math.min(b.size * 0.22, b.size * 1.2 / Math.max(cardLabel(b.card).length, 1)), 9)}px`,
                    wordBreak: 'break-word',
                    padding: '0 8px',
                  }}
                >
                  {cardLabel(b.card)}
                </span>
              </div>
              <span className="text-primary font-medium text-base">{b.count}</span>
            </div>
          ))}
        </div>
      )
    }
    return (
      <div
        ref={chartsEl}
        className="w-full flex flex-wrap justify-center gap-8"
      >
        {circles.map(g => (
          <div
            key={g.label}
            className="flex flex-col items-center gap-2"
            style={{ flex: '0 1 240px' }}
          >
            <span className="mui-h6 text-primary">
              {g.label}
              {g.average !== null && `: ${g.average}`}
            </span>
            <PieChart votes={g.votes} />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div
      data-testid="results-area"
      className="flex flex-col items-center gap-8 w-full"
    >
      {celebrate && (
        <div
          className="celebration-layer"
          aria-hidden="true"
        >
          {particles.map((particle, index) => (
            <span
              key={index}
              className="celebration-particle"
              style={particleStyle(particle)}
            />
          ))}
        </div>
      )}
      {pollQuestion && (
        <h3
          className="text-center text-mui-h2 font-bold text-primary"
          data-testid="poll-question"
        >
          {pollQuestion}
        </h3>
      )}
      {charts()}
      {!!playerVotes?.length && (
        <div className="w-full max-w-md mx-auto">
          {playerVotes.map(pv => (
            <div
              key={pv.name}
              className="flex items-center justify-between py-1.5 border-b last:border-0"
            >
              <span className="text-base text-body">{pv.name}</span>
              <span className="text-base font-semibold text-primary">{cardLabel(pv.vote)}</span>
            </div>
          ))}
        </div>
      )}
      {showNewRound && (
        <Button
          data-testid="new-round-button"
          onClick={onStartNewRound}
        >
          {t('cards.startNewRound')}
        </Button>
      )}
    </div>
  )
}
