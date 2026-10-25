import { create } from 'zustand'
import { getSupabase } from '~/lib/supabase-instance'
import type { User } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  init: () => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  requestPasswordReset: (email: string, redirectTo: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
  signOut: () => Promise<void>
}

let initialized = false

export const useAuthStore = create<AuthState>()(set => ({
  user: null,

  async init() {
    if (initialized) return
    initialized = true
    const supabase = getSupabase()
    const { data } = await supabase.auth.getSession()
    set({ user: data.session?.user ?? null })
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ user: session?.user ?? null })
    })
  },

  async signIn(email, password) {
    const { error } = await getSupabase().auth.signInWithPassword({ email, password })
    if (error) throw error
  },

  async signUp(email, password) {
    const { error } = await getSupabase().auth.signUp({ email, password })
    if (error) throw error
  },

  async requestPasswordReset(email, redirectTo) {
    const { error } = await getSupabase().auth.resetPasswordForEmail(email, { redirectTo })
    if (error) throw error
  },

  async updatePassword(password) {
    const { error } = await getSupabase().auth.updateUser({ password })
    if (error) throw error
  },

  async signOut() {
    await getSupabase().auth.signOut()
  },
}))
