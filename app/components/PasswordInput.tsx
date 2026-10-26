import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import AppIcon from '~/components/AppIcon'

type PasswordInputProps = {
  id: string
  label: string
  autocomplete: 'current-password' | 'new-password'
  value: string
  onChange: (value: string) => void
  name?: string
  error?: string
  testid?: string
  onEnter?: () => void
}

export default function PasswordInput({
  id,
  label,
  autocomplete,
  value,
  onChange,
  name = 'password',
  error,
  testid,
  onEnter,
}: PasswordInputProps) {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(false)
  return (
    <div className="mui-field">
      <input
        id={id}
        value={value}
        type={visible ? 'text' : 'password'}
        name={name}
        autoComplete={autocomplete}
        placeholder=" "
        className={error ? 'mui-input pr-12 is-error' : 'mui-input pr-12'}
        data-testid={testid}
        onChange={event => onChange(event.target.value)}
        onKeyUp={event => {
          if (event.key === 'Enter') onEnter?.()
        }}
      />
      <label
        htmlFor={id}
        className="mui-field-label"
      >
        {label}
      </label>
      <button
        type="button"
        className="mui-field-adornment"
        aria-label={visible ? t('common.hidePassword') : t('common.showPassword')}
        aria-pressed={visible}
        tabIndex={-1}
        onClick={() => setVisible(current => !current)}
      >
        {visible
          ? <AppIcon name="ic:baseline-visibility-off" />
          : <AppIcon name="ic:baseline-visibility" />}
      </button>
    </div>
  )
}
