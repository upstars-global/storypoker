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
    expect(i18n.language).toBe('en')
    expect(document.documentElement.lang).toBe('en')
  })

  it('falls back to uk when nothing is stored', async () => {
    const { i18n } = await import('~/i18n')
    expect(i18n.language).toBe('uk')
    expect(document.documentElement.lang).toBe('uk')
  })

  it('falls back to uk when the stored locale is unsupported', async () => {
    localStorage.setItem('sp-lang', 'de')
    const { i18n } = await import('~/i18n')
    expect(i18n.language).toBe('uk')
  })

  it('persistLocale updates storage, language and html lang', async () => {
    const { i18n, persistLocale } = await import('~/i18n')
    await persistLocale('en')
    expect(localStorage.getItem('sp-lang')).toBe('en')
    expect(i18n.language).toBe('en')
    expect(document.documentElement.lang).toBe('en')
  })

  it('interpolates {name} placeholders', async () => {
    const { i18n } = await import('~/i18n')
    i18n.addResource('uk', 'translation', 'test.hello', 'Привіт, {name}!')
    expect(i18n.t('test.hello', { name: 'Іра' })).toBe('Привіт, Іра!')
  })
})
