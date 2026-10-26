import { useTranslation } from 'react-i18next'
import { usePresenceStore } from '~/stores/presence'

export default function ConnectionBanner() {
  const { t } = useTranslation()
  const status = usePresenceStore(state => state.status)
  if (status !== 'reconnecting') return null
  return (
    <div
      className="fixed inset-x-0 top-0 z-[9999] flex h-8 items-center justify-center gap-2 bg-amber-500 text-sm font-medium text-black"
      role="status"
      aria-live="polite"
    >
      <span
        className="h-3 w-3 animate-spin rounded-full border-2 border-current border-r-transparent"
        aria-hidden="true"
      />
      <span>{t('connection.reconnecting')}</span>
    </div>
  )
}
