import { useLayoutEffect, useMemo, useRef, useState } from 'react'
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
  const [chartWidth, setChartWidth] = useState(240)

  useLayoutEffect(() => {
    const element = container.current
    if (!element || !expanded) return
    const updateWidth = () => setChartWidth(element.clientWidth)
    updateWidth()
    const observer = new ResizeObserver(updateWidth)
    observer.observe(element)
    return () => observer.disconnect()
  }, [expanded])

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
          fontSize: expanded ? chartWidth * (single ? 0.12 : 0.06) : single ? 29 : 14,
          fontWeight: single ? 400 : 600,
        },
        labelLine: { show: false },
        data: entries.map(([card, count]) => ({ name: cardLabel(card), value: count })),
      }],
    }
  }, [votes, cardLabel, expanded, chartWidth])
  useEChart(container, option, { renderer: 'svg' })
  return (
    <div
      ref={container}
      data-testid="result-pie"
      style={{ width: '100%', aspectRatio: '1' }}
    />
  )
}
