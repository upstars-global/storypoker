import { create } from 'zustand'
import { getSupabase } from '~/lib/supabase-instance'
import type { AvatarStyle } from '~/composables/useDylanAvatar'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

export interface UserProfile {
  user_id: string
  avatar_style: AvatarStyle
  avatar_seed: string
  avatar_url: string | null
  updated_at?: string | null
}

interface ProfilesState {
  profiles: Record<string, UserProfile>
  get: (userId: string | null | undefined) => UserProfile | null
  fetchOne: (userId: string) => Promise<UserProfile | null>
  fetchMany: (userIds: string[]) => Promise<void>
  upsert: (profile: UserProfile) => Promise<void>
  uploadAvatar: (userId: string, blob: Blob) => Promise<string>
  removeAvatar: (userId: string) => Promise<void>
  applyChange: (payload: RealtimePostgresChangesPayload<UserProfile>) => void
}

const PROFILE_COLUMNS = 'user_id, avatar_style, avatar_seed, avatar_url, updated_at'

const inflight = new Map<string, Promise<UserProfile | null>>()

export const useProfilesStore = create<ProfilesState>()((set, get) => {
  function cache(rows: UserProfile[]) {
    if (rows.length === 0) return
    set(s => {
      const profiles = { ...s.profiles }
      for (const row of rows) profiles[row.user_id] = row
      return { profiles }
    })
  }

  return {
    profiles: {},

    get(userId) {
      if (!userId) return null
      return get().profiles[userId] ?? null
    },

    async fetchOne(userId) {
      const cached = get().profiles[userId]
      if (cached) return cached
      const existing = inflight.get(userId)
      if (existing) return existing
      const promise = (async () => {
        const { data } = await getSupabase()
          .from('user_profiles')
          .select(PROFILE_COLUMNS)
          .eq('user_id', userId)
          .maybeSingle()
        if (data) cache([data as UserProfile])
        inflight.delete(userId)
        return (data as UserProfile | null) ?? null
      })()
      inflight.set(userId, promise)
      return promise
    },

    async fetchMany(userIds) {
      const profiles = get().profiles
      const missing = Array.from(new Set(userIds.filter(id => id && !profiles[id])))
      if (missing.length === 0) return
      const { data } = await getSupabase()
        .from('user_profiles')
        .select(PROFILE_COLUMNS)
        .in('user_id', missing)
      cache((data ?? []) as UserProfile[])
    },

    async upsert(profile) {
      const row: UserProfile = { ...profile, updated_at: new Date().toISOString() }
      const { error } = await getSupabase()
        .from('user_profiles')
        .upsert(row, { onConflict: 'user_id' })
      if (error) throw error
      cache([row])
    },

    async uploadAvatar(userId, blob) {
      const path = `${userId}/avatar.webp`
      const { error } = await getSupabase().storage
        .from('avatars')
        .upload(path, blob, { upsert: true, contentType: 'image/webp' })
      if (error) throw error
      return path
    },

    async removeAvatar(userId) {
      const { error } = await getSupabase().storage
        .from('avatars')
        .remove([`${userId}/avatar.webp`])
      if (error) throw error
    },

    applyChange(payload) {
      if (payload.eventType === 'DELETE') {
        const id = payload.old.user_id
        if (id) {
          set(s => {
            const profiles = { ...s.profiles }
            delete profiles[id]
            return { profiles }
          })
        }
        return
      }
      const row = payload.new
      if (row.user_id) cache([row])
    },
  }
})
