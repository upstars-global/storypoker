import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setSupabase, resetSupabase } from '~/lib/supabase-instance'
import { useProfilesStore } from '~/stores/profiles'

function fakeStorage() {
  const bucket = {
    upload: vi.fn().mockResolvedValue({ error: null }),
    remove: vi.fn().mockResolvedValue({ data: [{ name: 'u1/avatar.webp' }], error: null }),
  }
  return { bucket, storage: { from: vi.fn().mockReturnValue(bucket) } }
}

function fakeSelect(rows: unknown[]) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: rows[0] ?? null })
  const eq = vi.fn().mockReturnValue({ maybeSingle })
  const inFn = vi.fn().mockResolvedValue({ data: rows })
  const select = vi.fn().mockReturnValue({ eq, in: inFn })
  return { select, eq, maybeSingle, inFn }
}

describe('profilesStore - avatar storage', () => {
  beforeEach(() => resetSupabase())

  it('uploadAvatar uploads webp with upsert and returns the object path', async () => {
    const { bucket, storage } = fakeStorage()
    setSupabase({ storage } as any)
    const store = useProfilesStore()
    const blob = new Blob(['x'], { type: 'image/webp' })
    const path = await store.uploadAvatar('u1', blob)
    expect(storage.from).toHaveBeenCalledWith('avatars')
    expect(bucket.upload).toHaveBeenCalledWith('u1/avatar.webp', blob, {
      upsert: true,
      contentType: 'image/webp',
    })
    expect(path).toBe('u1/avatar.webp')
  })

  it('uploadAvatar throws on storage error', async () => {
    const { bucket, storage } = fakeStorage()
    bucket.upload.mockResolvedValue({ error: new Error('denied') })
    setSupabase({ storage } as any)
    const store = useProfilesStore()
    await expect(store.uploadAvatar('u1', new Blob())).rejects.toThrow('denied')
  })

  it('removeAvatar removes the fixed path', async () => {
    const { bucket, storage } = fakeStorage()
    setSupabase({ storage } as any)
    const store = useProfilesStore()
    await store.removeAvatar('u1')
    expect(bucket.remove).toHaveBeenCalledWith(['u1/avatar.webp'])
  })

  it('removeAvatar throws on storage error', async () => {
    const { bucket, storage } = fakeStorage()
    bucket.remove.mockResolvedValue({ data: null, error: new Error('denied') })
    setSupabase({ storage } as any)
    const store = useProfilesStore()
    await expect(store.removeAvatar('u1')).rejects.toThrow('denied')
  })
})

describe('profilesStore - upsert', () => {
  beforeEach(() => resetSupabase())

  it('caches exactly the row it wrote, including updated_at', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null })
    setSupabase({ from: vi.fn().mockReturnValue({ upsert }) } as any)
    const store = useProfilesStore()
    await store.upsert({
      user_id: 'u1',
      avatar_style: 'dylan',
      avatar_seed: 'seed',
      avatar_url: 'u1/avatar.webp',
    })
    const written = upsert.mock.calls[0]![0]
    expect(written.updated_at).toBeTruthy()
    expect(store.get('u1')).toEqual(written)
  })
})

describe('profilesStore - fetch', () => {
  beforeEach(() => resetSupabase())

  it('fetchOne selects avatar_url and caches the profile', async () => {
    const row = {
      user_id: 'u1',
      avatar_style: 'dylan',
      avatar_seed: 'seed',
      avatar_url: 'u1/avatar.webp',
      updated_at: '2026-08-02T00:00:00Z',
    }
    const { select } = fakeSelect([row])
    setSupabase({ from: vi.fn().mockReturnValue({ select }) } as any)
    const store = useProfilesStore()
    const profile = await store.fetchOne('u1')
    expect(select).toHaveBeenCalledWith('user_id, avatar_style, avatar_seed, avatar_url, updated_at')
    expect(profile?.avatar_url).toBe(row.avatar_url)
    expect(store.get('u1')).toEqual(row)
  })
})
