import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getSupabase } from '~/lib/supabase-instance'
import type { ConnectionStatus } from './types'

export const usePresenceStore = defineStore('presence', () => {
  const status = ref<ConnectionStatus>('connecting')
  const online = ref<Set<string>>(new Set())

  let channel: any = null
  let currentRoomId: string | null = null
  let currentPlayerId: string | null = null
  let visibilityHandler: (() => void) | null = null
  let onlineHandler: (() => void) | null = null
  let offlineHandler: (() => void) | null = null

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
    await closeChannel()
    status.value = 'offline'
  }

  function attachWindowHandlers() {
    if (typeof document === 'undefined') return
    visibilityHandler = async () => {
      if (document.visibilityState === 'hidden') {
        await closeChannel()
        status.value = 'offline'
      } else if (document.visibilityState === 'visible') {
        if (status.value === 'offline' || status.value === 'reconnecting') {
          await openChannel()
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
