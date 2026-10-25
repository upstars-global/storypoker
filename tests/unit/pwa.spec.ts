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

const swListeners = new Map<string, Array<() => void>>()
let waiting: object | null = null
let controller: object | null = null
const reload = vi.fn()

function fireSw(event: string) {
  swListeners.get(event)?.forEach((listener) => listener())
}

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
    controller = null
    reload.mockClear()
    updateServiceWorker.mockClear()
    vi.stubGlobal('navigator', {
      onLine: true,
      serviceWorker: {
        get controller() {
          return controller
        },
        getRegistration: () => Promise.resolve({ waiting }),
        addEventListener: (event: string, listener: () => void) => {
          swListeners.set(event, [...(swListeners.get(event) ?? []), listener])
        },
      },
    })
    vi.stubGlobal('location', { ...window.location, reload })
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('activates the waiting worker and reloads once it takes control', async () => {
    waiting = {}
    await setup()
    await needRefreshOnHiddenTab()

    expect(updateServiceWorker).toHaveBeenCalledOnce()
    expect(reload).not.toHaveBeenCalled()
    fireSw('controllerchange')
    expect(reload).toHaveBeenCalledOnce()
  })

  it('reloads anyway when the new worker never takes control', async () => {
    waiting = {}
    await setup()
    await needRefreshOnHiddenTab()

    expect(updateServiceWorker).toHaveBeenCalledOnce()
    expect(reload).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(10_000)
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

  it('schedules a reload when a new worker takes over a controlled tab', async () => {
    controller = {}
    await setup()
    fireSw('controllerchange')
    expect(reload).not.toHaveBeenCalled()

    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    document.dispatchEvent(new Event('visibilitychange'))
    await vi.waitFor(() => expect(reload).toHaveBeenCalledOnce())
  })

  it('does not reload when the first worker claims a fresh tab', async () => {
    await setup()
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    fireSw('controllerchange')
    document.dispatchEvent(new Event('visibilitychange'))
    await Promise.resolve()
    expect(reload).not.toHaveBeenCalled()
  })
})
