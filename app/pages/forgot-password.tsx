import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Button } from '~/components/ui/button'
import { useRipple } from '~/hooks/useRipple'
import AuthPageLayout from '~/pages/AuthPageLayout'
import { useAuthStore } from '~/stores/auth'
import { errorMessage, validateEmail } from '~/utils/authValidation'

type ForgotErrors = { email?: string; server?: string }

export default function ForgotPasswordPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const user = useAuthStore(state => state.user)
  const init = useAuthStore(state => state.init)
  const requestPasswordReset = useAuthStore(state => state.requestPasswordReset)
  const ripple = useRipple<HTMLButtonElement>()
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState<ForgotErrors>({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    void init()
  }, [init])

  useEffect(() => {
    if (user) void navigate('/')
  }, [user, navigate])

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedEmail = email.trim()
    const next: ForgotErrors = { email: validateEmail(trimmedEmail) }
    setErrors(next)
    if (next.email) return

    setLoading(true)
    try {
      await requestPasswordReset(trimmedEmail, `${window.location.origin}/reset-password`)
      setSuccess(true)
    } catch (e) {
      setErrors(current => ({ ...current, server: errorMessage(e) }))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthPageLayout
      title={t('forgotPassword.title')}
      description={t('forgotPassword.description')}
    >
      {success
        ? (
            <div className="text-center mt-6">
              <p className="mui-body">
                {t('forgotPassword.checkEmail')}
              </p>
              <Link
                to="/login"
                className="mui-caption underline hover:no-underline text-primary"
              >
                {t('forgotPassword.backToSignIn')}
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
                    id="forgot-email"
                    value={email}
                    type="email"
                    name="email"
                    autoComplete="email"
                    placeholder=" "
                    className={errors.email ? 'mui-input is-error' : 'mui-input'}
                    onChange={event => setEmail(event.target.value)}
                  />
                  <label
                    htmlFor="forgot-email"
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
                >
                  {loading ? t('forgotPassword.sending') : t('forgotPassword.sendResetLink')}
                </Button>
              </div>

              <p className="mui-caption text-center mt-2">
                {t('forgotPassword.rememberedPassword')}
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
