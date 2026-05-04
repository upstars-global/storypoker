import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getSupabase } from '~/lib/supabase-instance'
import type { User } from '@supabase/supabase-js'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  let initialized = false

  async function init() {
    if (initialized) return
    initialized = true
    const supabase = getSupabase()
    const { data } = await supabase.auth.getSession()
    user.value = data.session?.user ?? null
    supabase.auth.onAuthStateChange((_event, session) => {
      user.value = session?.user ?? null
    })
  }

  async function signIn(email: string, password: string) {
    const { error } = await getSupabase().auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function signUp(email: string, password: string) {
    const { error } = await getSupabase().auth.signUp({ email, password })
    if (error) throw error
  }

  async function signOut() {
    await getSupabase().auth.signOut()
  }

  return { user, init, signIn, signUp, signOut }
})
