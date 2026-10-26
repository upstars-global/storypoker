import { useEffect, useRef, type RefObject } from 'react'
import { init, type EChartsCoreOption, type EChartsType } from 'echarts/core'

export function useEChart(container: RefObject<HTMLElement | null>, option: EChartsCoreOption): RefObject<EChartsType | null> {
  const chart = useRef<EChartsType | null>(null)

  useEffect(() => {
    const el = container.current
    if (!el) return
    const instance = init(el)
    chart.current = instance
    let lastSize = `${el.offsetWidth}x${el.offsetHeight}`
    const observer = new ResizeObserver(() => {
      const size = `${el.offsetWidth}x${el.offsetHeight}`
      if (size === lastSize) return
      lastSize = size
      instance.resize()
    })
    observer.observe(el)
    return () => {
      observer.disconnect()
      instance.dispose()
      chart.current = null
    }
  }, [container])

  useEffect(() => {
    chart.current?.setOption(option, { notMerge: true })
  }, [option])

  return chart
}
