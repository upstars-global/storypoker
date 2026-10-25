import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import type { User } from '@supabase/supabase-js'
import { i18n } from '~/i18n'
import LoginPage from '~/pages/login'
import SignupPage from '~/pages/signup'
import ForgotPasswordPage from '~/pages/forgot-password'
import ResetPasswordPage from '~/pages/reset-password'
import { resetSupabase, setSupabase } from '~/lib/supabase-instance'
import { useAuthStore } from '~/stores/auth'
import { asSupabase } from '../../support/helpers/fakeSupabase'
import { resetStores } from '../../support/helpers/resetStores'

const user = { id: 'u1', email: 'a@b.co' } as User

async function mountAt(path: string, page: ReactNode) {
  await act(async () => {
    render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/" element={<div data-testid="home-page" />} />
          <Route path={path} element={page} />
        </Routes>
      </MemoryRouter>,
    )
  })
}

function byId(id: string) {
  return document.getElementById(id) as HTMLInputElement
}

async function submit(testid: string) {
  await act(async () => {
    fireEvent.click(screen.getByTestId(testid))
  })
}

beforeEach(async () => {
  resetSupabase()
  await resetStores()
  useAuthStore.setState({ init: vi.fn().mockResolvedValue(undefined) })
})

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

describe('login page', () => {
  it('redirects home when a user is already signed in', async () => {
    useAuthStore.setState({ user })
    await mountAt('/login', <LoginPage />)
    expect(screen.getByTestId('home-page')).toBeTruthy()
  })

  it('validates fields before signing in', async () => {
    const signIn = vi.fn()
    useAuthStore.setState({ signIn })
    await mountAt('/login', <LoginPage />)
    fireEvent.change(screen.getByTestId('login-email'), { target: { value: 'a@b' } })
    await submit('login-submit')
    expect(screen.getByText('Enter a valid email').className).toBe('text-sm mt-1 text-danger')
    expect(screen.getByText('Password is required').className).toBe('text-sm text-danger')
    expect(screen.getByTestId('login-email').classList.contains('is-error')).toBe(true)
    expect(signIn).not.toHaveBeenCalled()
  })

  it('signs in with the trimmed email and navigates home', async () => {
    const signIn = vi.fn().mockResolvedValue(undefined)
    useAuthStore.setState({ signIn })
    await mountAt('/login', <LoginPage />)
    expect(screen.getByRole('link', { name: i18n.t('auth.forgotPassword') }).getAttribute('href')).toBe('/forgot-password')
    expect(screen.getByRole('link', { name: i18n.t('common.signUp') }).getAttribute('href')).toBe('/signup')
    fireEvent.change(screen.getByTestId('login-email'), { target: { value: ' a@b.co ' } })
    fireEvent.change(screen.getByTestId('login-password'), { target: { value: 'secret1' } })
    await submit('login-submit')
    expect(signIn).toHaveBeenCalledWith('a@b.co', 'secret1')
    expect(screen.getByTestId('home-page')).toBeTruthy()
  })

  it('shows the server error', async () => {
    useAuthStore.setState({ signIn: vi.fn().mockRejectedValue(new Error('Invalid login credentials')) })
    await mountAt('/login', <LoginPage />)
    fireEvent.change(screen.getByTestId('login-email'), { target: { value: 'a@b.co' } })
    fireEvent.change(screen.getByTestId('login-password'), { target: { value: 'secret1' } })
    await submit('login-submit')
    expect(screen.getByText('Invalid login credentials').className).toBe('text-sm text-danger')
    expect((screen.getByTestId('login-submit') as HTMLButtonElement).disabled).toBe(false)
  })

  it('attaches the ripple to the submit button', async () => {
    await mountAt('/login', <LoginPage />)
    const button = screen.getByTestId('login-submit')
    expect(button.getAttribute('type')).toBe('submit')
    fireEvent.pointerDown(button, { clientX: 1, clientY: 1 })
    expect(button.querySelector('[data-ripple-container]')).not.toBeNull()
  })
})

describe('signup page', () => {
  it('requires matching passwords', async () => {
    const signUp = vi.fn()
    useAuthStore.setState({ signUp })
    await mountAt('/signup', <SignupPage />)
    fireEvent.change(screen.getByTestId('signup-email'), { target: { value: 'a@b.co' } })
    fireEvent.change(screen.getByTestId('signup-password'), { target: { value: 'secret1' } })
    fireEvent.change(screen.getByTestId('signup-confirm'), { target: { value: 'secret2' } })
    await submit('signup-submit')
    expect(screen.getByText('Passwords do not match')).toBeTruthy()
    expect(screen.getByTestId('signup-confirm').getAttribute('name')).toBe('confirm-password')
    expect(signUp).not.toHaveBeenCalled()
  })

  it('shows the confirmation message and stays on the page after sign up', async () => {
    const signUp = vi.fn().mockImplementation(async () => {
      useAuthStore.setState({ user })
    })
    useAuthStore.setState({ signUp })
    await mountAt('/signup', <SignupPage />)
    fireEvent.change(screen.getByTestId('signup-email'), { target: { value: 'a@b.co' } })
    fireEvent.change(screen.getByTestId('signup-password'), { target: { value: 'secret1' } })
    fireEvent.change(screen.getByTestId('signup-confirm'), { target: { value: 'secret1' } })
    await submit('signup-submit')
    expect(signUp).toHaveBeenCalledWith('a@b.co', 'secret1')
    expect(screen.getByTestId('signup-success').textContent).toContain(i18n.t('signup.confirmEmail'))
    expect(screen.queryByTestId('home-page')).toBeNull()
  })
})

describe('forgot password page', () => {
  it('requests a reset link pointing at /reset-password', async () => {
    const requestPasswordReset = vi.fn().mockResolvedValue(undefined)
    useAuthStore.setState({ requestPasswordReset })
    await mountAt('/forgot-password', <ForgotPasswordPage />)
    fireEvent.change(byId('forgot-email'), { target: { value: 'a@b.co' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: i18n.t('forgotPassword.sendResetLink') }))
    })
    expect(requestPasswordReset).toHaveBeenCalledWith('a@b.co', `${window.location.origin}/reset-password`)
    expect(screen.getByText(i18n.t('forgotPassword.checkEmail'))).toBeTruthy()
  })
})

describe('reset password page', () => {
  function fakeAuth(session: object | null) {
    const unsubscribe = vi.fn()
    setSupabase(asSupabase({
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session } }),
        onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe } } }),
      },
    }))
    return unsubscribe
  }

  it('asks for the email link when there is no recovery session', async () => {
    const unsubscribe = fakeAuth(null)
    await mountAt('/reset-password', <ResetPasswordPage />)
    expect(screen.getByText(i18n.t('resetPassword.openLink'))).toBeTruthy()
    expect(screen.getByRole('link', { name: i18n.t('resetPassword.requestNewLink') }).getAttribute('href')).toBe('/forgot-password')
    cleanup()
    expect(unsubscribe).toHaveBeenCalled()
  })

  it('updates the password, signs out and confirms', async () => {
    fakeAuth({ user })
    const updatePassword = vi.fn().mockResolvedValue(undefined)
    const signOut = vi.fn().mockResolvedValue(undefined)
    useAuthStore.setState({ user, updatePassword, signOut })
    await mountAt('/reset-password', <ResetPasswordPage />)
    expect(screen.queryByTestId('home-page')).toBeNull()
    fireEvent.change(byId('reset-password'), { target: { value: 'secret1' } })
    fireEvent.change(byId('reset-confirm'), { target: { value: 'secret1' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: i18n.t('resetPassword.updatePassword') }))
    })
    expect(updatePassword).toHaveBeenCalledWith('secret1')
    expect(signOut).toHaveBeenCalled()
    expect(screen.getByText(i18n.t('resetPassword.updated'))).toBeTruthy()
  })
})
