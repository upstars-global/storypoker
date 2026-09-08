import { createI18n } from 'vue-i18n'
import uk from '~/i18n/locales/uk.json'
import en from '~/i18n/locales/en.json'

const STORAGE_KEY = 'sp-lang'
const LOCALES = ['uk', 'en']

function storedLocale(): string {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    if (value && LOCALES.includes(value)) return value
  } catch {}
  return 'uk'
}

function applyDocumentLang(code: string) {
  document.documentElement.lang = code
}

export function persistLocale(code: string) {
  try { localStorage.setItem(STORAGE_KEY, code) } catch {}
  applyDocumentLang(code)
}

const initialLocale = storedLocale()
applyDocumentLang(initialLocale)

export const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: initialLocale,
  fallbackLocale: 'en',
  messages: { uk, en },
})
