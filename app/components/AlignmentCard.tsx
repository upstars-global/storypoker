import { useTranslation } from 'react-i18next'

type AlignmentCardProps = {
  blocks: { key?: string; label: string; value: number }[]
}

function alignmentColor(a: number): string {
  if (a >= 80) return '#43a047'
  if (a >= 40) return '#fbc02d'
  return '#e64a19'
}

export default function AlignmentCard({ blocks }: AlignmentCardProps) {
  const { t } = useTranslation()
  return (
    <div
      data-testid="alignment-card"
      className="mui-paper"
    >
      <div className="mui-paper-header flex items-center justify-center">
        {t('results.alignment')}
      </div>
      <div className="px-4 py-3 flex flex-col gap-2">
        {blocks.map(b => (
          <div
            key={b.key ?? b.label}
            className="flex min-w-0 items-center justify-between gap-3"
          >
            <span className="text-mui-body text-body min-w-0" style={{ overflowWrap: 'anywhere' }}>{b.label}</span>
            <span className="flex shrink-0 items-center gap-2">
              <span
                className="inline-block rounded-full"
                style={{ width: '10px', height: '10px', backgroundColor: alignmentColor(b.value) }}
              />
              <span className="text-mui-body font-semibold text-primary">{b.value}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
