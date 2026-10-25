import { create } from 'zustand'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { getSupabase } from '~/lib/supabase-instance'
import type { ConnectionStatus } from './types'

const AWAY_TIMEOUT_MS = 5 * 60 * 1000
const AGING_INTERVAL_MS = 30 * 1000

interface PresenceState {
  status: ConnectionStatus
  online: Set<string>
  start: (roomId: string, playerId: string) => Promise<void>
  stop: () => Promise<void>
}

export const usePresenceStore = create<PresenceState>()((set, get) => {
  let present = new Set<string>()
  const lastSeen = new Map<string, number>()

  let channel: RealtimeChannel | null = null
  let currentRoomId: string | null = null
  let currentPlayerId: string | null = null
  let visibilityHandler: (() => void) | null = null
  let onlineHandler: (() => void) | null = null
  let offlineHandler: (() => void) | null = null
  let awayTimer: ReturnType<typeof setTimeout> | null = null
  let agingTimer: ReturnType<typeof setInterval> | null = null

  function setStatus(status: ConnectionStatus) {
    set({ status })
  }

  function clearAwayTimer() {
    if (awayTimer !== null) {
      clearTimeout(awayTimer)
      awayTimer = null
    }
  }

  function setsEqual(a: Set<string>, b: Set<string>): boolean {
    if (a.size !== b.size) return false
    for (const v of a) if (!b.has(v)) return false
    return true
  }

  function recomputeOnline() {
    const now = Date.now()
    const next = new Set<string>(present)
    for (const [id, ts] of lastSeen) {
      if (now - ts < AWAY_TIMEOUT_MS) next.add(id)
      else lastSeen.delete(id)
    }
    if (!setsEqual(next, get().online)) set({ online: next })
  }

  function startAging() {
    if (agingTimer !== null) return
    agingTimer = setInterval(recomputeOnline, AGING_INTERVAL_MS)
  }

  function stopAging() {
    if (agingTimer !== null) {
      clearInterval(agingTimer)
      agingTimer = null
    }
  }

  async function openChannel() {
    if (!currentRoomId || !currentPlayerId) return
    setStatus('connecting')
    const supabase = getSupabase()
    const ch = supabase.channel(`room:${currentRoomId}`)
    channel = ch
    ch.on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState<{ playerId: string }>()
      const now = Date.now()
      const next = new Set<string>()
      for (const arr of Object.values(state)) {
        for (const m of arr) {
          next.add(m.playerId)
          lastSeen.set(m.playerId, now)
        }
      }
      present = next
      recomputeOnline()
    })
    ch.subscribe(async (s) => {
      if (s === 'SUBSCRIBED') {
        await ch.track({ playerId: currentPlayerId })
        setStatus('online')
      } else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT' || s === 'CLOSED') {
        if (get().status !== 'offline') setStatus('reconnecting')
      }
    })
  }

  async function closeChannel() {
    if (!channel) return
    try { await channel.untrack() } catch {}
    try { await channel.unsubscribe() } catch {}
    channel = null
    present = new Set()
    recomputeOnline()
  }

  function attachWindowHandlers() {
    if (typeof document === 'undefined') return
    detachWindowHandlers()
    visibilityHandler = () => {
      if (document.visibilityState === 'hidden') {
        if (awayTimer !== null) return
        awayTimer = setTimeout(async () => {
          awayTimer = null
          await closeChannel()
          setStatus('offline')
        }, AWAY_TIMEOUT_MS)
      } else if (document.visibilityState === 'visible') {
        clearAwayTimer()
        const status = get().status
        if (status === 'offline' || status === 'reconnecting') {
          void openChannel()
        }
      }
    }
    offlineHandler = () => { setStatus('reconnecting') }
    onlineHandler = () => { if (get().status === 'reconnecting') void openChannel() }
    document.addEventListener('visibilitychange', visibilityHandler)
    window.addEventListener('offline', offlineHandler)
    window.addEventListener('online', onlineHandler)
  }

  function detachWindowHandlers() {
    if (typeof document === 'undefined') return
    if (visibilityHandler) document.removeEventListener('visibilitychange', visibilityHandler)
    if (offlineHandler) window.removeEventListener('offline', offlineHandler)
    if (onlineHandler) window.removeEventListener('online', onlineHandler)
    visibilityHandler = null
    offlineHandler = null
    onlineHandler = null
  }

  return {
    status: 'connecting',
    online: new Set(),

    async start(roomId, playerId) {
      currentRoomId = roomId
      currentPlayerId = playerId
      await openChannel()
      attachWindowHandlers()
      startAging()
    },

    async stop() {
      detachWindowHandlers()
      clearAwayTimer()
      stopAging()
      lastSeen.clear()
      await closeChannel()
      setStatus('offline')
    },
  }
})
