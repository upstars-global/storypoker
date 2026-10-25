import { useEffect, useState, type ReactElement } from 'react'
import { useTranslation } from 'react-i18next'
import AppIcon from '~/components/AppIcon'
import { AppMenu, AppMenuItem } from '~/components/AppMenu'
import AppTooltip from '~/components/AppTooltip'
import RoleBadge from '~/components/RoleBadge'
import { useCardLabel } from '~/hooks/useCardLabel'
import { useDylanAvatar } from '~/hooks/useDylanAvatar'
import { useProfilesStore } from '~/stores/profiles'
import { roleTagForShields } from '~/utils/shields'

export interface PlayerRowPlayer {
  id: string
  name: string
  is_moderator: boolean
  vote: string | null
  is_online: boolean
  user_id: string | null
  shields: string[]
  votePending: boolean
}

export interface PlayerRowProps {
  player: PlayerRowPlayer
  phase: 'voting' | 'revealed'
  currentPlayerId: string | null
  currentUserIsModerator: boolean
  currentUserIsAuthorizedModerator: boolean
  truncateVotes?: boolean
  isSpinningSlot?: boolean
  isSlotWinner?: boolean
  voteHidden?: boolean
  onEdit: (id: string) => void
  onToggleModerator: (id: string, value: boolean) => void
  onLeave: (id: string) => void
  onKick: (id: string) => void
}

const DICE_FACES = ['tabler:dice-1', 'tabler:dice-2', 'tabler:dice-3', 'tabler:dice-4', 'tabler:dice-5', 'tabler:dice-6']
const PLAYER_ICON_STYLE = { fontSize: '1.5rem', color: 'var(--icon-player-color)' }
const VOTE_STYLE = { color: 'var(--text-primary)', marginRight: 0 }
const MENU_TRIGGER_STYLE = { padding: '4px', border: 'none', boxShadow: 'none' }

function StatusIcon({ label, children }: { label: string; children: ReactElement }) {
  return (
    <AppTooltip
      side="top"
      sideOffset={6}
      describeTrigger={false}
      trigger={<span className="inline-flex">{children}</span>}
    >
      {label}
    </AppTooltip>
  )
}

export default function PlayerRow({
  player,
  phase,
  currentPlayerId,
  currentUserIsModerator,
  currentUserIsAuthorizedModerator,
  truncateVotes,
  isSpinningSlot,
  isSlotWinner,
  voteHidden,
  onEdit,
  onToggleModerator,
  onLeave,
  onKick,
}: PlayerRowProps) {
  const { t } = useTranslation()
  const cardLabel = useCardLabel()
  const { avatarSrcFor } = useDylanAvatar()
  const profile = useProfilesStore(state => (player.user_id ? state.profiles[player.user_id] ?? null : null))
  const [diceFaceIndex, setDiceFaceIndex] = useState(0)

  useEffect(() => {
    if (!isSpinningSlot) return
    const timer = setInterval(() => {
      setDiceFaceIndex(index => (index + 1) % DICE_FACES.length)
    }, 180)
    return () => clearInterval(timer)
  }, [isSpinningSlot])

  const isOwn = player.id === currentPlayerId
  const roleTag = roleTagForShields(player.shields)
  const showDice = isSpinningSlot || isSlotWinner
  const diceIcon = isSpinningSlot ? DICE_FACES[diceFaceIndex]! : 'tabler:dice-5'
  const diceLabel = t(isSpinningSlot ? 'players.spinningSlot' : 'players.slotWinner')
  const playerAvatar = avatarSrcFor(profile, player.name, !player.is_online)

  function voteLabel(vote: string) {
    const label = cardLabel(vote)
    return truncateVotes && label.length > 8 ? label.slice(0, 8) : label
  }

  function voteValue(vote: string) {
    return (
      <span
        className="text-base font-medium text-center"
        style={VOTE_STYLE}
      >
        {voteLabel(vote)}
      </span>
    )
  }

  function statusIcon(name: 'check' | 'deciding' | 'cancel' | 'offline') {
    if (name === 'check') {
      return (
        <StatusIcon label={t('players.estimateGiven')}>
          <AppIcon
            className="mui-svg-icon"
            name="ic:baseline-check-circle"
            style={PLAYER_ICON_STYLE}
            aria-label={t('players.estimateGiven')}
          />
        </StatusIcon>
      )
    }
    if (name === 'deciding') {
      return (
        <StatusIcon label={t('players.playerDeciding')}>
          <AppIcon
            className="mui-svg-icon"
            name="app:deciding"
            style={PLAYER_ICON_STYLE}
            aria-label={t('players.playerDeciding')}
          />
        </StatusIcon>
      )
    }
    if (name === 'cancel') {
      return (
        <StatusIcon label={t('players.noVote')}>
          <AppIcon
            className="mui-svg-icon"
            name="ic:baseline-cancel"
            style={PLAYER_ICON_STYLE}
            aria-label={t('players.noVote')}
          />
        </StatusIcon>
      )
    }
    return (
      <StatusIcon label={t('players.inactive')}>
        <AppIcon
          className="mui-svg-icon text-black/[0.26] dark:text-white/30"
          name="app:offline"
          style={{ fontSize: '1.5rem' }}
          aria-label={t('players.inactive')}
        />
      </StatusIcon>
    )
  }

  function statusCell() {
    if (player.is_online) {
      if (phase === 'voting') return statusIcon(player.vote !== null ? 'check' : 'deciding')
      return player.vote !== null ? voteValue(player.vote) : statusIcon('cancel')
    }
    if (phase === 'revealed' && player.vote !== null) return voteValue(player.vote)
    if (phase === 'voting' && player.vote !== null) return statusIcon('check')
    return statusIcon('offline')
  }

  return (
    <div
      data-testid="player-row"
      data-player-name={player.name}
      data-voted={String(player.vote !== null)}
      data-vote-pending={String(player.votePending)}
      className="grid items-center gap-2 rounded relative"
      style={{ gridTemplateColumns: '32px 1fr auto 36px', columnGap: '4px' }}
    >
      <AppTooltip
        side="top"
        sideOffset={6}
        trigger={(
          <img
            src={playerAvatar.src}
            alt={player.name}
            className="rounded-full"
            style={{ width: '28px', height: '28px', ...(playerAvatar.cssGrayscale ? { filter: 'grayscale(1)' } : {}) }}
          />
        )}
      >
        <span style={{ maxWidth: '240px', whiteSpace: 'normal', textAlign: 'center', display: 'block' }}>
          {t('players.avatarAuthHint')}
        </span>
      </AppTooltip>
      <div className="flex items-center gap-1.5 min-w-0">
        {roleTag && (
          <RoleBadge
            tag={roleTag}
            excluded={voteHidden}
            className="flex-none"
          />
        )}
        <span
          className={isSlotWinner ? 'truncate text-base win-blink' : 'truncate text-base'}
          style={{ color: player.is_online ? 'var(--text-primary)' : 'var(--text-muted)' }}
        >
          {player.name}
        </span>
        {player.is_moderator && (
          <AppTooltip
            side="top"
            sideOffset={6}
            describeTrigger={false}
            trigger={(
              <span className="inline-flex flex-none">
                <AppIcon
                  className="mui-svg-icon"
                  name="app:moderator"
                  style={PLAYER_ICON_STYLE}
                  aria-label={t('players.moderator')}
                />
              </span>
            )}
          >
            {t('players.moderator')}
          </AppTooltip>
        )}
        {showDice && (
          <AppTooltip
            side="top"
            sideOffset={6}
            describeTrigger={false}
            trigger={(
              <span className={isSlotWinner ? 'inline-flex flex-none win-blink' : 'inline-flex flex-none'}>
                <AppIcon
                  className="mui-svg-icon"
                  name={diceIcon}
                  style={{ fontSize: '1.125rem', color: 'var(--icon-player-color)' }}
                  aria-label={diceLabel}
                />
              </span>
            )}
          >
            {diceLabel}
          </AppTooltip>
        )}
      </div>

      {statusCell()}

      <div
        className="flex items-center justify-center"
        style={{ width: '36px', height: '36px', position: 'relative' }}
      >
        {(isOwn || currentUserIsModerator) && (
          <AppMenu
            label={t('players.menuFor', { name: player.name })}
            triggerClassName="mui-icon-btn"
            triggerStyle={MENU_TRIGGER_STYLE}
            minWidth="200px"
            sideOffset={6}
            alignOffset={-2}
            trigger={(
              <AppIcon
                className="mui-svg-icon text-muted dark:text-inverse"
                name="ic:baseline-more-vert"
                style={{ fontSize: '1.5rem' }}
              />
            )}
          >
            {isOwn
              ? (
                  <>
                    <AppMenuItem
                      onClick={(event) => {
                        event.stopPropagation()
                        onToggleModerator(player.id, !player.is_moderator)
                      }}
                    >
                      <AppIcon
                        className="mui-menu-icon"
                        name="app:moderator"
                      />
                      <span className="flex-1">{t('players.isModerator')}</span>
                      <span className="mui-switch">
                        <input
                          type="checkbox"
                          name="is-moderator"
                          checked={player.is_moderator}
                          tabIndex={-1}
                          readOnly
                        />
                        <span className="track" />
                        <span className="thumb" />
                      </span>
                    </AppMenuItem>
                    <AppMenuItem onClick={() => onEdit(player.id)}>
                      <AppIcon
                        className="mui-menu-icon"
                        name="ic:baseline-edit"
                      />
                      {t('players.edit')}
                    </AppMenuItem>
                    <AppMenuItem onClick={() => onLeave(player.id)}>
                      <AppIcon
                        className="mui-menu-icon"
                        name="app:leave-room"
                      />
                      {t('players.leaveRoom')}
                    </AppMenuItem>
                  </>
                )
              : (
                  <>
                    {currentUserIsAuthorizedModerator && (
                      <AppMenuItem onClick={() => onEdit(player.id)}>
                        <AppIcon
                          className="mui-menu-icon"
                          name="ic:baseline-edit"
                        />
                        {t('players.edit')}
                      </AppMenuItem>
                    )}
                    <AppMenuItem onClick={() => onKick(player.id)}>
                      <AppIcon
                        className="mui-menu-icon"
                        name="ic:baseline-person-remove"
                      />
                      {t('players.kickPlayer')}
                    </AppMenuItem>
                  </>
                )}
          </AppMenu>
        )}
      </div>
    </div>
  )
}
