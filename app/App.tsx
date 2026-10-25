import { AppRoutes } from '~/router'
import uk from '~/i18n/locales/uk.json'

export default function App() {
  return (
    <div className="min-h-screen bg-app text-body">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[2000] mui-btn mui-btn-md"
      >
        {uk.common.skipToContent}
      </a>
      <AppRoutes />
    </div>
  )
}
