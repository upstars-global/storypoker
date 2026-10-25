import { useTranslation } from 'react-i18next'
import AppTooltip from '~/components/AppTooltip'
import { useRipple } from '~/hooks/useRipple'

type RoleBadgeProps = {
  tag: string
  interactive?: boolean
  selected?: boolean
  excluded?: boolean
  className?: string
  onSelect?: () => void
}

export default function RoleBadge({ tag, interactive, selected, excluded, className, onSelect }: RoleBadgeProps) {
  const { t } = useTranslation()
  const ripple = useRipple<HTMLButtonElement>()
  const classes = ['mui-role-tag']
  if (interactive) classes.push('is-interactive')
  if (selected) classes.push('is-selected')
  if (excluded) classes.push('is-excluded')
  const badgeClass = classes.join(' ')
  const trigger = interactive
    ? (
        <button
          ref={ripple}
          type="button"
          className={badgeClass}
          data-excluded={excluded || undefined}
          aria-pressed={selected}
          onClick={onSelect}
        >
          {tag}
        </button>
      )
    : (
        <span
          className={badgeClass}
          data-excluded={excluded || undefined}
        >
          {tag}
        </span>
      )
  return (
    <AppTooltip
      side="top"
      sideOffset={6}
      className={className}
      trigger={trigger}
    >
      {t(`players.roleNames.${tag}`, tag)}
      {excluded && ` · ${t('players.voteHiddenInResults')}`}
    </AppTooltip>
  )
}
