import { useTranslation } from 'react-i18next'
import { Button } from '~/components/ui/button'
import { useAppUpdate } from '~/hooks/useAppUpdate'

export default function UpdateBanner() {
  const { t } = useTranslation()
  const { promptVisible, applyUpdateNow } = useAppUpdate()
  if (!promptVisible) return null
  return (
    <div
      className="fixed bottom-4 left-1/2 z-[9999] flex -translate-x-1/2 items-center gap-3 rounded bg-paper py-2 pr-2 pl-4 text-sm text-body shadow-4"
      role="status"
      aria-live="polite"
      data-testid="update-banner"
    >
      <span>{t('appUpdate.available')}</span>
      <Button
        type="button"
        size="sm"
        onClick={applyUpdateNow}
      >
        {t('appUpdate.reload')}
      </Button>
    </div>
  )
}
