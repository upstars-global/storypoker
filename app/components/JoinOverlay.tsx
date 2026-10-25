import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import AppModal from '~/components/AppModal'
import AppModalPaper from '~/components/AppModalPaper'
import RolePicker from '~/components/RolePicker'
import { Button } from '~/components/ui/button'
import { useRipple } from '~/hooks/useRipple'
import { shieldForRoleTag } from '~/utils/shields'

type JoinOverlayProps = {
  roomName?: string | null
  onJoin: (payload: { name: string; shields: string[] }) => void
  onClose: () => void
}

export default function JoinOverlay({ roomName, onJoin, onClose }: JoinOverlayProps) {
  const { t } = useTranslation()
  const ripple = useRipple<HTMLButtonElement>()
  const nameInput = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('')
  const [tag, setTag] = useState('')
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    const frame = requestAnimationFrame(() => nameInput.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [])

  function submit() {
    if (!name.trim()) {
      setHasError(true)
      return
    }
    const role = tag.trim()
    onJoin({ name: name.trim(), shields: role ? [shieldForRoleTag(role)] : [] })
  }

  return (
    <AppModal
      labelledby="join-overlay-title"
      open
      lockDismiss
      onClose={onClose}
    >
      <AppModalPaper onClose={onClose}>
        <h2
          id="join-overlay-title"
          className="mui-h5 text-center"
        >
          {t('join.title')}
        </h2>
        <p className="mui-body text-center mt-1 text-body">
          {roomName ? t('join.subtitleNamed', { name: roomName }) : t('join.subtitle')}
        </p>
        <div className="flex flex-col gap-4 mt-6">
          <div className="mui-field">
            <input
              id="join-name"
              ref={nameInput}
              value={name}
              type="text"
              name="name"
              autoComplete="name"
              placeholder=" "
              className={hasError ? 'mui-input w-full is-error' : 'mui-input w-full'}
              onChange={event => setName(event.target.value)}
              onKeyUp={(event) => {
                if (event.key === 'Enter') submit()
              }}
            />
            <label
              htmlFor="join-name"
              className="mui-field-label"
            >
              {t('join.nameLabel')}
            </label>
          </div>
          <RolePicker
            value={tag}
            onChange={setTag}
          />
          <div className="flex justify-center">
            <Button
              ref={ripple}
              onClick={submit}
            >
              {t('join.joinRoom')}
            </Button>
          </div>
        </div>
      </AppModalPaper>
    </AppModal>
  )
}
