import { useTranslation } from 'react-i18next'
import RoleBadge from '~/components/RoleBadge'
import { PLAYER_ROLE_GROUPS } from '~/utils/shields'

const ROLE_TAG_GROUPS = PLAYER_ROLE_GROUPS.map(group => group.map(r => r.tag))

type RolePickerProps = {
  value: string
  onChange: (tag: string) => void
}

export default function RolePicker({ value, onChange }: RolePickerProps) {
  const { t } = useTranslation()
  return (
    <section>
      <h3 className="text-mui-caption font-semibold uppercase tracking-wide text-muted mb-2">
        {t('players.roleLabel')}
      </h3>
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {ROLE_TAG_GROUPS.map((group, i) => (
          <div
            key={i}
            className="flex flex-wrap gap-2"
          >
            {group.map(opt => (
              <RoleBadge
                key={opt}
                tag={opt}
                interactive
                selected={value === opt}
                onSelect={() => onChange(value === opt ? '' : opt)}
              />
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}
