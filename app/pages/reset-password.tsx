import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import PasswordInput from '~/components/PasswordInput'
import { Button } from '~/components/ui/button'
import { useRipple } from '~/hooks/useRipple'
import { getSupabase } from '~/lib/supabase-instance'
import AuthPageLayout from '~/pages/AuthPageLayout'
import { useAuthStore } from '~/stores/auth'
import { errorMessage, validatePasswordConfirmation, validateRequiredPassword } from '~/utils/authValidation'

type ResetErrors = { password?: string; confirm?: string; server?: string }

export default function ResetPasswordPage() {
  const { t } = useTranslation()
  const init = useAuthStore(state => state.init)
  const updatePassword = useAuthStore(state => state.updatePassword)
  const signOut = useAuthStore(state => state.signOut)
  const ripple = useRipple<HTMLButtonElement>()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<ResetErrors>({})
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [canReset, setCanReset] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    let active = true
    const supabase = getSupabase()
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setCanReset(Boolean(session))
    })

    async function checkSession() {
      await init()
      const { data } = await supabase.auth.getSession()
      if (!active) return
      setCanReset(Boolean(data.session))
      setCheckingSession(false)
    }

    void checkSession()
    return () => {
      active = false
      authListener.subscription.unsubscribe()
    }
  }, [init])

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next: ResetErrors = {
      password: validateRequiredPassword(password),
      confirm: validatePasswordConfirmation(password, confirm),
    }
    setErrors(next)
    if (next.password || next.confirm) return

    setLoading(true)
    try {
      await updatePassword(password)
      await signOut()
      setSuccess(true)
    } catch (e) {
      setErrors(current => ({ ...current, server: errorMessage(e) }))
    } finally {
      setLoading(false)
    }
  }

  function renderBody() {
    if (checkingSession) {
      return (
        <div className="text-center mt-6">
          <p className="mui-body">
            {t('resetPassword.checking')}
          </p>
        </div>
      )
    }
    if (success) {
      return (
        <div className="text-center mt-6">
          <p className="mui-body">
            {t('resetPassword.updated')}
          </p>
          <Link
            to="/login"
            className="mui-caption underline hover:no-underline text-primary"
          >
            {t('common.signIn')}
          </Link>
        </div>
      )
    }
    if (!canReset) {
      return (
        <div className="text-center mt-6">
          <p className="mui-body">
            {t('resetPassword.openLink')}
          </p>
          <Link
            to="/forgot-password"
            className="mui-caption underline hover:no-underline text-primary"
          >
            {t('resetPassword.requestNewLink')}
          </Link>
        </div>
      )
    }
    return (
      <form
        className="flex flex-col gap-3 mt-6"
        onSubmit={event => void onSubmit(event)}
      >
        <div>
          <PasswordInput
            id="reset-password"
            value={password}
            onChange={setPassword}
            label={t('resetPassword.newPasswordLabel')}
            name="new-password"
            autocomplete="new-password"
            error={errors.password}
          />
          {errors.password && (
            <p className="text-sm mt-1 text-danger">
              {errors.password}
            </p>
          )}
        </div>

        <div>
          <PasswordInput
            id="reset-confirm"
            value={confirm}
            onChange={setConfirm}
            label={t('resetPassword.confirmNewPasswordLabel')}
            name="confirm-password"
            autocomplete="new-password"
            error={errors.confirm}
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
          >
            <span>{loading ? t('resetPassword.updating') : t('resetPassword.updatePassword')}</span>
          </Button>
        </div>
      </form>
    )
  }

  return (
    <AuthPageLayout
      title={t('resetPassword.title')}
      description={t('resetPassword.description')}
    >
      {renderBody()}
    </AuthPageLayout>
  )
}
