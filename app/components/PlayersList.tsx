import { useTranslation } from 'react-i18next'
import PlayerRow, { type PlayerRowPlayer } from '~/components/PlayerRow'

type PlayersListProps = {
  players: PlayerRowPlayer[]
  phase: 'voting' | 'revealed'
  currentPlayerId: string | null
  currentUserIsModerator: boolean
  currentUserIsAuthorizedModerator: boolean
  truncateVotes?: boolean
  spinningPlayerIds?: Set<string>
  hiddenVotePlayerIds?: Set<string>
  slotWinnerId?: string | null
  onEdit: (id: string) => void
  onToggleModerator: (id: string, value: boolean) => void
  onLeave: (id: string) => void
  onKick: (id: string) => void
}

export default function PlayersList({
  players,
  phase,
  currentPlayerId,
  currentUserIsModerator,
  currentUserIsAuthorizedModerator,
  truncateVotes,
  spinningPlayerIds,
  hiddenVotePlayerIds,
  slotWinnerId,
  onEdit,
  onToggleModerator,
  onLeave,
  onKick,
}: PlayersListProps) {
  const { t } = useTranslation()
  const onlineCount = players.filter(p => p.is_online).length
  return (
    <div
      data-testid="players-list"
      className="mui-paper"
    >
      <div className="mui-paper-header flex items-center justify-center gap-2">
        <span>{t('players.title')}</span>
        <span className="text-sm font-normal">
          {onlineCount}
          {' / '}
          {players.length}
        </span>
      </div>
      <div className="pl-4 pr-2 py-2 flex flex-col">
        {players.map(player => (
          <PlayerRow
            key={player.id}
            player={player}
            phase={phase}
            currentPlayerId={currentPlayerId}
            currentUserIsModerator={currentUserIsModerator}
            currentUserIsAuthorizedModerator={currentUserIsAuthorizedModerator}
            truncateVotes={truncateVotes}
            isSpinningSlot={spinningPlayerIds?.has(player.id) ?? false}
            isSlotWinner={slotWinnerId === player.id}
            voteHidden={hiddenVotePlayerIds?.has(player.id) ?? false}
            onEdit={onEdit}
            onToggleModerator={onToggleModerator}
            onLeave={onLeave}
            onKick={onKick}
          />
        ))}
      </div>
    </div>
  )
}
