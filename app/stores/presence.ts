import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getSupabase } from '~/lib/supabase-instance'
import type { ConnectionStatus } from './types'

const AWAY_TIMEOUT_MS = 5 * 60 * 1000
const AGING_INTERVAL_MS = 30 * 1000

export const usePresenceStore = defineStore('presence', () => {
  const status = ref<ConnectionStatus>('connecting')
  const online = ref<Set<string>>(new Set())
  const present = ref<Set<string>>(new Set())
  const lastSeen = new Map<string, number>()

  let channel: any = null
  let currentRoomId: string | null = null
  let currentPlayerId: string | null = null
  let visibilityHandler: (() => void) | null = null
  let onlineHandler: (() => void) | null = null
  let offlineHandler: (() => void) | null = null
  let awayTimer: ReturnType<typeof setTimeout> | null = null
  let agingTimer: ReturnType<typeof setInterval> | null = null

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
    const next = new Set<string>(present.value)
    for (const [id, ts] of lastSeen) {
      if (now - ts < AWAY_TIMEOUT_MS) next.add(id)
      else lastSeen.delete(id)
    }
    if (!setsEqual(next, online.value)) online.value = next
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

  async function start(roomId: string, playerId: string) {
    currentRoomId = roomId
    currentPlayerId = playerId
    await openChannel()
    attachWindowHandlers()
    startAging()
  }

  async function openChannel() {
    if (!currentRoomId || !currentPlayerId) return
    status.value = 'connecting'
    const supabase = getSupabase()
    channel = supabase.channel(`room:${currentRoomId}`)
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState() as Record<string, Array<{ playerId: string }>>
      const now = Date.now()
      const next = new Set<string>()
      for (const arr of Object.values(state)) {
        for (const m of arr) {
          next.add(m.playerId)
          lastSeen.set(m.playerId, now)
        }
      }
      present.value = next
      recomputeOnline()
    })
    channel.subscribe(async (s: string) => {
      if (s === 'SUBSCRIBED') {
        await channel.track({ playerId: currentPlayerId })
        status.value = 'online'
      } else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT' || s === 'CLOSED') {
        if (status.value !== 'offline') status.value = 'reconnecting'
      }
    })
  }

  async function closeChannel() {
    if (!channel) return
    try { await channel.untrack() } catch {}
    try { await channel.unsubscribe() } catch {}
    channel = null
    present.value = new Set()
    recomputeOnline()
  }

  async function stop() {
    detachWindowHandlers()
    clearAwayTimer()
    stopAging()
    lastSeen.clear()
    await closeChannel()
    status.value = 'offline'
  }

  function attachWindowHandlers() {
    if (typeof document === 'undefined') return
    visibilityHandler = () => {
      if (document.visibilityState === 'hidden') {
        if (awayTimer !== null) return
        awayTimer = setTimeout(async () => {
          awayTimer = null
          await closeChannel()
          status.value = 'offline'
        }, AWAY_TIMEOUT_MS)
      } else if (document.visibilityState === 'visible') {
        clearAwayTimer()
        if (status.value === 'offline' || status.value === 'reconnecting') {
          openChannel()
        }
      }
    }
    offlineHandler = () => { status.value = 'reconnecting' }
    onlineHandler = () => { if (status.value === 'reconnecting') openChannel() }
    document.addEventListener('visibilitychange', visibilityHandler)
    window.addEventListener('offline', offlineHandler)
    window.addEventListener('online', onlineHandler)
  }

  function detachWindowHandlers() {
    if (visibilityHandler) document.removeEventListener('visibilitychange', visibilityHandler)
    if (offlineHandler) window.removeEventListener('offline', offlineHandler)
    if (onlineHandler) window.removeEventListener('online', onlineHandler)
    visibilityHandler = null
    offlineHandler = null
    onlineHandler = null
  }

  return { status, online, start, stop }
})
