import { useTranslation } from 'react-i18next'
import AppModal from '~/components/AppModal'
import AppModalPaper from '~/components/AppModalPaper'
import RoleBadge from '~/components/RoleBadge'
import { useCardLabel } from '~/hooks/useCardLabel'
import type { RoundHistory } from '~/stores/types'
import { DECK_PRESETS } from '~/utils/cardDecks'
import { COHORT_COLORS, voteCohortFor } from '~/utils/resultCohorts'
import { roleTagForShields, roleTagOrder } from '~/utils/shields'

type RoundSnapshotModalProps = {
  round: RoundHistory
  shieldsMap?: Map<string, string[]>
  cohort?: string | null
  onClose: () => void
}

export default function RoundSnapshotModal({ round, shieldsMap, cohort = null, onClose }: RoundSnapshotModalProps) {
  const { t, i18n } = useTranslation()
  const cardLabel = useCardLabel()
  const dateFmt = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' })
  const deckName = round.deck_preset
    ? (DECK_PRESETS.find(p => p.id === round.deck_preset)?.name ?? round.deck_preset)
    : null
  const sortedVotes = [...round.votes]
    .filter(v => !cohort || voteCohortFor(shieldsMap, v.player_id) === cohort)
    .map(v => ({ ...v, roleTag: roleTagForShields(shieldsMap?.get(v.player_id)) }))
    .sort((a, b) => roleTagOrder(a.roleTag) - roleTagOrder(b.roleTag) || a.name.localeCompare(b.name))

  return (
    <AppModal
      labelledby="round-snapshot-modal-title"
      open
      onClose={onClose}
    >
      <AppModalPaper
        style={{ maxWidth: '420px', width: '92vw', maxHeight: '80vh', overflowY: 'auto', padding: '24px 28px 28px' }}
        onClose={onClose}
      >
        <h3
          id="round-snapshot-modal-title"
          className="flex items-center gap-2 text-mui-h2 font-bold text-primary"
        >
          {t('trends.roundSnapshotTitle')}
          {cohort && (
            <span
              className="rounded px-2 py-0.5 text-mui-caption font-semibold text-white"
              style={{ backgroundColor: COHORT_COLORS[cohort], color: cohort === 'GQA' || cohort === 'AQA' ? '#212121' : undefined }}
            >
              {cohort}
            </span>
          )}
        </h3>
        <p className="mt-1 text-mui-caption text-muted">
          {dateFmt.format(new Date(round.revealed_at))}
          {deckName && <span>{` · ${deckName}`}</span>}
        </p>
        <div className="mt-4 flex flex-col gap-1.5">
          {sortedVotes.map(v => (
            <div
              key={v.player_id}
              className="flex items-center justify-between rounded bg-elevated px-3 py-1.5 text-mui-body"
            >
              <span className="flex items-center gap-1.5">
                <span className="text-body">{v.name}</span>
                {v.roleTag && <RoleBadge tag={v.roleTag} />}
              </span>
              <span className="font-semibold text-primary">{cardLabel(v.vote)}</span>
            </div>
          ))}
          {!sortedVotes.length && (
            <p className="text-mui-body text-muted">
              {t('trends.noVotesInCohort')}
            </p>
          )}
        </div>
      </AppModalPaper>
    </AppModal>
  )
}
