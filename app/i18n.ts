import { createI18n } from 'vue-i18n'
import uk from '~/i18n/locales/uk.json'
import en from '~/i18n/locales/en.json'

export const i18n = createI18n({
  legacy: false,
  locale: 'uk',
  fallbackLocale: 'en',
  messages: { uk, en },
})
