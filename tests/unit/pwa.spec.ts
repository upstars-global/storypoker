import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { RegisterSWOptions } from 'vite-plugin-pwa/types'

const updateServiceWorker = vi.fn(() => Promise.resolve())
let options: RegisterSWOptions = {}

vi.mock('virtual:pwa-register', () => ({
  registerSW: (registerOptions: RegisterSWOptions) => {
    options = registerOptions
    return updateServiceWorker
  },
}))

const swListeners = new Map<string, () => void>()
let waiting: object | null = null
const reload = vi.fn()

async function setup() {
  vi.resetModules()
  const { initAppUpdate } = await import('~/pwa')
  initAppUpdate()
}

async function needRefreshOnHiddenTab() {
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
  options.onNeedRefresh?.()
  await vi.waitFor(() => expect(reload.mock.calls.length + updateServiceWorker.mock.calls.length).toBeGreaterThan(0))
}

describe('initAppUpdate', () => {
  beforeEach(() => {
    swListeners.clear()
    waiting = null
    reload.mockClear()
    updateServiceWorker.mockClear()
    vi.stubGlobal('navigator', {
      onLine: true,
      serviceWorker: {
        getRegistration: () => Promise.resolve({ waiting }),
        addEventListener: (event: string, listener: () => void) => swListeners.set(event, listener),
      },
    })
    vi.stubGlobal('location', { ...window.location, reload })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('activates the waiting worker and reloads once it takes control', async () => {
    waiting = {}
    await setup()
    await needRefreshOnHiddenTab()

    expect(updateServiceWorker).toHaveBeenCalledOnce()
    expect(reload).not.toHaveBeenCalled()
    swListeners.get('controllerchange')?.()
    expect(reload).toHaveBeenCalledOnce()
  })

  it('reloads directly when another tab already activated the new worker', async () => {
    await setup()
    await needRefreshOnHiddenTab()

    expect(reload).toHaveBeenCalledOnce()
    expect(updateServiceWorker).not.toHaveBeenCalled()
  })

  it('defers the workbox reload to the same update policy', async () => {
    await setup()
    options.onNeedReload?.()
    expect(reload).not.toHaveBeenCalled()

    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    document.dispatchEvent(new Event('visibilitychange'))
    await vi.waitFor(() => expect(reload).toHaveBeenCalledOnce())
  })
})
