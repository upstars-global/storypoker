import { useState } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import AppModal from '~/components/AppModal'
import AppModalPaper from '~/components/AppModalPaper'
import PasswordInput from '~/components/PasswordInput'
import { Button } from '~/components/ui/button'
import { useAuthStore } from '~/stores/auth'
import { errorMessage, validateEmail, validateRequiredPassword } from '~/utils/authValidation'

type AuthModalProps = {
  mode: 'signin' | 'signup'
  onClose: () => void
  onSuccess?: () => void
}

type AuthErrors = { email?: string; password?: string; server?: string }

export default function AuthModal({ mode, onClose, onSuccess }: AuthModalProps) {
  const { t } = useTranslation()
  const signIn = useAuthStore(state => state.signIn)
  const signUp = useAuthStore(state => state.signUp)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<AuthErrors>({})
  const [loading, setLoading] = useState(false)
  const isSignIn = mode === 'signin'

  async function submit() {
    const trimmedEmail = email.trim()
    const next: AuthErrors = {
      email: validateEmail(trimmedEmail),
      password: validateRequiredPassword(password),
    }
    setErrors(next)
    if (next.email || next.password) return

    setLoading(true)
    try {
      if (isSignIn) {
        await signIn(trimmedEmail, password)
      } else {
        await signUp(trimmedEmail, password)
      }
      onSuccess?.()
      onClose()
    } catch (e) {
      setErrors(current => ({ ...current, server: errorMessage(e) }))
    } finally {
      setLoading(false)
    }
  }

  const submitLabel = loading
    ? (isSignIn ? t('auth.signingIn') : t('auth.signingUp'))
    : (isSignIn ? t('common.signIn') : t('common.signUp'))

  return (
    <AppModal
      labelledby="auth-modal-title"
      open
      onClose={onClose}
    >
      <AppModalPaper onClose={onClose}>
        <h2
          id="auth-modal-title"
          className="mui-h5 text-center"
        >
          {isSignIn ? t('auth.signInTitle') : t('auth.signUpTitle')}
        </h2>
        {!isSignIn && (
          <p className="mui-caption text-center mt-2 text-muted">
            {t('auth.gainModeratorPowers')}
          </p>
        )}
        <div className="flex flex-col gap-3 mt-6">
          <div>
            <div className="mui-field">
              <input
                id="auth-email"
                value={email}
                type="email"
                name="email"
                placeholder=" "
                autoComplete="email"
                className={errors.email ? 'mui-input is-error' : 'mui-input'}
                onChange={event => setEmail(event.target.value)}
                onKeyUp={event => {
                  if (event.key === 'Enter') void submit()
                }}
              />
              <label
                htmlFor="auth-email"
                className="mui-field-label"
              >
                {t('common.email')}
              </label>
            </div>
            {errors.email && (
              <p className="text-sm mt-1 text-danger">
                {errors.email}
              </p>
            )}
          </div>

          <div>
            <PasswordInput
              id="auth-password"
              value={password}
              onChange={setPassword}
              label={t('common.password')}
              autocomplete={isSignIn ? 'current-password' : 'new-password'}
              error={errors.password}
              onEnter={() => void submit()}
            />
            <div className="flex items-center justify-between gap-3 mt-1">
              {errors.password && (
                <p className="text-sm text-danger">
                  {errors.password}
                </p>
              )}
              {isSignIn && (
                <Link
                  to="/forgot-password"
                  className="mui-caption underline hover:no-underline text-primary ml-auto"
                  onClick={onClose}
                >
                  {t('auth.forgotPassword')}
                </Link>
              )}
            </div>
          </div>

          {errors.server && (
            <p className="text-sm text-danger">
              {errors.server}
            </p>
          )}
          <div className="flex justify-center mt-2">
            <Button
              disabled={loading}
              onClick={() => void submit()}
            >
              <span>{submitLabel}</span>
            </Button>
          </div>
        </div>
      </AppModalPaper>
    </AppModal>
  )
}
