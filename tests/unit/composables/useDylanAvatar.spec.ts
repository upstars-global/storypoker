import { describe, it, expect, beforeEach } from 'vitest'
import { setSupabase, resetSupabase } from '~/lib/supabase-instance'
import { useDylanAvatar } from '~/composables/useDylanAvatar'
import type { UserProfile } from '~/stores/profiles'

const { avatarDataUri, avatarSrcFor } = useDylanAvatar()

function profile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    user_id: 'u1',
    avatar_style: 'bottts',
    avatar_seed: 'seed-1',
    avatar_url: 'u1/avatar.webp',
    updated_at: '2026-08-02T10:00:00.000Z',
    ...overrides,
  }
}

beforeEach(() => {
  resetSupabase()
  setSupabase({
    storage: {
      from: (bucket: string) => ({
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://cdn.test/${bucket}/${path}` } }),
      }),
    },
  } as never)
})

describe('avatarSrcFor - custom avatars', () => {
  it('resolves the stored path to a public URL with updated_at as a cache buster', () => {
    const result = avatarSrcFor(profile(), 'fallback', false)
    expect(result.src).toBe('https://cdn.test/avatars/u1/avatar.webp?v=2026-08-02T10%3A00%3A00.000Z')
    expect(result.cssGrayscale).toBe(false)
  })

  it('keeps an empty version when updated_at is missing', () => {
    expect(avatarSrcFor(profile({ updated_at: null }), 'fallback', false).src)
      .toBe('https://cdn.test/avatars/u1/avatar.webp?v=')
    expect(avatarSrcFor(profile({ updated_at: undefined }), 'fallback', false).src)
      .toBe('https://cdn.test/avatars/u1/avatar.webp?v=')
  })

  it('asks for CSS grayscale when the player is offline', () => {
    const result = avatarSrcFor(profile(), 'fallback', true)
    expect(result.src).toContain('?v=')
    expect(result.cssGrayscale).toBe(true)
  })
})

describe('avatarSrcFor - DiceBear fallbacks', () => {
  it('renders the stored DiceBear style by avatar_seed when there is no url', () => {
    const result = avatarSrcFor(profile({ avatar_url: null }), 'fallback', false)
    expect(result.src).toBe(avatarDataUri('seed-1', false, 'bottts'))
    expect(result.cssGrayscale).toBe(false)
  })

  it('renders the stored DiceBear style with the DiceBear grayscale variant', () => {
    const result = avatarSrcFor(profile({ avatar_style: 'miniavs', avatar_url: null }), 'fallback', true)
    expect(result.src).toBe(avatarDataUri('seed-1', true, 'miniavs'))
    expect(result.cssGrayscale).toBe(false)
  })

  it('uses the fallback seed when there is no profile', () => {
    const result = avatarSrcFor(null, 'Alice', false)
    expect(result.src).toBe(avatarDataUri('Alice', false, 'bottts'))
    expect(result.cssGrayscale).toBe(false)
  })
})
