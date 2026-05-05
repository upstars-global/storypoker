const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateEmail(email: string) {
  if (!email) return 'Email is required'
  if (!emailRe.test(email)) return 'Enter a valid email'
  return undefined
}

export function validateRequiredPassword(password: string) {
  if (!password) return 'Password is required'
  if (password.length < 6) return 'Min 6 characters'
  return undefined
}

export function validatePasswordConfirmation(password: string, confirmation: string) {
  if (confirmation !== password) return 'Passwords do not match'
  return undefined
}
