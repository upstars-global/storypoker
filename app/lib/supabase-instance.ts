import type { SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

export function setSupabase(client: SupabaseClient): void {
  _client = client
}

export function getSupabase(): SupabaseClient {
  if (!_client) throw new Error('Supabase client not initialized. Call setSupabase() first.')
  return _client
}

export function resetSupabase(): void {
  _client = null
}
