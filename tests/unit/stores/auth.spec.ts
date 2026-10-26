import { beforeEach, describe, expect, it, vi } from 'vitest'

import { resetSupabase, setSupabase } from '~/lib/supabase-instance'
import { useAuthStore } from '~/stores/auth'
import { asSupabase } from '../../support/helpers/fakeSupabase'
import { resetStores } from '../../support/helpers/resetStores'

describe('auth store init', () => {
  it('gives every concurrent caller the restored session', async () => {
    vi.resetModules()
    const instance = await import('~/lib/supabase-instance')
    const { useAuthStore: freshAuthStore } = await import('~/stores/auth')
    let resolveSession: (value: { data: { session: { user: { id: string } } } }) => void = () => {}
    instance.setSupabase(asSupabase({
      auth: {
        getSession: vi.fn().mockReturnValue(new Promise(resolve => {
          resolveSession = resolve
        })),
        onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      },
    }))
    const first = freshAuthStore.getState().init()
    const second = freshAuthStore.getState().init().then(() => freshAuthStore.getState().user?.id)
    resolveSession({ data: { session: { user: { id: 'u1' } } } })
    await first
    await expect(second).resolves.toBe('u1')
  })
})

describe('auth store', () => {
  beforeEach(async () => {
    resetSupabase()
    await resetStores()
  })

  it('requests a password reset email with the provided redirect URL', async () => {
    const resetPasswordForEmail = vi.fn().mockResolvedValue({ error: null })
    setSupabase(asSupabase({
      auth: { resetPasswordForEmail },
    }))

    const store = useAuthStore.getState()
    await store.requestPasswordReset('user@example.com', 'https://app.example/reset-password')

    expect(resetPasswordForEmail).toHaveBeenCalledWith('user@example.com', {
      redirectTo: 'https://app.example/reset-password',
    })
  })

  it('updates the authenticated user password', async () => {
    const updateUser = vi.fn().mockResolvedValue({ error: null })
    setSupabase(asSupabase({
      auth: { updateUser },
    }))

    const store = useAuthStore.getState()
    await store.updatePassword('new-secret')

    expect(updateUser).toHaveBeenCalledWith({ password: 'new-secret' })
  })

  it('throws Supabase auth errors from password reset actions', async () => {
    const error = new Error('Reset failed')
    setSupabase(asSupabase({
      auth: {
        resetPasswordForEmail: vi.fn().mockResolvedValue({ error }),
        updateUser: vi.fn().mockResolvedValue({ error }),
      },
    }))

    const store = useAuthStore.getState()
    await expect(store.requestPasswordReset('user@example.com', 'https://app.example/reset-password')).rejects.toThrow('Reset failed')
    await expect(store.updatePassword('new-secret')).rejects.toThrow('Reset failed')
  })
})
