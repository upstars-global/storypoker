# Vue + Vite Migration — Design

**Date:** 2026-05-16
**Status:** Spec — pending implementation plan
**Branch:** `vue-and-vite`
**Related:** [`ROADMAP.md`](../../../ROADMAP.md), [`CLAUDE.md`](../../../CLAUDE.md)

---

## Context

Story Poker зараз працює на Nuxt 4.4 у SSG-режимі (`nuxt generate` → Netlify static). Реальна продакшн-поведінка — pure SPA: усе client-only проти Supabase (Auth + Postgres + Realtime + Presence), SSR/SSG не дає бізнес-вигоди, лише overhead у dep-surface, bundle size і build time. Спеціальних SEO-вимог немає (приватні кімнати по slug).

## Goals

- Перевести Story Poker з Nuxt 4 на чистий Vue 3 + Vite 6 SPA, зберігши 100% функціональності і UI без візуальних регресій.
- Зменшити dep-surface (видалити Nuxt-екосистему).
- Прискорити dev/build/HMR і зменшити production bundle (фіксуємо before/after метрики).
- Перейти на явні імпорти і явний `vue-router` (без `unplugin-auto-import` і `vite-plugin-pages`).

## Non-goals

- Жодних змін у бізнес-логіці, store API, схемі БД, Supabase realtime, i18n-ключах, UI-компонентах за межами імпортів.
- Не мігруємо на Tailwind v4 (фіксується в ROADMAP як наступний крок).
- Не перейменовуємо `app/` → `src/` (Vite-конвенція, але `app/` як srcDir підтримується через alias).
- Не змінюємо JSON-структуру локалей.
- Не вводимо `@unhead/vue` — `<head>` повністю в статичному `index.html`.

---

## Dependency changes

### Add
- `vite@^6`
- `@vitejs/plugin-vue@^5`
- `vue-tsc` (явно, не транзитивно)
- `vue-i18n@^10` (runtime compilation)
- `@iconify/vue@^4` (`@iconify-json/ic` уже є)
- `eslint-plugin-vue@^9` + `@vue/eslint-config-typescript@^13` + `vue-eslint-parser`
- `autoprefixer` + `postcss` (явно)

### Remove
- `nuxt`
- `@nuxt/eslint`
- `@nuxt/icon`
- `@nuxtjs/i18n`
- `@nuxtjs/tailwindcss`
- `@pinia/nuxt`

### Keep
- `dotenv` — Vite сам читає `.env` через `envDir`, але `playwright.config.ts` досі використовує `loadDotenv({ path: '.env/.env.test' })` для E2E кредів (server-only ключі, не VITE_*).

### File-level removals
- `nuxt.config.ts`
- `.nuxt/`, `.output/`
- `nuxt prepare` у `postinstall`
- `vite.optimizeDeps.include` (Vite сам резолвить; повернемо, якщо HMR-cold start стане проблемою)

---

## File layout

```
/                          # vite root
├── index.html             # NEW — head/meta/inline theme script + entry script
├── vite.config.ts         # NEW
├── postcss.config.js      # NEW — tailwindcss + autoprefixer
├── tsconfig.json          # adjust — no Nuxt extends
├── tsconfig.node.json     # NEW — для vite.config.ts
├── eslint.config.js       # replace .eslintrc* / @nuxt/eslint
├── netlify.toml           # NEW
├── public/
│   └── _redirects         # NEW — /*  /index.html  200
├── app/                   # KEEP як srcDir, ~ alias → app/
│   ├── main.ts            # NEW — entry: createApp + pinia + router + i18n + plugins
│   ├── router.ts          # NEW — 6 explicit routes
│   ├── i18n.ts            # NEW — createI18n + locale messages import
│   ├── App.vue            # rename з app.vue, <NuxtPage /> → <RouterView />
│   ├── pages/             # KEEP файли, імпортуються router-ом явно
│   ├── components/        # KEEP
│   ├── composables/       # KEEP
│   ├── stores/            # KEEP
│   ├── lib/               # KEEP
│   ├── utils/             # KEEP
│   ├── directives/        # NEW — clickOutside переноситься сюди з plugins/
│   ├── assets/            # NEW — переносимо з кореня /assets/ (css/main.css + icons/)
│   └── i18n/locales/{uk,en}.json  # MOVE з /i18n/locales/ — чистіші import paths
└── tests/                 # KEEP без змін (Vitest standalone + Playwright)
```

---

## Wiring

### `index.html`

Усе з `nuxt.config.ts → app.head` переноситься статично. Theme script — ПЕРШИЙ у `<head>` (до Vite entry script), щоб уникнути FOUC при першому paint.

```html
<!doctype html>
<html lang="uk">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#455a64" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;600;700&display=swap" />
    <script>
      (function(){try{var s=localStorage.getItem('sp-theme');var t=(s==='light'||s==='dark')?s:'dark';document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();
    </script>
    <title>Story Poker</title>
    <script type="module" src="/app/main.ts"></script>
  </head>
  <body><div id="app"></div></body>
</html>
```

Dynamic `<title>` per route — у `router.afterEach(to => { document.title = to.meta.title ? `${to.meta.title} | Story Poker` : 'Story Poker' })`.

### `vite.config.ts`

```ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'node:path'

export default defineConfig({
  envDir: resolve(__dirname, '.env'),
  plugins: [vue()],
  resolve: {
    alias: {
      '~': resolve(__dirname, 'app'),
      '@': resolve(__dirname, 'app'),
    },
  },
  server: { host: true, port: 3000 },
  preview: { port: 3000 },
  build: { sourcemap: true },
})
```

### `app/router.ts`

```ts
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import HomePage from '~/pages/index.vue'
import LoginPage from '~/pages/login.vue'
import SignupPage from '~/pages/signup.vue'
import ForgotPasswordPage from '~/pages/forgot-password.vue'
import ResetPasswordPage from '~/pages/reset-password.vue'
import RoomPage from '~/pages/[slug].vue'

const routes: RouteRecordRaw[] = [
  { path: '/', component: HomePage, meta: { title: 'Home' } },
  { path: '/login', component: LoginPage, meta: { title: 'Sign in' } },
  { path: '/signup', component: SignupPage, meta: { title: 'Sign up' } },
  { path: '/forgot-password', component: ForgotPasswordPage, meta: { title: 'Forgot password' } },
  { path: '/reset-password', component: ResetPasswordPage, meta: { title: 'Reset password' } },
  { path: '/:slug', component: RoomPage },
]

export const router = createRouter({ history: createWebHistory(), routes })

router.afterEach((to) => {
  const title = to.meta.title as string | undefined
  document.title = title ? `${title} | Story Poker` : 'Story Poker'
})
```

`[slug].vue` — `useRoute().params.slug` працює як раніше. `vue-router@5` сумісний з Vue 3 (це нова мажорна гілка router-а, не плутати з історичним 4.x для Vue 3 — обидві лінії існують одночасно).

### `app/main.ts`

```ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import VWave from 'v-wave'
import App from './App.vue'
import { router } from './router'
import { i18n } from './i18n'
import { clickOutside } from './directives/clickOutside'
import { initSupabase } from './lib/supabase-instance'
import '~/assets/css/main.css'

initSupabase()

createApp(App)
  .use(createPinia())
  .use(router)
  .use(i18n)
  .use(VWave, {})
  .directive('click-outside', clickOutside)
  .mount('#app')
```

### Plugins → Vue API

- **Supabase** — `initSupabase()` функція в `app/lib/supabase-instance.ts`, читає `import.meta.env.VITE_SUPABASE_URL/KEY`, викликається в `main.ts` перед `mount`. `getSupabase()` залишається з тим самим контрактом (stores не міняються).
- **vWave** — `app.use(VWave, {})` напряму.
- **clickOutside** — `app/plugins/clickOutside.ts` → `app/directives/clickOutside.ts`, named export із directive-логікою; реєструється через `app.directive('click-outside', clickOutside)`.

### `app/i18n.ts`

```ts
import { createI18n } from 'vue-i18n'
import uk from '~/i18n/locales/uk.json'
import en from '~/i18n/locales/en.json'

export const i18n = createI18n({
  legacy: false,
  locale: 'uk',
  fallbackLocale: 'en',
  messages: { uk, en },
})
```

Локалі переносяться з `/i18n/locales/` у `app/i18n/locales/` — чистіший import шлях через `~` alias.

Runtime compilation (без `@intlify/unplugin-vue-i18n`) — приймаємо як дефолт; precompile фіксується в ROADMAP. Без auto-detection / route-based switching — відповідає поточному `strategy: 'no_prefix'`.

### Env vars

- `.env/.env`, `.env/.env.local`, `.env/.env.test`: `SUPABASE_URL` → `VITE_SUPABASE_URL`, `SUPABASE_KEY` → `VITE_SUPABASE_KEY`.
- `vite.config.ts` `envDir: '.env'` — Vite нативно підвантажить `.env`, `.env.local`, `.env.<mode>` з цієї папки.
- Server-only `SUPABASE_SECRET_KEY` — лишається тільки для Playwright (`dotenv` локально в `playwright.config.ts`).
- Оновити: `.env/.env.example`, `.env/.env.test.example`, `CLAUDE.md`, `README.md`.

### Icons (@iconify/vue)

Заміна use-sites: `<Icon name="ic:baseline-edit" />` → `<Icon icon="ic:baseline-edit" />` + `import { Icon } from '@iconify/vue'` per file. Іконки tree-shake-аться з `@iconify-json/ic` через `@iconify/vue` ESM.

Custom collection `app:moderator|deciding|offline|leave-room` — реєструємо одноразово в `main.ts` через `addCollection({ prefix: 'app', icons: {...} })`, де `icons` будуються з 4 SVG (`?raw` import → витяг `<path>`/`<g>` body в Iconify-формат, ~20 рядків utility-коду в `app/lib/registerAppIcons.ts`).

### Tailwind v3 (PostCSS)

- `tailwind.config.ts` — без змін (content paths уже вказують на `app/**/*.vue|ts`).
- `postcss.config.js`:
  ```js
  module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } }
  ```
- `assets/css/main.css` → `app/assets/css/main.css`, імпорт у `main.ts`.

---

## Tests

### Vitest

Конфіг standalone, не залежить від Nuxt. Зміни нульові, `~` alias і так працює.

### Playwright

- `playwright.config.ts` `webServer.command: 'npm run build && npm run preview'` лишається.
- `vite preview` дефолт 4173 → фіксуємо `preview: { port: 3000 }` у `vite.config.ts`, щоб не міняти `baseURL` у Playwright.
- Жодних змін у specs, fixtures, POMs.

---

## `package.json` scripts

```jsonc
{
  "dev": "vite --host",
  "build": "vite build",
  "preview": "vite preview",
  "typecheck": "vue-tsc --noEmit -p tsconfig.json",
  "lint": "eslint .",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:unit": "vitest run",
  "test:unit:watch": "vitest",
  "test:unit:coverage": "vitest run --coverage",
  "test:e2e": "playwright test",
  "test:e2e:smoke": "playwright test tests/e2e/smoke.spec.ts",
  "test:e2e:ui": "playwright test --ui",
  "test:ci": "npm run lint && npm run typecheck && npm run test:unit && npm run build"
}
```

Видаляємо: `generate`, `postinstall`. Структура `test:ci` та сама.

## Lint

`eslint.config.js` (flat config, ESLint 9 уже встановлений):

```ts
import vue from 'eslint-plugin-vue'
import vueTs from '@vue/eslint-config-typescript'

export default [
  ...vue.configs['flat/recommended'],
  ...vueTs(),
  { ignores: ['dist', '.nuxt', '.output', 'coverage', 'playwright-report', 'test-results'] },
]
```

Видаляємо будь-який `.eslintrc*` і Nuxt-config residue.

## Build / Deploy

**`netlify.toml`:**

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

**`public/_redirects`** (дублікат для branch deploy без toml-парсингу):

```
/*  /index.html  200
```

**CI** (`.github/workflows/ci.yml`) — мінімальні зміни:
- `npm run test:ci` (назва без змін, всередині build вже Vite)
- Deploy: `npm run build` замість `npm run generate`; publish dir `dist` замість `.output/public`

---

## Migration sequence (commits на гілці `vue-and-vite`)

1. **`chore: scaffold vite + remove nuxt`** — `vite.config.ts`, `index.html`, `app/main.ts` (skeleton), видалити `nuxt.config.ts`, `.nuxt/`, оновити `package.json` deps + scripts, додати `postcss.config.js`, `tsconfig.json`, `tsconfig.node.json`, `eslint.config.js`. Move `assets/` → `app/assets/`, `i18n/locales/` → `app/i18n/locales/`. Repo поки не запускається — це навмисно.
2. **`feat: explicit vue-router + App.vue`** — `app/router.ts`, `app/App.vue` (`<RouterView />`), видалити `app/app.vue` зі старим `<NuxtPage />`.
3. **`feat: vue-i18n bootstrap`** — `app/i18n.ts`, інжект у `main.ts`. Verify локалі рендеряться.
4. **`refactor: explicit imports у SFC і stores`** — додати `import { ref, computed, onMounted, ... } from 'vue'`, `import { useRoute, useRouter } from 'vue-router'`, `import { useI18n } from 'vue-i18n'`, `import { storeToRefs } from 'pinia'`, локальні composables (`useTheme`, `useDylanAvatar`). Скоуп: ~30 файлів (29 use-sites Nuxt auto-imports + ~72 для Vue API). Найбільший коміт — самоперевірка по 5-7 файлів за раз.
5. **`refactor: supabase init + VITE_* env vars`** — `initSupabase()`, оновити `.env/.env.example`, `.env/.env.test.example`, документацію.
6. **`refactor: @iconify/vue замість @nuxt/icon`** — заміна `<Icon name=...>` → `<Icon icon=...>`, реєстрація `app:` collection через `addCollection`.
7. **`refactor: vWave + clickOutside як Vue plugins`** — move `plugins/clickOutside.ts` → `directives/clickOutside.ts`, wire через `main.ts`.
8. **`chore: eslint flat config + tailwind postcss`** — flat config, postcss.config.js, devDeps.
9. **`chore: netlify spa + ci update`** — `netlify.toml`, `public/_redirects`, CI workflow.
10. **`docs: оновити CLAUDE.md, README, ROADMAP`** — нові розділи (див. нижче).

Між комітами 4 і 6 — точкові sanity-runs `npm run dev`, перевірка кожного route. E2E smoke перевіряємо лише після коміту 9 — коли preview port фіксований.

---

## Risks / Open items

- **R1. Bundle size delta** — мета: фіксуємо before/after `dist/assets/*.js` сумарно після коміту 9. Якщо not improved або gorsche — діагностика через `rollup-plugin-visualizer`.
- **R2. Custom icons (`app:moderator|deciding|offline|leave-room`)** — `addCollection` приймає Iconify JSON; з SVG потрібно витягти body. Через `?raw` Vite-import читаємо SVG як string, парсимо в Iconify-формат (~20 рядків). Альтернатива: 4 inline Vue-компоненти — простіше, але втрачаємо однорідний `<Icon icon="app:..."/>` API. Обираємо `addCollection` для консистентності.
- **R3. vue-i18n runtime warning** — `[intlify] Runtime compilation is being used` — приймаємо як дефолт, у ROADMAP як можливість для `@intlify/unplugin-vue-i18n` precompile.
- **R4. Roboto Google Fonts CDN** — лишається як зараз; вже зафіксовано в ROADMAP E2E debt (P8).
- **R5. `clickOutside` directive перейменування** — будь-який код, що імпортує `~/plugins/clickOutside`, треба оновити (grep — 0 use-sites за межами plugin-реєстрації, безпечно).
- **R6. Recent Rooms localStorage** — формат `storypoker_session_<roomId>` не змінюється; сесії продовжать працювати при cutover (pure browser API).
- **R7. SSR/server guards** — увесь код вже client-only. Перевіряємо `grep -rn "process\.server\|process\.client\|import\.meta\.server" app` — очікую 0; якщо знайдеться, рефакторимо.

---

## ROADMAP updates

Додати в `ROADMAP.md`:

- **Vue + Vite migration ⏳ planned** — посилання на цей spec, статус оновлюється під час виконання.
- **Tailwind v4 migration ⏳ planned** — окремий iter після Vite-міграції: `@tailwindcss/vite` plugin, CSS-first `@theme` config, перенос `tailwind.config.ts` → `app/assets/css/main.css`, візуальна регресійна перевірка через Playwright screenshots.
- **vue-i18n precompile ⏳ planned** — `@intlify/unplugin-vue-i18n` для production bundle, прибрати runtime compilation warning.

## Success criteria

- [ ] `npm run dev` cold start < 3s
- [ ] `npm run build` < 10s, генерує `dist/` без помилок
- [ ] `npm run test:ci` зелений
- [ ] `npm run test:e2e:smoke` зелений локально (chromium + webkit, з урахуванням існуючого webkit testIgnore для critical-flows)
- [ ] Netlify preview deploy візуально 1:1 з prod (manual smoke: home → create room → vote → reveal → new round + login/logout + theme toggle + i18n switch)
- [ ] Production bundle `dist/assets/*.js` сумарно ≤ поточного `.output/public/_nuxt/*.js` (фіксуємо before/after числа в коментарі до PR)
