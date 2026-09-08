import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('i18n document language', () => {
  beforeEach(() => {
    vi.resetModules()
    localStorage.clear()
    document.documentElement.lang = 'uk'
  })

  it('sets html lang from the stored locale on init', async () => {
    localStorage.setItem('sp-lang', 'en')
    const { i18n } = await import('~/i18n')
    expect(i18n.global.locale.value).toBe('en')
    expect(document.documentElement.lang).toBe('en')
  })

  it('falls back to uk when nothing is stored', async () => {
    await import('~/i18n')
    expect(document.documentElement.lang).toBe('uk')
  })

  it('persistLocale updates storage and html lang', async () => {
    const { persistLocale } = await import('~/i18n')
    persistLocale('en')
    expect(localStorage.getItem('sp-lang')).toBe('en')
    expect(document.documentElement.lang).toBe('en')
  })
})
