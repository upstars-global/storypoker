# Vue + Vite Migration - Design

**Date:** 2026-05-16
**Status:** Spec - pending implementation plan
**Branch:** `vue-and-vite`
**Related:** [`docs/roadmap.md`](../../roadmap.md), [`CLAUDE.md`](../../../CLAUDE.md)

---

## Context

Story Poker currently runs on Nuxt 4.4 in SSG mode (`nuxt generate` → Netlify static). Its production behavior is a pure SPA: everything runs client-side against Supabase (Auth + Postgres + Realtime + Presence). SSR/SSG provides no business benefit and adds overhead to the dependency surface, bundle size, and build time. There are no special SEO requirements (private rooms by slug).

## Goals

1. Move Story Poker from Nuxt 4 to a pure Vue 3 + Vite 6 SPA, preserving 100% of functionality and the UI without visual regressions.
2. Reduce the dependency surface (remove the Nuxt ecosystem).
3. Speed up dev/build/HMR and reduce the production bundle (record before/after metrics).
4. Use explicit imports and explicit `vue-router` configuration (without `unplugin-auto-import` or `vite-plugin-pages`).

## Non-goals

1. No changes to business logic, store API, database schema, Supabase realtime, i18n keys, or UI components beyond imports.
2. Do not migrate to Tailwind v4 (recorded in ROADMAP as the next step).
3. Do not rename `app/` → `src/` (the Vite convention; `app/` as srcDir is supported through an alias).
4. Do not change the JSON structure of locales.
5. Do not introduce `@unhead/vue`; `<head>` is entirely in the static `index.html`.

---

## Dependency changes

### Add
1. `vite@^6`
2. `@vitejs/plugin-vue@^5`
3. `vue-tsc` (explicitly, not transitively)
4. `vue-i18n@^10` (runtime compilation)
5. `@iconify/vue@^4` (`@iconify-json/ic` already present)
6. `eslint-plugin-vue@^9` + `@vue/eslint-config-typescript@^13` + `vue-eslint-parser`
7. `autoprefixer` + `postcss` (explicitly)

### Remove
1. `nuxt`
2. `@nuxt/eslint`
3. `@nuxt/icon`
4. `@nuxtjs/i18n`
5. `@nuxtjs/tailwindcss`
6. `@pinia/nuxt`

### Keep
1. `dotenv` - Vite reads `.env` itself through `envDir`, but `playwright.config.ts` still uses `loadDotenv({ path: '.env/.env.test' })` for E2E credentials (server-only keys, not VITE_*).

### File-level removals
1. `nuxt.config.ts`
2. `.nuxt/`, `.output/`
3. `nuxt prepare` in `postinstall`
4. `vite.optimizeDeps.include` (Vite resolves dependencies itself; restore this if HMR cold start becomes a problem)

---

## File layout

```
/                          # vite root
├── index.html             # NEW - head/meta/inline theme script + entry script
├── vite.config.ts         # NEW
├── postcss.config.js      # NEW - tailwindcss + autoprefixer
├── tsconfig.json          # adjust - no Nuxt extends
├── tsconfig.node.json     # NEW - for vite.config.ts
├── eslint.config.js       # replace .eslintrc* / @nuxt/eslint
├── netlify.toml           # NEW
├── public/
│   └── _redirects         # NEW - /*  /index.html  200
├── app/                   # KEEP as srcDir, ~ alias → app/
│   ├── main.ts            # NEW - entry: createApp + pinia + router + i18n + plugins
│   ├── router.ts          # NEW - 6 explicit routes
│   ├── i18n.ts            # NEW - createI18n + locale messages import
│   ├── App.vue            # rename from app.vue, <NuxtPage /> → <RouterView />
│   ├── pages/             # KEEP files, imported explicitly by the router
│   ├── components/        # KEEP
│   ├── composables/       # KEEP
│   ├── stores/            # KEEP
│   ├── lib/               # KEEP
│   ├── utils/             # KEEP
│   ├── directives/        # NEW - move clickOutside here from plugins/
│   ├── assets/            # NEW - move from root /assets/ (css/main.css + icons/)
│   └── i18n/locales/{uk,en}.json  # MOVE from /i18n/locales/ - cleaner import paths
└── tests/                 # KEEP unchanged (Vitest standalone + Playwright)
```

---

## Wiring

### `index.html`

Move everything from `nuxt.config.ts → app.head` into static markup. The theme script is FIRST in `<head>` (before the Vite entry script) to avoid FOUC on first paint.

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

Dynamic `<title>` per route is set in ``router.afterEach(to => { document.title = to.meta.title ? `${to.meta.title} | Story Poker` : 'Story Poker' })``.

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

`[slug].vue`: `useRoute().params.slug` works as before. `vue-router@5` is compatible with Vue 3 (this is a new major router branch; do not confuse it with the historical 4.x for Vue 3 - both lines coexist).

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

1. **Supabase** - The `initSupabase()` function in `app/lib/supabase-instance.ts` reads `import.meta.env.VITE_SUPABASE_URL/KEY` and is called in `main.ts` before `mount`. `getSupabase()` retains the same contract (stores do not change).
2. **vWave** - Call `app.use(VWave, {})` directly.
3. **clickOutside** - `app/plugins/clickOutside.ts` → `app/directives/clickOutside.ts`, named export with directive logic; registered through `app.directive('click-outside', clickOutside)`.

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

Move locales from `/i18n/locales/` to `app/i18n/locales/` for a cleaner import path through the `~` alias.

Runtime compilation (without `@intlify/unplugin-vue-i18n`) is accepted as the default; precompilation is recorded in ROADMAP. No auto-detection / route-based switching, consistent with the current `strategy: 'no_prefix'`.

### Env vars

1. `.env/.env`, `.env/.env.local`, `.env/.env.test`: `SUPABASE_URL` → `VITE_SUPABASE_URL`, `SUPABASE_KEY` → `VITE_SUPABASE_KEY`.
2. `vite.config.ts` `envDir: '.env'` - Vite will natively load `.env`, `.env.local`, `.env.<mode>` from this directory.
3. Server-only `SUPABASE_SECRET_KEY` - remains only for Playwright (`dotenv` locally in `playwright.config.ts`).
4. Update: `.env/.env.example`, `.env/.env.test.example`, `CLAUDE.md`, `README.md`.

### Icons (@iconify/vue)

Replace use sites: `<Icon name="ic:baseline-edit" />` → `<Icon icon="ic:baseline-edit" />` + `import { Icon } from '@iconify/vue'` per file. Icons are tree-shaken from `@iconify-json/ic` through `@iconify/vue` ESM.

Register the custom collection `app:moderator|deciding|offline|leave-room` once in `main.ts` through `addCollection({ prefix: 'app', icons: {...} })`, where `icons` are built from 4 SVGs (`?raw` import → extract the `<path>`/`<g>` body in Iconify format, ~20 lines of utility code in `app/lib/registerAppIcons.ts`).

### Tailwind v3 (PostCSS)

1. `tailwind.config.ts` - unchanged (content paths already point to `app/**/*.vue|ts`).
2. `postcss.config.js`:
   ```js
   module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } }
   ```
3. `assets/css/main.css` → `app/assets/css/main.css`, import in `main.ts`.

---

## Tests

### Vitest

The config is standalone and does not depend on Nuxt. No changes are needed; the `~` alias already works.

### Playwright

1. `playwright.config.ts` `webServer.command: 'npm run build && npm run preview'` remains.
2. `vite preview` defaults to 4173 → set `preview: { port: 3000 }` in `vite.config.ts`, to avoid changing `baseURL` in Playwright.
3. No changes to specs, fixtures, or POMs.

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

Remove: `generate`, `postinstall`. The `test:ci` structure stays the same.

## Lint

`eslint.config.js` (flat config, ESLint 9 is already installed):

```ts
import vue from 'eslint-plugin-vue'
import vueTs from '@vue/eslint-config-typescript'

export default [
  ...vue.configs['flat/recommended'],
  ...vueTs(),
  { ignores: ['dist', '.nuxt', '.output', 'coverage', 'playwright-report', 'test-results'] },
]
```

Remove any `.eslintrc*` and Nuxt config residue.

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

**`public/_redirects`** (duplicate for branch deploy without TOML parsing):

```
/*  /index.html  200
```

**CI** (`.github/workflows/ci.yml`) - minimal changes:
1. `npm run test:ci` (name unchanged, build now uses Vite internally)
2. Deploy: `npm run build` instead of `npm run generate`; publish dir `dist` instead of `.output/public`

---

## Migration sequence (commits on branch `vue-and-vite`)

1. **`chore: scaffold vite + remove nuxt`** - `vite.config.ts`, `index.html`, `app/main.ts` (skeleton), remove `nuxt.config.ts`, `.nuxt/`, update `package.json` deps + scripts, add `postcss.config.js`, `tsconfig.json`, `tsconfig.node.json`, `eslint.config.js`. Move `assets/` → `app/assets/`, `i18n/locales/` → `app/i18n/locales/`. The repo does not run yet; this is intentional.
2. **`feat: explicit vue-router + App.vue`** - `app/router.ts`, `app/App.vue` (`<RouterView />`), remove `app/app.vue` with the old `<NuxtPage />`.
3. **`feat: vue-i18n bootstrap`** - `app/i18n.ts`, inject into `main.ts`. Verify locales render.
4. **`refactor: explicit imports у SFC і stores`** (explicit imports in SFCs and stores) - add `import { ref, computed, onMounted, ... } from 'vue'`, `import { useRoute, useRouter } from 'vue-router'`, `import { useI18n } from 'vue-i18n'`, `import { storeToRefs } from 'pinia'`, local composables (`useTheme`, `useDylanAvatar`). Scope: ~30 files (29 Nuxt auto-import use sites + ~72 for Vue API). The largest commit: self-review 5-7 files at a time.
5. **`refactor: supabase init + VITE_* env vars`** - `initSupabase()`, update `.env/.env.example`, `.env/.env.test.example`, and documentation.
6. **`refactor: @iconify/vue замість @nuxt/icon`** (@iconify/vue instead of @nuxt/icon) - replace `<Icon name=...>` → `<Icon icon=...>`, register the `app:` collection through `addCollection`.
7. **`refactor: vWave + clickOutside як Vue plugins`** (vWave + clickOutside as Vue plugins) - move `plugins/clickOutside.ts` → `directives/clickOutside.ts`, wire through `main.ts`.
8. **`chore: eslint flat config + tailwind postcss`** - flat config, postcss.config.js, devDeps.
9. **`chore: netlify spa + ci update`** - `netlify.toml`, `public/_redirects`, CI workflow.
10. **`docs: оновити CLAUDE.md, README, ROADMAP`** (update CLAUDE.md, README, ROADMAP) - new sections (see below).

Between commits 4 and 6, run targeted `npm run dev` sanity checks and check each route. Run the E2E smoke test only after commit 9, when the preview port is fixed.

---

## Risks / Open items

1. **R1. Bundle size delta** - goal: record the before/after total for `dist/assets/*.js` after commit 9. If not improved or worse, diagnose using `rollup-plugin-visualizer`.
2. **R2. Custom icons (`app:moderator|deciding|offline|leave-room`)** - `addCollection` accepts Iconify JSON; the body must be extracted from SVG. Read SVG as a string through a `?raw` Vite import and parse it into Iconify format (~20 lines). Alternative: 4 inline Vue components are simpler but lose the uniform `<Icon icon="app:..."/>` API. Choose `addCollection` for consistency.
3. **R3. vue-i18n runtime warning** - `[intlify] Runtime compilation is being used` - accept as the default; ROADMAP lists `@intlify/unplugin-vue-i18n` precompilation as an option.
4. **R4. Roboto Google Fonts CDN** - remains as it is; already recorded in ROADMAP E2E debt (P8).
5. **R5. `clickOutside` directive rename** - update any code importing `~/plugins/clickOutside` (grep - 0 use sites outside plugin registration, safe).
6. **R6. Recent Rooms localStorage** - the `storypoker_session_<roomId>` format does not change; sessions will keep working at cutover (pure browser API).
7. **R7. SSR/server guards** - all code is already client-only. Check `grep -rn "process\.server\|process\.client\|import\.meta\.server" app` - expect 0; refactor any matches.

---

## ROADMAP updates

Add to `ROADMAP.md`:

1. **Vue + Vite migration ⏳ planned** - link to this spec; update the status during execution.
2. **Tailwind v4 migration ⏳ planned** - a separate iteration after the Vite migration: `@tailwindcss/vite` plugin, CSS-first `@theme` config, move `tailwind.config.ts` → `app/assets/css/main.css`, visual regression check using Playwright screenshots.
3. **vue-i18n precompile ⏳ planned** - `@intlify/unplugin-vue-i18n` for the production bundle, remove the runtime compilation warning.

## Success criteria

1. [ ] `npm run dev` cold start < 3s
2. [ ] `npm run build` < 10s, generates `dist/` without errors
3. [ ] `npm run test:ci` passes
4. [ ] `npm run test:e2e:smoke` passes locally (chromium + webkit, accounting for the existing webkit testIgnore for critical-flows)
5. [ ] Netlify preview deploy visually 1:1 with prod (manual smoke: home → create room → vote → reveal → new round + login/logout + theme toggle + i18n switch)
6. [ ] Production bundle `dist/assets/*.js` total ≤ the current `.output/public/_nuxt/*.js` (record before/after numbers in a PR comment)
