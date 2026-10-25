import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import PasswordInput from '~/components/PasswordInput'
import { Button } from '~/components/ui/button'
import { useRipple } from '~/hooks/useRipple'
import AuthPageLayout from '~/pages/AuthPageLayout'
import { useAuthStore } from '~/stores/auth'
import { errorMessage, validateEmail, validateRequiredPassword } from '~/utils/authValidation'

type LoginErrors = { email?: string; password?: string; server?: string }

export default function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const user = useAuthStore(state => state.user)
  const init = useAuthStore(state => state.init)
  const signIn = useAuthStore(state => state.signIn)
  const ripple = useRipple<HTMLButtonElement>()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<LoginErrors>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    void init()
  }, [init])

  useEffect(() => {
    if (user) void navigate('/')
  }, [user, navigate])

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedEmail = email.trim()
    const next: LoginErrors = {
      email: validateEmail(trimmedEmail),
      password: validateRequiredPassword(password),
    }
    setErrors(next)
    if (next.email || next.password) return

    setLoading(true)
    try {
      await signIn(trimmedEmail, password)
      void navigate('/')
    } catch (e) {
      setErrors(current => ({ ...current, server: errorMessage(e) }))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthPageLayout
      title={t('common.signIn')}
      description={t('login.welcome')}
    >
      <form
        className="flex flex-col gap-3 mt-6"
        onSubmit={event => void onSubmit(event)}
      >
        <div>
          <div className="mui-field">
            <input
              id="login-email"
              value={email}
              type="email"
              name="email"
              autoComplete="email"
              placeholder=" "
              className={errors.email ? 'mui-input is-error' : 'mui-input'}
              data-testid="login-email"
              onChange={event => setEmail(event.target.value)}
            />
            <label
              htmlFor="login-email"
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
            id="login-password"
            value={password}
            onChange={setPassword}
            label={t('common.password')}
            autocomplete="current-password"
            error={errors.password}
            testid="login-password"
          />
          <div className="flex items-center justify-between gap-3 mt-1">
            {errors.password && (
              <p className="text-sm text-danger">
                {errors.password}
              </p>
            )}
            <Link
              to="/forgot-password"
              className="mui-caption underline hover:no-underline text-primary ml-auto"
            >
              {t('auth.forgotPassword')}
            </Link>
          </div>
        </div>

        {errors.server && (
          <p className="text-sm text-danger">
            {errors.server}
          </p>
        )}

        <div className="flex justify-center mt-2">
          <Button
            ref={ripple}
            type="submit"
            disabled={loading}
            data-testid="login-submit"
          >
            {loading ? t('auth.signingIn') : t('common.signIn')}
          </Button>
        </div>

        <p className="mui-caption text-center mt-2">
          {t('login.noAccount')}
          {' '}
          <Link
            to="/signup"
            className="underline hover:no-underline text-primary"
          >
            {t('common.signUp')}
          </Link>
        </p>
      </form>
    </AuthPageLayout>
  )
}
