import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { getInstanceByDom, use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import ResultsArea from '~/components/ResultsArea'
import type { ResultGroup } from '~/utils/resultCohorts'

function mountResults(props: {
  votes: Record<string, number>
  groups?: { key?: string; label: string; votes: Record<string, number> }[] | null
  disableCelebration?: boolean
}) {
  return render(<ResultsArea showNewRound={false} {...props} />).container
}

function pieCharts(container: HTMLElement) {
  return container.querySelectorAll('[data-testid="result-pie"], [data-testid="result-pie-placeholder"]')
}

beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(240)
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(240)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.doUnmock('~/components/PieChart')
})

describe('ResultsArea celebration without a qa split', () => {
  it('celebrates when every vote matches and grouped votes are absent', () => {
    expect(mountResults({ votes: { '5': 3 } }).querySelector('.celebration-layer')).not.toBeNull()
  })

  it('does not celebrate a single voter', () => {
    expect(mountResults({ votes: { '5': 1 } }).querySelector('.celebration-layer')).toBeNull()
  })

  it('does not celebrate mixed votes', () => {
    expect(mountResults({ votes: { '5': 2, '8': 1 } }).querySelector('.celebration-layer')).toBeNull()
  })

  it('respects disableCelebration for the last round view', () => {
    expect(mountResults({ votes: { '5': 3 }, disableCelebration: true }).querySelector('.celebration-layer')).toBeNull()
  })
})

describe('ResultsArea cohort circles', () => {
  it.each(['PO', 'GQA'])('celebrates a unanimous %s circle alongside mixed votes', (role) => {
    const container = mountResults({
      votes: { '3': 2, '5': 1, '8': 1 },
      groups: [{ label: role, votes: { '3': 2 } }, { label: 'DEV', votes: { '5': 1, '8': 1 } }],
    })
    expect(container.querySelector('.celebration-layer')).not.toBeNull()
  })

  it('celebrates a custom circle and preserves colliding label identities', () => {
    const error = vi.spyOn(console, 'error')
    const groups: ResultGroup[] = [{ key: 'DEV', label: 'DEV', votes: { '3': 1 } }, { key: 'custom:DEV', label: 'DEV', votes: { '5': 2 } }]
    const view = render(<ResultsArea votes={{ '3': 1, '5': 2 }} groups={groups} showNewRound={false} />)
    const first = view.container.querySelectorAll('.mui-h6')[0]!
    view.rerender(<ResultsArea votes={{ '3': 1, '5': 2 }} groups={[groups[1]!, groups[0]!]} showNewRound={false} />)
    expect(view.container.querySelectorAll('.mui-h6')[1]).toBe(first)
    expect(view.container.querySelector('.celebration-layer')).not.toBeNull()
    expect(error).not.toHaveBeenCalled()
  })

  it('does not celebrate when each role has only one vote', () => {
    const container = mountResults({
      votes: { '3': 9 },
      groups: ['DEV', 'BE', 'FE', 'SRE', 'QA', 'GQA', 'AQA', 'PO', 'SM'].map(label => ({ label, votes: { '3': 1 } })),
    })
    expect(pieCharts(container)).toHaveLength(9)
    expect(container.querySelector('.celebration-layer')).toBeNull()
  })

  it('renders one circle per cohort group with its label and average', () => {
    const container = mountResults({
      votes: { '3': 2, '5': 1, '8': 2 },
      groups: [
        { label: 'FE', votes: { '3': 2 } },
        { label: 'BE', votes: { '5': 1 } },
        { label: 'QA', votes: { '8': 2 } },
      ],
    })
    const headings = Array.from(container.querySelectorAll('.mui-h6')).map(h => h.textContent)
    expect(headings).toEqual(['FE: 3.0', 'BE: 5.0', 'QA: 8.0'])
    expect(pieCharts(container)).toHaveLength(3)
  })

  it('celebrates when any cohort is unanimous', () => {
    const container = mountResults({
      votes: { '3': 2, '5': 1, '8': 1 },
      groups: [{ label: 'FE', votes: { '3': 2 } }, { label: 'BE', votes: { '5': 1, '8': 1 } }],
    })
    expect(container.querySelector('.celebration-layer')).not.toBeNull()
  })

  it('shows no circle and no celebration when every vote is left out of the shown cohorts', () => {
    const container = mountResults({ votes: { '5': 3 }, groups: [] })
    expect(pieCharts(container)).toHaveLength(0)
    expect(container.querySelector('.celebration-layer')).toBeNull()
  })
})

describe('ResultsArea pie chart', () => {
  it('draws ECharts SVG slices even when the trends canvas renderer is registered', async () => {
    use([CanvasRenderer])
    mountResults({ votes: { '3': 1, '5': 1 } })
    const pie = await screen.findByTestId('result-pie')
    await waitFor(() => expect(pie.querySelectorAll('svg path[fill="#546e7a"], svg path[fill="#e64a19"]')).toHaveLength(2))
    expect(pie.querySelector('canvas')).toBeNull()
    expect(Array.from(pie.querySelectorAll('svg text')).map(text => text.textContent)).toEqual(['3', '5'])
    expect(pie.style.width).toBe('100%')
    expect(pie.style.aspectRatio).toBe('1 / 1')
  })

  it('draws a single full sector with its card label', async () => {
    mountResults({ votes: { '☕': 2 }, disableCelebration: true })
    const pie = await screen.findByTestId('result-pie')
    await waitFor(() => expect(pie.querySelectorAll('svg path[fill="#546e7a"]')).toHaveLength(1))
    expect(pie.querySelector('svg text')?.textContent).toBe('☕')
  })

  it('updates the existing ECharts instance and disposes it on unmount', async () => {
    const view = render(<ResultsArea showNewRound={false} votes={{ '3': 2 }} disableCelebration />)
    const pie = await screen.findByTestId('result-pie')
    const chart = getInstanceByDom(pie)
    expect(chart).toBeDefined()
    view.rerender(<ResultsArea showNewRound={false} votes={{ '8': 2 }} disableCelebration />)
    expect(getInstanceByDom(pie)).toBe(chart)
    await waitFor(() => expect(pie.querySelector('svg text')?.textContent).toBe('8'))
    view.unmount()
    expect(chart?.isDisposed()).toBe(true)
  })

  it('keeps voting bubbles and the goal clarity score outside the lazy chart', () => {
    const view = render(<ResultsArea showNewRound={false} votes={{ yes: 2, no: 1 }} activeCards={['yes', 'no']} disableCelebration />)
    expect(pieCharts(view.container)).toHaveLength(0)
    expect(view.container.querySelectorAll('.rounded-full')).toHaveLength(2)
    view.rerender(<ResultsArea showNewRound={false} votes={{ '3': 2, '5': 1 }} goalClarityScore />)
    expect(pieCharts(view.container)).toHaveLength(0)
    expect(view.container.querySelector('.rounded-full')?.textContent).toBe('3.7')
  })

  it('keeps a square placeholder and the cohort label while the chunk loads', async () => {
    vi.resetModules()
    let finishImport!: (module: typeof import('~/components/PieChart')) => void
    vi.doMock('~/components/PieChart', () => new Promise(resolve => { finishImport = resolve }))
    const { default: PendingResultsArea } = await import('~/components/ResultsArea')
    render(<PendingResultsArea showNewRound={false} votes={{ '3': 2 }} groups={[{ label: 'BE', votes: { '3': 2 } }]} />)
    const placeholder = screen.getByTestId('result-pie-placeholder')
    expect(screen.getByText('BE: 3.0')).toBeDefined()
    expect(placeholder.style.width).toBe('100%')
    expect(placeholder.style.aspectRatio).toBe('1 / 1')
    await waitFor(() => expect(finishImport).toBeDefined())
    const actual = await vi.importActual<typeof import('~/components/PieChart')>('~/components/PieChart')
    await act(async () => finishImport(actual))
    expect(await screen.findByTestId('result-pie')).toBeDefined()
    expect(screen.queryByTestId('result-pie-placeholder')).toBeNull()
  })

  it('keeps the same empty placeholder and cohort label when the chunk fails', async () => {
    vi.resetModules()
    vi.doMock('~/components/PieChart', () => { throw new Error('chunk unavailable') })
    const { default: FailedResultsArea } = await import('~/components/ResultsArea')
    render(<FailedResultsArea showNewRound={false} votes={{ '5': 2 }} groups={[{ label: 'QA', votes: { '5': 2 } }]} />)
    await act(async () => { await Promise.resolve() })
    const placeholder = await screen.findByTestId('result-pie-placeholder')
    expect(placeholder.style.width).toBe('100%')
    expect(placeholder.style.aspectRatio).toBe('1 / 1')
    expect(placeholder.childElementCount).toBe(0)
    expect(screen.getByText('QA: 5.0')).toBeDefined()
    expect(screen.queryByText(/chunk unavailable|error/i)).toBeNull()
  })
})
