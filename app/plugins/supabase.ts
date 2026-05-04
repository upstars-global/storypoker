import { createClient } from '@supabase/supabase-js'
import { setSupabase } from '~/lib/supabase-instance'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const supabase = createClient(
    config.public.supabaseUrl as string,
    config.public.supabaseKey as string
  )
  setSupabase(supabase)
  return {
    provide: { supabase }
  }
})
