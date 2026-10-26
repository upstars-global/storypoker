import { afterEach, describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { i18n } from '~/i18n'
import PasswordInput from '~/components/PasswordInput'

function Harness({ onEnter = () => {}, error }: { onEnter?: () => void; error?: string }) {
  const [value, setValue] = useState('')
  return (
    <PasswordInput
      id="pw"
      label="Password"
      autocomplete="current-password"
      value={value}
      onChange={setValue}
      error={error}
      testid="pw-input"
      onEnter={onEnter}
    />
  )
}

afterEach(() => {
  cleanup()
})

describe('PasswordInput', () => {
  it('renders a floating-label password field with the default name', () => {
    render(<Harness />)
    const input = screen.getByTestId('pw-input') as HTMLInputElement
    expect(input.type).toBe('password')
    expect(input.name).toBe('password')
    expect(input.autocomplete).toBe('current-password')
    expect(input.placeholder).toBe(' ')
    expect(input.className).toBe('mui-input pr-12')
    expect(input.parentElement?.className).toBe('mui-field')
    expect(screen.getByLabelText('Password')).toBe(input)
  })

  it('toggles visibility with the adornment button', () => {
    render(<Harness />)
    const input = screen.getByTestId('pw-input') as HTMLInputElement
    const toggle = screen.getByRole('button', { name: i18n.t('common.showPassword') })
    expect(toggle.getAttribute('aria-pressed')).toBe('false')
    expect(toggle.getAttribute('tabindex')).toBe('-1')
    fireEvent.click(toggle)
    expect(input.type).toBe('text')
    expect(toggle.getAttribute('aria-pressed')).toBe('true')
    expect(toggle.getAttribute('aria-label')).toBe(i18n.t('common.hidePassword'))
  })

  it('updates the value and calls onEnter on Enter', () => {
    const onEnter = vi.fn()
    render(<Harness onEnter={onEnter} />)
    const input = screen.getByTestId('pw-input') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'secret' } })
    expect(input.value).toBe('secret')
    fireEvent.keyUp(input, { key: 'Enter' })
    expect(onEnter).toHaveBeenCalledTimes(1)
  })

  it('marks the input with is-error when an error is set', () => {
    render(<Harness error="Password is required" />)
    expect(screen.getByTestId('pw-input').classList.contains('is-error')).toBe(true)
  })
})
