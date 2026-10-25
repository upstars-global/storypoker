import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import PasswordInput from '~/components/PasswordInput'
import { Button } from '~/components/ui/button'
import { useRipple } from '~/hooks/useRipple'
import AuthPageLayout from '~/pages/AuthPageLayout'
import { useAuthStore } from '~/stores/auth'
import { errorMessage, validateEmail, validatePasswordConfirmation, validateRequiredPassword } from '~/utils/authValidation'

type SignupErrors = { email?: string; password?: string; confirm?: string; server?: string }

export default function SignupPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const user = useAuthStore(state => state.user)
  const init = useAuthStore(state => state.init)
  const signUp = useAuthStore(state => state.signUp)
  const ripple = useRipple<HTMLButtonElement>()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<SignupErrors>({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const signingUp = useRef(false)

  useEffect(() => {
    void init()
  }, [init])

  useEffect(() => {
    if (user && !success && !signingUp.current) void navigate('/')
  }, [user, success, navigate])

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedEmail = email.trim()
    const next: SignupErrors = {
      email: validateEmail(trimmedEmail),
      password: validateRequiredPassword(password),
      confirm: validatePasswordConfirmation(password, confirm),
    }
    setErrors(next)
    if (next.email || next.password || next.confirm) return

    setLoading(true)
    signingUp.current = true
    try {
      await signUp(trimmedEmail, password)
      setSuccess(true)
    } catch (e) {
      setErrors(current => ({ ...current, server: errorMessage(e) }))
    } finally {
      signingUp.current = false
      setLoading(false)
    }
  }

  return (
    <AuthPageLayout
      title={t('common.signUp')}
      description={t('signup.description')}
    >
      {success
        ? (
            <div
              data-testid="signup-success"
              className="text-center mt-6"
            >
              <p className="mui-body">
                {t('signup.confirmEmail')}
              </p>
              <Link
                to="/login"
                className="mui-caption underline hover:no-underline text-primary"
              >
                {t('signup.backToSignIn')}
              </Link>
            </div>
          )
        : (
            <form
              className="flex flex-col gap-3 mt-6"
              onSubmit={event => void onSubmit(event)}
            >
              <div>
                <div className="mui-field">
                  <input
                    id="signup-email"
                    value={email}
                    type="email"
                    name="email"
                    autoComplete="email"
                    placeholder=" "
                    className={errors.email ? 'mui-input is-error' : 'mui-input'}
                    data-testid="signup-email"
                    onChange={event => setEmail(event.target.value)}
                  />
                  <label
                    htmlFor="signup-email"
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
                  id="signup-password"
                  value={password}
                  onChange={setPassword}
                  label={t('common.password')}
                  name="new-password"
                  autocomplete="new-password"
                  error={errors.password}
                  testid="signup-password"
                />
                {errors.password && (
                  <p className="text-sm mt-1 text-danger">
                    {errors.password}
                  </p>
                )}
              </div>

              <div>
                <PasswordInput
                  id="signup-confirm"
                  value={confirm}
                  onChange={setConfirm}
                  label={t('common.confirmPassword')}
                  name="confirm-password"
                  autocomplete="new-password"
                  error={errors.confirm}
                  testid="signup-confirm"
                />
                {errors.confirm && (
                  <p className="text-sm mt-1 text-danger">
                    {errors.confirm}
                  </p>
                )}
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
                  data-testid="signup-submit"
                >
                  {loading ? t('auth.signingUp') : t('common.signUp')}
                </Button>
              </div>

              <p className="mui-caption text-center mt-2">
                {t('signup.alreadyHaveAccount')}
                {' '}
                <Link
                  to="/login"
                  className="underline hover:no-underline text-primary"
                >
                  {t('common.signIn')}
                </Link>
              </p>
            </form>
          )}
    </AuthPageLayout>
  )
}
