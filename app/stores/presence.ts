import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getSupabase } from '~/lib/supabase-instance'
import type { ConnectionStatus } from './types'

const AWAY_TIMEOUT_MS = 5 * 60 * 1000

export const usePresenceStore = defineStore('presence', () => {
  const status = ref<ConnectionStatus>('connecting')
  const online = ref<Set<string>>(new Set())

  let channel: any = null
  let currentRoomId: string | null = null
  let currentPlayerId: string | null = null
  let visibilityHandler: (() => void) | null = null
  let onlineHandler: (() => void) | null = null
  let offlineHandler: (() => void) | null = null
  let awayTimer: ReturnType<typeof setTimeout> | null = null

  function clearAwayTimer() {
    if (awayTimer !== null) {
      clearTimeout(awayTimer)
      awayTimer = null
    }
  }

  async function start(roomId: string, playerId: string) {
    currentRoomId = roomId
    currentPlayerId = playerId
    await openChannel()
    attachWindowHandlers()
  }

  async function openChannel() {
    if (!currentRoomId || !currentPlayerId) return
    status.value = 'connecting'
    const supabase = getSupabase()
    channel = supabase.channel(`room:${currentRoomId}`)
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState() as Record<string, Array<{ playerId: string }>>
      const next = new Set<string>()
      for (const arr of Object.values(state)) {
        for (const m of arr) next.add(m.playerId)
      }
      online.value = next
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
    online.value = new Set()
  }

  async function stop() {
    detachWindowHandlers()
    clearAwayTimer()
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
