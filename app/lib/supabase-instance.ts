import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

export type TypedSupabaseClient = SupabaseClient<Database>

let _client: TypedSupabaseClient | null = null

export function initSupabase(): void {
  if (_client) return
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const key = import.meta.env.VITE_SUPABASE_KEY as string | undefined
  if (!url || !key) {
    throw new Error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_KEY in env')
  }
  _client = createClient<Database>(url, key)
}

export function setSupabase(client: TypedSupabaseClient): void {
  _client = client
}

export function getSupabase(): TypedSupabaseClient {
  if (!_client) throw new Error('Supabase client not initialized. Call initSupabase() or setSupabase() first.')
  return _client
}

export function resetSupabase(): void {
  _client = null
}
