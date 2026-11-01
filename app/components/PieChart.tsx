import { useMemo, useRef } from 'react'
import { use as registerCharts, type ComposeOption } from 'echarts/core'
import { PieChart as EChartsPieChart, type PieSeriesOption } from 'echarts/charts'
import { SVGRenderer } from 'echarts/renderers'
import { useCardLabel } from '~/hooks/useCardLabel'
import { useEChart } from '~/hooks/useEChart'

registerCharts([EChartsPieChart, SVGRenderer])

const COLORS = ['#546e7a', '#e64a19', '#fbc02d', '#388e3c', '#7b1fa2', '#0288d1', '#00796b', '#f57c00']

export default function PieChart({ votes, expanded = false }: { votes: Record<string, number>; expanded?: boolean }) {
  const cardLabel = useCardLabel()
  const container = useRef<HTMLDivElement>(null)
  const option = useMemo<ComposeOption<PieSeriesOption>>(() => {
    const entries = Object.entries(votes).filter(([, count]) => count > 0)
    const single = entries.length === 1
    return {
      animation: false,
      color: COLORS,
      series: [{
        type: 'pie',
        radius: expanded && single ? '98%' : '80%',
        silent: true,
        label: {
          position: single ? 'center' : 'inside',
          formatter: '{b}',
          color: '#fff',
          fontFamily: 'Roboto, sans-serif',
          fontSize: single ? 29 : 14,
          fontWeight: single ? 400 : 600,
        },
        labelLine: { show: false },
        data: entries.map(([card, count]) => ({ name: cardLabel(card), value: count })),
      }],
    }
  }, [votes, cardLabel, expanded])
  useEChart(container, option, { renderer: 'svg' })
  return (
    <div
      ref={container}
      data-testid="result-pie"
      style={{ width: '100%', aspectRatio: '1' }}
    />
  )
}
