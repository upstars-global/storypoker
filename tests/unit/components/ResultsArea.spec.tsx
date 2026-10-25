import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import ResultsArea from '~/components/ResultsArea'

function mountResults(props: {
  votes: Record<string, number>
  groups?: { label: string; votes: Record<string, number> }[] | null
  disableCelebration?: boolean
}) {
  return render(<ResultsArea showNewRound={false} {...props} />).container
}

function pieCharts(container: HTMLElement) {
  return container.querySelectorAll('svg[viewBox="0 0 100 100"]')
}

afterEach(() => cleanup())

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
  it('draws one slice per voted card and a full circle for a single card', () => {
    const split = mountResults({ votes: { '3': 1, '5': 1 } })
    expect(split.querySelectorAll('svg path')).toHaveLength(2)
    cleanup()
    const single = mountResults({ votes: { '5': 2 }, disableCelebration: true })
    expect(single.querySelectorAll('svg circle')).toHaveLength(1)
    expect(single.querySelector('svg text')?.textContent).toBe('5')
  })
})
