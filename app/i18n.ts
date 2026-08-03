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

export function persistLocale(code: string) {
  try { localStorage.setItem(STORAGE_KEY, code) } catch {}
}

export const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: storedLocale(),
  fallbackLocale: 'en',
  messages: { uk, en },
})
