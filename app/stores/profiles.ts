import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getSupabase } from '~/lib/supabase-instance'
import type { AvatarStyle } from '~/composables/useDylanAvatar'

export interface UserProfile {
  user_id: string
  avatar_style: AvatarStyle
  avatar_seed: string
}

type RealtimePayload = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: UserProfile
  old: Partial<UserProfile>
}

export const useProfilesStore = defineStore('profiles', () => {
  const profiles = ref<Record<string, UserProfile>>({})
  const inflight = new Map<string, Promise<UserProfile | null>>()

  function get(userId: string | null | undefined): UserProfile | null {
    if (!userId) return null
    return profiles.value[userId] ?? null
  }

  async function fetchOne(userId: string): Promise<UserProfile | null> {
    if (profiles.value[userId]) return profiles.value[userId]
    const existing = inflight.get(userId)
    if (existing) return existing
    const promise = (async () => {
      const { data } = await getSupabase()
        .from('user_profiles')
        .select('user_id, avatar_style, avatar_seed')
        .eq('user_id', userId)
        .maybeSingle()
      if (data) profiles.value[userId] = data as UserProfile
      inflight.delete(userId)
      return (data as UserProfile | null) ?? null
    })()
    inflight.set(userId, promise)
    return promise
  }

  async function fetchMany(userIds: string[]): Promise<void> {
    const missing = Array.from(new Set(userIds.filter(id => id && !profiles.value[id])))
    if (missing.length === 0) return
    const { data } = await getSupabase()
      .from('user_profiles')
      .select('user_id, avatar_style, avatar_seed')
      .in('user_id', missing)
    for (const row of (data ?? []) as UserProfile[]) {
      profiles.value[row.user_id] = row
    }
  }

  async function upsert(profile: UserProfile): Promise<void> {
    const supabase = getSupabase()
    const { error } = await supabase
      .from('user_profiles')
      .upsert({ ...profile, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    if (error) throw error
    profiles.value[profile.user_id] = profile
  }

  function applyChange(payload: RealtimePayload) {
    if (payload.eventType === 'DELETE') {
      const id = (payload.old as any).user_id
      if (id) delete profiles.value[id]
      return
    }
    const row = payload.new
    if (row?.user_id) profiles.value[row.user_id] = row
  }

  return { profiles, get, fetchOne, fetchMany, upsert, applyChange }
})
