import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import AppModal from '~/components/AppModal'
import AppModalPaper from '~/components/AppModalPaper'
import RolePicker from '~/components/RolePicker'
import { Button } from '~/components/ui/button'
import { useRipple } from '~/hooks/useRipple'
import { roleTagForShields, shieldForRoleTag } from '~/utils/shields'

export type PlayerEditPayload = { name: string; shields: string[] }

type PlayerEditModalProps = {
  name: string
  shields: string[]
  onSave: (payload: PlayerEditPayload) => void
  onClose: () => void
}

export default function PlayerEditModal({ name, shields, onSave, onClose }: PlayerEditModalProps) {
  const { t } = useTranslation()
  const ripple = useRipple<HTMLButtonElement>()
  const nameInput = useRef<HTMLInputElement | null>(null)
  const [nameValue, setNameValue] = useState(name)
  const [tag, setTag] = useState(() => roleTagForShields(shields) ?? '')

  function save() {
    const trimmed = nameValue.trim()
    if (!trimmed) return
    const role = tag.trim()
    onSave({ name: trimmed, shields: role ? [shieldForRoleTag(role)] : [] })
  }

  return (
    <AppModal
      labelledby="player-edit-modal-title"
      open
      initialFocus={nameInput}
      onClose={onClose}
    >
      <AppModalPaper
        style={{ maxWidth: '600px', padding: '32px 40px 40px' }}
        onClose={onClose}
      >
        <h2
          id="player-edit-modal-title"
          className="text-center text-mui-h2 font-bold text-primary"
        >
          {t('players.editTitle')}
        </h2>
        <p className="mui-caption text-center mt-2 text-muted">
          {t('players.editSubtitle')}
        </p>

        <RolePicker
          value={tag}
          className="mt-6"
          onChange={setTag}
        />

        <div className="mui-field mt-5">
          <input
            id="player-name"
            ref={nameInput}
            value={nameValue}
            name="name"
            autoComplete="name"
            placeholder=" "
            className="mui-input w-full"
            onChange={event => setNameValue(event.target.value)}
            onKeyUp={(event) => {
              if (event.key === 'Enter') save()
            }}
          />
          <label
            htmlFor="player-name"
            className="mui-field-label"
          >
            {t('players.nameLabel')}
          </label>
        </div>

        <div className="flex justify-center mt-8">
          <Button
            ref={ripple}
            style={{ minWidth: '120px' }}
            onClick={save}
          >
            {t('common.save')}
          </Button>
        </div>
      </AppModalPaper>
    </AppModal>
  )
}
