import { useMemo } from 'react'
import { useCardLabel } from '~/hooks/useCardLabel'

const COLORS = ['#546e7a', '#e64a19', '#fbc02d', '#388e3c', '#7b1fa2', '#0288d1', '#00796b', '#f57c00']

type Segment = { d: string; color: string; label: string; lx: number; ly: number }

function pieData(votes: Record<string, number>): { segments: Segment[]; single: { label: string; color: string } | null } {
  const entries = Object.entries(votes).filter(([, count]) => count > 0)
  const total = entries.reduce((s, [, c]) => s + c, 0)
  if (total === 0) return { segments: [], single: null }

  const firstEntry = entries[0]
  if (entries.length === 1 && firstEntry) {
    return { segments: [], single: { label: firstEntry[0], color: COLORS[0]! } }
  }

  const cx = 50, cy = 50, r = 40
  let angle = -Math.PI / 2
  const segments = entries.map(([label, count], i) => {
    const slice = (count / total) * 2 * Math.PI
    const x1 = cx + r * Math.cos(angle)
    const y1 = cy + r * Math.sin(angle)
    angle += slice
    const x2 = cx + r * Math.cos(angle)
    const y2 = cy + r * Math.sin(angle)
    const largeArc = slice > Math.PI ? 1 : 0
    const midAngle = angle - slice / 2
    return {
      d: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`,
      color: COLORS[i % COLORS.length]!,
      label,
      lx: cx + r * 0.6 * Math.cos(midAngle),
      ly: cy + r * 0.6 * Math.sin(midAngle),
    }
  })
  return { segments, single: null }
}

export default function PieChart({ votes }: { votes: Record<string, number> }) {
  const cardLabel = useCardLabel()
  const data = useMemo(() => pieData(votes), [votes])
  return (
    <svg
      viewBox="0 0 100 100"
      className="block mx-auto"
      style={{ width: '100%', maxWidth: '500px' }}
    >
      {data.single
        ? (
            <>
              <circle
                cx="50"
                cy="50"
                r="40"
                fill={data.single.color}
              />
              <text
                x="50"
                y="50"
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="12"
                fill="white"
                fontWeight="400"
              >
                {cardLabel(data.single.label)}
              </text>
            </>
          )
        : (
            <>
              {data.segments.map(seg => (
                <path
                  key={seg.label}
                  d={seg.d}
                  fill={seg.color}
                />
              ))}
              {data.segments.map(seg => (
                <text
                  key={`label-${seg.label}`}
                  x={seg.lx}
                  y={seg.ly}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="6"
                  fill="white"
                  fontWeight="600"
                >
                  {cardLabel(seg.label)}
                </text>
              ))}
            </>
          )}
    </svg>
  )
}
