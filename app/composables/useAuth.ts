export function useAuth() {
  const { $supabase } = useNuxtApp()
  const user = useState<any>('auth_user', () => null)

  async function init() {
    const { data } = await $supabase.auth.getSession()
    user.value = data.session?.user ?? null
    $supabase.auth.onAuthStateChange((_event, session) => {
      user.value = session?.user ?? null
    })
  }

  async function signIn(email: string, password: string) {
    const { error } = await $supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function signUp(email: string, password: string) {
    const { error } = await $supabase.auth.signUp({ email, password })
    if (error) throw error
  }

  async function signOut() {
    await $supabase.auth.signOut()
  }

  return { user, init, signIn, signUp, signOut }
}
