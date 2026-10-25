import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import type { TypedSupabaseClient } from '~/lib/supabase-instance'

export function asSupabase(client: object): TypedSupabaseClient {
  return client as TypedSupabaseClient
}

export function changePayload<T extends object>(
  eventType: 'INSERT' | 'UPDATE' | 'DELETE',
  rows: { new?: Partial<T>; old?: Partial<T> },
): RealtimePostgresChangesPayload<T & Record<string, unknown>> {
  return {
    schema: 'public',
    table: '',
    commit_timestamp: '',
    errors: [],
    eventType,
    new: rows.new ?? {},
    old: rows.old ?? {},
  } as RealtimePostgresChangesPayload<T & Record<string, unknown>>
}
