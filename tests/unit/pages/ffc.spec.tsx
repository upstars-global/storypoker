import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { i18n, persistLocale } from '~/i18n'
import FeatureFlagsPage from '~/pages/ffc'
import { resetSupabase } from '~/lib/supabase-instance'
import { useAuthStore } from '~/stores/auth'
import { resetStores } from '../../support/helpers/resetStores'

async function mountFfc() {
  await act(async () => {
    render(
      <MemoryRouter initialEntries={['/ffc']}>
        <FeatureFlagsPage />
      </MemoryRouter>,
    )
  })
}

beforeEach(async () => {
  resetSupabase()
  await resetStores()
  useAuthStore.setState({ init: vi.fn().mockResolvedValue(undefined) })
})

afterEach(async () => {
  cleanup()
  document.body.innerHTML = ''
  localStorage.clear()
  await i18n.changeLanguage('uk')
})

describe('feature flags page', () => {
  it('renders its strings in the current locale', async () => {
    await persistLocale('en')
    await mountFfc()
    expect(screen.getByRole('button', { name: 'Reset Feature Flags' })).toBeTruthy()
    expect(screen.queryByText('Скинути фіче-флаги')).toBeNull()
  })

  it('initializes auth on load', async () => {
    const init = vi.fn().mockResolvedValue(undefined)
    useAuthStore.setState({ init })
    await mountFfc()
    expect(init).toHaveBeenCalled()
  })

  it('opens the sign in modal from the header menu', async () => {
    await mountFfc()
    await act(async () => {
      fireEvent.click(screen.getByTestId('account-menu-button'))
    })
    await screen.findByRole('menu')
    await act(async () => {
      fireEvent.click(screen.getByTestId('auth-sign-in-menu-item'))
    })
    expect(document.getElementById('auth-modal-title')).toBeTruthy()
  })
})
