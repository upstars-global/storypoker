import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import AppHeader from '~/components/AppHeader'
import AuthModal from '~/components/AuthModal'
import UserSettingsModal from '~/components/UserSettingsModal'
import { useAuthStore } from '~/stores/auth'
import { useProfilesStore } from '~/stores/profiles'
import {
  getFeatureFlags,
  resetFeatureFlagValues,
  setFeatureFlagValue,
  type FeatureFlagKey,
  type FeatureFlags,
} from '~/configs/featureFlags'

export default function FeatureFlagsPage() {
  const { t } = useTranslation()
  const [featureFlags, setFeatureFlags] = useState<FeatureFlags>(getFeatureFlags)
  const [showAuth, setShowAuth] = useState<'signin' | 'signup' | null>(null)
  const [showAccountSettings, setShowAccountSettings] = useState(false)
  const user = useAuthStore(state => state.user)

  useEffect(() => {
    void (async () => {
      await useAuthStore.getState().init()
      const userId = useAuthStore.getState().user?.id
      if (userId) await useProfilesStore.getState().fetchOne(userId)
    })()
  }, [])

  function toggleFeatureFlag(key: FeatureFlagKey) {
    const newValue = !featureFlags[key].enabled
    setFeatureFlagValue(key, newValue)
    setFeatureFlags({ ...featureFlags, [key]: { ...featureFlags[key], enabled: newValue } })
  }

  function resetFeatureFlags() {
    resetFeatureFlagValues()
    setFeatureFlags(getFeatureFlags())
  }

  const flagKeys = Object.keys(featureFlags) as FeatureFlagKey[]

  return (
    <div className="min-h-screen flex flex-col bg-app text-body">
      <AppHeader
        onlineCount={0}
        isModerator={false}
        playerName=""
        title={t('ffc.title')}
        onOpenSignIn={() => setShowAuth('signin')}
        onOpenSignUp={() => setShowAuth('signup')}
        onOpenAccountSettings={() => setShowAccountSettings(true)}
        onSignOut={() => void useAuthStore.getState().signOut()}
      />
      {showAuth && (
        <AuthModal
          mode={showAuth}
          onClose={() => setShowAuth(null)}
        />
      )}
      {showAccountSettings && user && (
        <UserSettingsModal onClose={() => setShowAccountSettings(false)} />
      )}
      <main
        id="main"
        tabIndex={-1}
        className="flex flex-col gap-6 p-4 sm:p-6 md:p-8 max-w-[1400px] w-full mx-auto outline-none"
      >
        <div className="w-full grid grid-cols-1 xl:grid-cols-3 lg:grid-cols-2 gap-6">
          {flagKeys.map(featureFlagKey => (
            <div
              key={featureFlagKey}
              className="mui-paper"
            >
              <div className="mui-paper-header">
                <div className="flex items-center justify-between w-full">
                  <div>{t(`ffc.flags.${featureFlagKey}.name`)}</div>
                  <label
                    className="mui-switch"
                    htmlFor={`ffc-${featureFlagKey}`}
                  >
                    <input
                      id={`ffc-${featureFlagKey}`}
                      type="checkbox"
                      name={`ffc-${featureFlagKey}`}
                      checked={featureFlags[featureFlagKey].enabled}
                      onChange={() => toggleFeatureFlag(featureFlagKey)}
                    />
                    <span className="track" />
                    <span className="thumb" />
                    <span className="sr-only">{t(`ffc.flags.${featureFlagKey}.name`)}</span>
                  </label>
                </div>
              </div>
              <div className="pl-4 pr-2 py-2 gap-2 flex flex-col">
                <div>{t(`ffc.flags.${featureFlagKey}.description`)}</div>
              </div>
            </div>
          ))}
          {featureFlags.example.enabled && (
            <div className="mui-paper">
              <div className="mui-paper-header">
                <div>{t('ffc.exampleHeader')}</div>
              </div>
              <div className="pl-4 pr-2 py-2">
                {t('ffc.exampleText')}
              </div>
            </div>
          )}
        </div>
        <div>
          <button
            type="button"
            className="mui-btn"
            onClick={resetFeatureFlags}
          >
            {t('ffc.resetFeatureFlags')}
          </button>
        </div>
      </main>
    </div>
  )
}
