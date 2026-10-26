import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import UpdateBanner from '~/components/UpdateBanner'
import { AppRoutes } from '~/router'
import { soundVolumeStore } from '~/hooks/useSoundVolume'
import { useTheme } from '~/hooks/useTheme'

export default function App() {
  const { t } = useTranslation()
  const { init } = useTheme()

  useEffect(() => {
    init()
    soundVolumeStore.getState().initVolume()
  }, [init])

  return (
    <div className="min-h-screen bg-app text-body">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[2000] mui-btn mui-btn-md"
      >
        {t('common.skipToContent')}
      </a>
      <UpdateBanner />
      <AppRoutes />
    </div>
  )
}
