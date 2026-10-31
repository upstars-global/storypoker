import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import '~/i18n'
import AlignmentTrendsModal from '~/components/AlignmentTrendsModal'
import { usePlayersStore } from '~/stores/players'
import { useRoomStore } from '~/stores/room'
import type { Player, RoundHistory } from '~/stores/types'
import { COHORT_COLORS } from '~/utils/resultCohorts'
import { shieldForRoleTag } from '~/utils/shields'
import { resetStores } from '../../support/helpers/resetStores'
import { colorContrast } from '../../support/helpers/colorContrast'

const chart = vi.hoisted(() => ({
  setOption: vi.fn(),
  dispatchAction: vi.fn(),
  resize: vi.fn(),
  dispose: vi.fn(),
}))

vi.mock('echarts/core', () => ({ init: vi.fn(() => chart), use: vi.fn() }))

const roles = ['DEV', 'BE', 'FE', 'SRE', 'QA', 'GQA', 'AQA', 'PO', 'SM']
const now = '2026-10-31T12:00:00Z'

interface ChartOption {
  series: { name: string; data: (number | null)[]; lineStyle?: { color: string }; itemStyle?: { color: string } }[]
  tooltip: { formatter: (point: { dataIndex: number; seriesName: string; value: number | null }) => string }
}

function latestOption(): ChartOption {
  return chart.setOption.mock.lastCall![0] as ChartOption
}

function round(index: number, votes: [string, string][], activeCards = ['1', '2', '3', '5', '8', '13']): RoundHistory {
  const date = `2026-10-${String(20 + index).padStart(2, '0')}T12:00:00Z`
  return {
    id: `round-${index}`,
    room_id: 'room',
    started_at: date,
    revealed_at: date,
    created_at: date,
    active_cards: activeCards,
    deck_preset: 'scrum',
    votes: votes.map(([name, vote]) => ({ player_id: name, name, vote })),
  }
}

function setPlayers() {
  const visiblePlayers: Player[] = roles.flatMap(role => [1, 2].map(index => ({
    id: `${role}-${index}`,
    room_id: 'room',
    name: `${role}-${index}`,
    shields: [shieldForRoleTag(role)],
    is_moderator: false,
    vote: null,
    user_id: null,
    created_at: now,
    left_at: null,
  })))
  usePlayersStore.setState({ visiblePlayers })
}

async function mount(rounds: RoundHistory[]) {
  useRoomStore.setState({ fetchHistory: vi.fn().mockResolvedValue(rounds) })
  render(<AlignmentTrendsModal onClose={vi.fn()} />)
  await waitFor(() => expect(chart.setOption).toHaveBeenCalled())
}

function card(label: string) {
  return within(screen.getByText(label).parentElement!)
}

beforeEach(async () => {
  await resetStores()
  vi.clearAllMocks()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(now))
  setPlayers()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  document.body.innerHTML = ''
})

describe('AlignmentTrendsModal estimator scores', () => {
  it('uses the estimator pool for current and average, excluding PO scores', async () => {
    await mount([
      round(0, [['BE-1', '1'], ['BE-2', '3'], ['PO-1', '13'], ['PO-2', '13']]),
      round(1, [['BE-1', '3'], ['BE-2', '3'], ['PO-1', '13'], ['PO-2', '1']]),
    ])
    expect(card('Поточний бал').getByText('100')).toBeTruthy()
    expect(card('Середній бал').getByText('80')).toBeTruthy()
  })

  it.each([
    { name: 'up', scores: [60, 60, 80, 100], direction: 'Зростає', pct: '50', average: 75 },
    { name: 'down', scores: [100, 80, 60, 60], direction: 'Знижується', pct: '33.3', average: 75 },
    { name: 'stable within one percent', scores: [100, 100, 99, 100], direction: 'Стабільно', pct: '0.5', average: 100 },
    { name: 'null gap excluded from halves', scores: [60, 60, null, 80, 100], direction: 'Зростає', pct: '50', average: 75 },
    { name: 'fewer than four scores', scores: [60, null, 80, 100], direction: null, pct: null, average: 80 },
  ])('preserves the trend formula: $name', async ({ scores, direction, pct, average }) => {
    const activeCards = Array.from({ length: 101 }, (_, index) => String(index))
    await mount(scores.map((score, index) => round(index, [
      ['BE-1', '0'],
      ['FE-1', score === null ? '?' : String(100 - score)],
      ['PO-1', '100'],
      ['PO-2', '100'],
    ], activeCards)))
    expect(card('Поточний бал').getByText(String(scores.filter(score => score !== null).at(-1)))).toBeTruthy()
    expect(card('Середній бал').getByText(String(average))).toBeTruthy()
    const trend = card('Тренд')
    if (direction) {
      expect(trend.getByText(direction)).toBeTruthy()
      expect(trend.getByText(`${pct}% vs попередній період`)).toBeTruthy()
    } else {
      expect(trend.getByText('-')).toBeTruthy()
      expect(trend.queryByText(/% vs/)).toBeNull()
    }
  })
})

describe('AlignmentTrendsModal role lines and details', () => {
  function allRoleRounds() {
    const votes: [string, string][] = roles.flatMap(role => [[`${role}-1`, '3'], [`${role}-2`, '3']] as [string, string][])
    return [round(0, votes), round(1, votes)]
  }

  it('renders all nine colored lines and one toggle per role, independently of room chips', async () => {
    useRoomStore.setState({ roomState: { ...useRoomStore.getState().roomState!, result_cohorts: [] } })
    await mount(allRoleRounds())
    expect(latestOption().series.map(series => series.name)).toEqual([...roles, '__refLines'])
    for (const role of roles) {
      const series = latestOption().series.find(item => item.name === role)!
      expect(series.data).toEqual([100, 100])
      expect(series.lineStyle?.color).toBe(COHORT_COLORS[role])
      expect(series.itemStyle?.color).toBe(COHORT_COLORS[role])
      const buttons = screen.getAllByRole('button', { name: role })
      expect(buttons).toHaveLength(1)
      expect(buttons[0]!.getAttribute('aria-pressed')).toBe('true')
      fireEvent.click(buttons[0]!)
      expect(buttons[0]!.getAttribute('aria-pressed')).toBe('false')
      expect(latestOption().series.some(item => item.name === role)).toBe(false)
      fireEvent.click(buttons[0]!)
      expect(latestOption().series.some(item => item.name === role)).toBe(true)
    }
    expect(latestOption().series.find(item => item.name === 'GQA')!.itemStyle?.color).toBe('#ff7043')
    expect(latestOption().series.find(item => item.name === 'AQA')!.itemStyle?.color).toBe('#fdd835')
  })

  it.each(roles.map(role => [role, COHORT_COLORS[role]!]))(
    'opens the real %s snapshot from the chart tooltip and filters other roles',
    async (role, color) => {
      await mount(allRoleRounds())
      const tooltip = document.createElement('div')
      tooltip.innerHTML = latestOption().tooltip.formatter({ dataIndex: 0, seriesName: role, value: 100 })
      document.body.append(tooltip)
      const details = tooltip.querySelector<HTMLElement>('[data-view-details]')!
      expect(details.dataset.cohort).toBe(role)
      fireEvent.click(details)
      const title = await screen.findByRole('heading', { name: `Голосування раунду ${role}` })
      const snapshot = within(title.closest('dialog')!)
      expect(snapshot.getByText(`${role}-1`)).toBeTruthy()
      expect(snapshot.getByText(`${role}-2`)).toBeTruthy()
      for (const other of roles.filter(item => item !== role)) {
        expect(snapshot.queryByText(`${other}-1`)).toBeNull()
        expect(snapshot.queryByText(`${other}-2`)).toBeNull()
      }
      expect(within(title).getByText(role).style.backgroundColor).toBe(color)
      const badge = within(title).getByText(role)
      expect(colorContrast(badge.style.color || '#fff', badge.style.backgroundColor), role).toBeGreaterThanOrEqual(4.5)
      expect(chart.dispatchAction).toHaveBeenCalledWith({ type: 'hideTip' })
    },
  )
})
