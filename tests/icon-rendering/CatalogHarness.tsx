import AppIcon from '~/components/AppIcon'
import { inputNames } from '~/utils/iconManifest'

const view = new URLSearchParams(window.location.search).get('view') === 'catalog' ? 'catalog' : 'room'

export default function CatalogHarness() {
  return (
    <div className="min-h-screen bg-app text-body">
      <div data-testid="icon-harness-ready" className="sr-only">
        ready
      </div>
      {view === 'catalog' ? (
        <div className="grid grid-cols-6 gap-4 p-8">
          {inputNames.map(name => (
            <div key={name} data-icon-name={name} className="flex flex-col items-center gap-2 text-xs">
              <AppIcon name={name} style={{ fontSize: '2rem' }} />
              <span>{name}</span>
            </div>
          ))}
        </div>
      ) : (
        <div data-testid="room-harness-stub" className="p-8">
          Room view is ported in Task 21
        </div>
      )}
    </div>
  )
}
