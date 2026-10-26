import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { i18n } from '~/i18n'
import AuthModal from '~/components/AuthModal'
import { useAuthStore } from '~/stores/auth'
import { resetStores } from '../../support/helpers/resetStores'

function mount(mode: 'signin' | 'signup', onClose = vi.fn(), onSuccess = vi.fn()) {
  render(
    <MemoryRouter>
      <AuthModal
        mode={mode}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    </MemoryRouter>,
  )
  return { onClose, onSuccess }
}

function emailInput() {
  return document.getElementById('auth-email') as HTMLInputElement
}

function passwordInput() {
  return document.getElementById('auth-password') as HTMLInputElement
}

function submitButton(label: string) {
  return screen.getByRole('button', { name: label })
}

beforeEach(async () => {
  await resetStores()
})

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

describe('AuthModal', () => {
  it('shows validation errors without calling the store', async () => {
    const signIn = vi.fn()
    useAuthStore.setState({ signIn })
    mount('signin')
    await act(async () => {
      fireEvent.click(submitButton(i18n.t('common.signIn')))
    })
    expect(screen.getByText('Email is required').className).toBe('text-sm mt-1 text-danger')
    expect(screen.getByText('Password is required').className).toBe('text-sm text-danger')
    expect(emailInput().classList.contains('is-error')).toBe(true)
    expect(signIn).not.toHaveBeenCalled()
  })

  it('signs in with trimmed email and fires success then close', async () => {
    const signIn = vi.fn().mockResolvedValue(undefined)
    useAuthStore.setState({ signIn })
    const { onClose, onSuccess } = mount('signin')
    expect(document.getElementById('auth-modal-title')?.textContent).toBe(i18n.t('auth.signInTitle'))
    expect(screen.getByRole('link', { name: i18n.t('auth.forgotPassword') }).getAttribute('href')).toBe('/forgot-password')
    fireEvent.change(emailInput(), { target: { value: '  a@b.co ' } })
    fireEvent.change(passwordInput(), { target: { value: 'secret1' } })
    await act(async () => {
      fireEvent.keyUp(passwordInput(), { key: 'Enter' })
    })
    expect(signIn).toHaveBeenCalledWith('a@b.co', 'secret1')
    expect(onSuccess).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('signs up in signup mode and shows the moderator caption', async () => {
    const signUp = vi.fn().mockResolvedValue(undefined)
    useAuthStore.setState({ signUp })
    mount('signup')
    expect(screen.getByText(i18n.t('auth.gainModeratorPowers')).className).toBe('mui-caption text-center mt-2 text-muted')
    expect(screen.queryByRole('link', { name: i18n.t('auth.forgotPassword') })).toBeNull()
    expect(passwordInput().autocomplete).toBe('new-password')
    fireEvent.change(emailInput(), { target: { value: 'a@b.co' } })
    fireEvent.change(passwordInput(), { target: { value: 'secret1' } })
    await act(async () => {
      fireEvent.click(submitButton(i18n.t('common.signUp')))
    })
    expect(signUp).toHaveBeenCalledWith('a@b.co', 'secret1')
  })

  it('shows the server error and stays open', async () => {
    const signIn = vi.fn().mockRejectedValue(new Error('Invalid login credentials'))
    useAuthStore.setState({ signIn })
    const { onClose } = mount('signin')
    fireEvent.change(emailInput(), { target: { value: 'a@b.co' } })
    fireEvent.change(passwordInput(), { target: { value: 'secret1' } })
    await act(async () => {
      fireEvent.click(submitButton(i18n.t('common.signIn')))
    })
    expect(screen.getByText('Invalid login credentials').className).toBe('text-sm text-danger')
    expect(onClose).not.toHaveBeenCalled()
  })
})
