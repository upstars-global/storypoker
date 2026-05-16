import { describe, expect, it } from 'vitest'

import {
  validateEmail,
  validatePasswordConfirmation,
  validateRequiredPassword,
} from '~/utils/authValidation'

describe('auth validation', () => {
  it('requires a syntactically valid email address', () => {
    expect(validateEmail('')).toBe('Email is required')
    expect(validateEmail('not-an-email')).toBe('Enter a valid email')
    expect(validateEmail('user@example.com')).toBeUndefined()
  })

  it('enforces the shared minimum password length', () => {
    expect(validateRequiredPassword('')).toBe('Password is required')
    expect(validateRequiredPassword('12345')).toBe('Min 6 characters')
    expect(validateRequiredPassword('123456')).toBeUndefined()
  })

  it('requires matching password confirmation', () => {
    expect(validatePasswordConfirmation('secret1', 'secret2')).toBe('Passwords do not match')
    expect(validatePasswordConfirmation('secret1', 'secret1')).toBeUndefined()
  })
})
