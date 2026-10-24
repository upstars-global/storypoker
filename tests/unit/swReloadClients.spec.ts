import { describe, it, expect, vi } from 'vitest'
import script from '../../public/sw-reload-clients.js?raw'

function loadWorker(activeWorker: object | null) {
  const listeners = new Map<string, (event: { waitUntil: (promise: Promise<unknown>) => void }) => void>()
  const client = { url: 'https://example.test/agile-office', navigate: vi.fn(() => Promise.resolve(null)) }
  const worker = {
    registration: { active: activeWorker },
    clients: {
      claim: vi.fn(() => Promise.resolve()),
      matchAll: vi.fn(() => Promise.resolve([client])),
    },
    addEventListener: (event: string, listener: (event: { waitUntil: (promise: Promise<unknown>) => void }) => void) => {
      listeners.set(event, listener)
    },
  }
  new Function('self', script)(worker)

  async function fire(event: string) {
    let pending: Promise<unknown> = Promise.resolve()
    listeners.get(event)?.({ waitUntil: (promise) => { pending = promise } })
    await pending
  }

  return { client, worker, fire }
}

describe('sw-reload-clients', () => {
  it('reloads open windows when the worker replaces an older one', async () => {
    const { client, worker, fire } = loadWorker({})
    await fire('install')
    await fire('activate')

    expect(worker.clients.claim).toHaveBeenCalledBefore(worker.clients.matchAll)
    expect(worker.clients.matchAll).toHaveBeenCalledWith({ type: 'window' })
    expect(client.navigate).toHaveBeenCalledWith(client.url)
  })

  it('leaves windows alone on the first install', async () => {
    const { client, worker, fire } = loadWorker(null)
    await fire('install')
    await fire('activate')

    expect(worker.clients.matchAll).not.toHaveBeenCalled()
    expect(client.navigate).not.toHaveBeenCalled()
  })

  it('finishes activation without waiting for the navigations', async () => {
    const { client, fire } = loadWorker({})
    client.navigate.mockReturnValueOnce(new Promise(() => {}))
    await fire('install')

    await expect(fire('activate')).resolves.toBeUndefined()
    expect(client.navigate).toHaveBeenCalledOnce()
  })

  it('ignores windows that refuse to navigate', async () => {
    const { client, fire } = loadWorker({})
    client.navigate.mockRejectedValueOnce(new TypeError('not controlled'))
    await fire('install')

    await expect(fire('activate')).resolves.toBeUndefined()
  })
})
