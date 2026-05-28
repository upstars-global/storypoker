import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setSupabase, resetSupabase } from '~/lib/supabase-instance'
import { usePresenceStore } from '~/stores/presence'

function makeFakeChannel() {
  const handlers: Record<string, Function[]> = {}
  const channel: any = {
    on(_type: string, _filter: any, handler: Function) {
      const key = _filter?.event ?? _type
      handlers[key] = handlers[key] ?? []
      handlers[key].push(handler)
      return channel
    },
    track: vi.fn().mockResolvedValue('ok'),
    untrack: vi.fn().mockResolvedValue('ok'),
    subscribe(cb?: (status: string) => void) {
      setTimeout(() => cb?.('SUBSCRIBED'), 0)
      return channel
    },
    unsubscribe: vi.fn().mockResolvedValue('ok'),
    presenceState: vi.fn().mockReturnValue({}),
    _trigger(event: string, payload: any) {
      ;(handlers[event] ?? []).forEach(h => h(payload))
    },
  }
  return channel
}

function fakeSupabase(channel: any) {
  return { channel: vi.fn().mockReturnValue(channel) }
}

describe('presenceStore — initial state', () => {
  beforeEach(() => resetSupabase())

  it('starts in connecting status', () => {
    const store = usePresenceStore()
    expect(store.status).toBe('connecting')
    expect(store.online.size).toBe(0)
  })
})

describe('presenceStore — start/stop', () => {
  beforeEach(() => resetSupabase())

  it('start() subscribes and tracks the player', async () => {
    const ch = makeFakeChannel()
    setSupabase(fakeSupabase(ch) as any)
    const store = usePresenceStore()
    await store.start('r1', 'p1')
    await new Promise(r => setTimeout(r, 5))
    expect(ch.track).toHaveBeenCalledWith({ playerId: 'p1' })
    expect(store.status).toBe('online')
  })

  it('stop() untracks and unsubscribes; status → offline', async () => {
    const ch = makeFakeChannel()
    setSupabase(fakeSupabase(ch) as any)
    const store = usePresenceStore()
    await store.start('r1', 'p1')
    await new Promise(r => setTimeout(r, 5))
    await store.stop()
    expect(ch.untrack).toHaveBeenCalled()
    expect(ch.unsubscribe).toHaveBeenCalled()
    expect(store.status).toBe('offline')
  })
})

describe('presenceStore — presence sync', () => {
  beforeEach(() => resetSupabase())

  it('sync event populates online set from presenceState()', async () => {
    const ch = makeFakeChannel()
    ch.presenceState = vi.fn().mockReturnValue({
      key1: [{ playerId: 'p1' }],
      key2: [{ playerId: 'p2' }],
    })
    setSupabase(fakeSupabase(ch) as any)
    const store = usePresenceStore()
    await store.start('r1', 'p1')
    await new Promise(r => setTimeout(r, 5))
    ch._trigger('sync', {})
    expect(store.online.has('p1')).toBe(true)
    expect(store.online.has('p2')).toBe(true)
  })
})

describe('presenceStore — visibility handler', () => {
  beforeEach(() => resetSupabase())

  it('hidden visibility → stays online until 5 min pass, then untrack + offline', async () => {
    vi.useFakeTimers()
    try {
      const ch = makeFakeChannel()
      setSupabase(fakeSupabase(ch) as any)
      const store = usePresenceStore()
      await store.start('r1', 'p1')
      await vi.advanceTimersByTimeAsync(5)
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
      document.dispatchEvent(new Event('visibilitychange'))
      await vi.advanceTimersByTimeAsync(60_000)
      expect(ch.untrack).not.toHaveBeenCalled()
      expect(store.status).toBe('online')
      await vi.advanceTimersByTimeAsync(5 * 60_000)
      expect(ch.untrack).toHaveBeenCalled()
      expect(store.status).toBe('offline')
    } finally {
      vi.useRealTimers()
    }
  })

  it('visible before 5 min → away timer cancelled, stays online', async () => {
    vi.useFakeTimers()
    try {
      const ch = makeFakeChannel()
      setSupabase(fakeSupabase(ch) as any)
      const store = usePresenceStore()
      await store.start('r1', 'p1')
      await vi.advanceTimersByTimeAsync(5)
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
      document.dispatchEvent(new Event('visibilitychange'))
      await vi.advanceTimersByTimeAsync(60_000)
      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
      document.dispatchEvent(new Event('visibilitychange'))
      await vi.advanceTimersByTimeAsync(10 * 60_000)
      expect(ch.untrack).not.toHaveBeenCalled()
      expect(store.status).toBe('online')
    } finally {
      vi.useRealTimers()
    }
  })

  it('visible after 5 min offline → re-enters connecting then online', async () => {
    vi.useFakeTimers()
    try {
      const ch = makeFakeChannel()
      setSupabase(fakeSupabase(ch) as any)
      const store = usePresenceStore()
      await store.start('r1', 'p1')
      await vi.advanceTimersByTimeAsync(5)
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
      document.dispatchEvent(new Event('visibilitychange'))
      await vi.advanceTimersByTimeAsync(5 * 60_000)
      expect(store.status).toBe('offline')
      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
      document.dispatchEvent(new Event('visibilitychange'))
      await vi.advanceTimersByTimeAsync(30)
      expect(store.status).toBe('online')
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('presenceStore — network handler', () => {
  beforeEach(() => resetSupabase())

  it('window offline event → status becomes reconnecting', async () => {
    const ch = makeFakeChannel()
    setSupabase(fakeSupabase(ch) as any)
    const store = usePresenceStore()
    await store.start('r1', 'p1')
    await new Promise(r => setTimeout(r, 5))
    window.dispatchEvent(new Event('offline'))
    expect(store.status).toBe('reconnecting')
  })
})
