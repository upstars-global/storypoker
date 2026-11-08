import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

function browserLanguages(languages: readonly string[] | undefined, language: string) {
  vi.stubGlobal('navigator', { languages, language })
}

describe('i18n document language', () => {
  beforeEach(() => {
    vi.resetModules()
    localStorage.clear()
    document.documentElement.lang = ''
    browserLanguages([], 'fr-FR')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it.each(['uk', 'en'])('prefers saved %s over browser languages', async (locale) => {
    browserLanguages([locale === 'uk' ? 'en-US' : 'uk-UA'], 'fr')
    localStorage.setItem('sp-lang', locale)
    const { i18n } = await import('~/i18n')
    expect(i18n.language).toBe(locale)
    expect(document.documentElement.lang).toBe(locale)
  })

  it.each([
    [['de-DE', 'uk-UA', 'en-US'], 'uk'],
    [['fr', 'en-GB', 'uk'], 'en'],
    [['de', 'UK-ua'], 'uk'],
    [['EN-us'], 'en'],
    [['fr', 'de'], 'en'],
  ])('selects the first supported browser language in %j', async (languages, expected) => {
    browserLanguages(languages, 'uk')
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    const { i18n } = await import('~/i18n')
    expect(i18n.language).toBe(expected)
    expect(document.documentElement.lang).toBe(expected)
    expect(setItem).not.toHaveBeenCalled()
  })

  it('ignores invalid saved values and uses browser preferences without writing', async () => {
    localStorage.setItem('sp-lang', 'de')
    browserLanguages(['uk-UA'], 'en')
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    const { i18n } = await import('~/i18n')
    expect(i18n.language).toBe('uk')
    expect(localStorage.getItem('sp-lang')).toBe('de')
    expect(setItem).not.toHaveBeenCalled()
  })

  it.each([undefined, []])('uses navigator.language when languages is unavailable or empty', async (languages) => {
    browserLanguages(languages, 'UK-ua')
    const { i18n } = await import('~/i18n')
    expect(i18n.language).toBe('uk')
    expect(document.documentElement.lang).toBe('uk')
    expect(localStorage.getItem('sp-lang')).toBeNull()
  })

  it('falls back to en when navigator.language is unsupported', async () => {
    const { i18n } = await import('~/i18n')
    expect(i18n.language).toBe('en')
    expect(document.documentElement.lang).toBe('en')
  })

  it('uses browser preferences when storage reads fail', async () => {
    browserLanguages(['uk-UA'], 'en')
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied') })
    const { i18n } = await import('~/i18n')
    expect(i18n.language).toBe('uk')
    expect(document.documentElement.lang).toBe('uk')
  })

  it('persists both manual switches and updates document language', async () => {
    const { i18n, persistLocale } = await import('~/i18n')
    for (const locale of ['uk', 'en']) {
      await persistLocale(locale)
      expect(localStorage.getItem('sp-lang')).toBe(locale)
      expect(i18n.language).toBe(locale)
      expect(document.documentElement.lang).toBe(locale)
    }
  })

  it('updates language and document when storage writes fail', async () => {
    const { i18n, persistLocale } = await import('~/i18n')
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('denied') })
    await persistLocale('uk')
    expect(i18n.language).toBe('uk')
    expect(document.documentElement.lang).toBe('uk')
  })

  it('interpolates {name} placeholders', async () => {
    localStorage.setItem('sp-lang', 'uk')
    const { i18n } = await import('~/i18n')
    i18n.addResource('uk', 'translation', 'test.hello', 'Привіт, {name}!')
    expect(i18n.t('test.hello', { name: 'Іра' })).toBe('Привіт, Іра!')
  })
})
