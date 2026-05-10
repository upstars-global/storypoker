import { resolve } from 'path'
import { config as loadDotenv } from 'dotenv'

loadDotenv({ path: resolve(__dirname, '.env/.env.local') })
loadDotenv({ path: resolve(__dirname, '.env/.env') })

export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  app: {
    head: {
      titleTemplate: '%s | Story Poker',
      htmlAttrs: { lang: 'uk' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#455a64' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;600;700&display=swap' },
      ],
      script: [
        {
          innerHTML: `(function(){try{var s=localStorage.getItem('sp-theme');var t=(s==='light'||s==='dark')?s:(window.matchMedia&&window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`,
          tagPosition: 'head',
        },
      ],
    }
  },
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss', '@pinia/nuxt', '@nuxtjs/i18n'],
  i18n: {
    defaultLocale: 'uk',
    locales: [
      { code: 'uk', file: 'uk.json' },
      { code: 'en', file: 'en.json' },
    ],
    langDir: 'locales',
    strategy: 'no_prefix',
  },
  tailwindcss: {
    cssPath: resolve(__dirname, 'assets/css/main.css'),
  },
  runtimeConfig: {
    public: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseKey: process.env.SUPABASE_KEY,
    },
    vite: {
      optimizeDeps: {
        include: [
          '@vue/devtools-core',
          '@vue/devtools-kit',
          '@supabase/supabase-js',
          'v-wave',
          '@dicebear/core',
          '@dicebear/collection',
        ]
      }
    },
  },
})
