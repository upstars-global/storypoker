# Vue + Vite Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`1. [ ]`) syntax for tracking.

**Goal:** Migrate Story Poker from Nuxt 4 SSG to a pure Vue 3 + Vite 6 SPA without changing the UI, UX, or functionality.

**Architecture:** Big-bang migration on the `vue-and-vite` branch. Each task is one commit. The repo will not run from the end of Task 1 until Task 7 is complete; this is expected in a big-bang migration. Run `npm run dev` as a sanity check after Task 7. Vitest runs standalone immediately. Run E2E tests only after Task 10.

**Tech Stack:** Vue 3.5, Vite 6, vue-router 5, Pinia 3, vue-i18n 10 (runtime compilation), @iconify/vue 4, Tailwind v3 (PostCSS), ESLint 9 flat config, Vitest 4, Playwright 1.60.

**Spec:** [`docs/superpowers/specs/2026-05-16-vue-vite-migration-design.md`](../specs/2026-05-16-vue-vite-migration-design.md)

---

## Pre-flight

Capture baseline metrics before starting for comparison in Task 11.

1. [ ] **Step 0.1: Capture baseline bundle size**

```bash
npm run generate 2>&1 | tail -20
du -sh .output/public/_nuxt 2>/dev/null
find .output/public/_nuxt -name '*.js' -exec wc -c {} + | tail -1
```

Record the result for comparison with `dist/assets` in Task 11.

1. [ ] **Step 0.2: Verify clean working tree**

```bash
git status
git branch --show-current
```

Expected: `clean`, `vue-and-vite`.

---

## Task 1: Scaffold Vite + remove Nuxt

**Files:**
1. Create: `vite.config.ts`, `postcss.config.js`, `tsconfig.json` (replace), `tsconfig.node.json`, `index.html`, `app/main.ts` (skeleton)
2. Move: `assets/` to `app/assets/`, `i18n/` to `app/i18n/`
3. Modify: `package.json` (deps + scripts)
4. Delete: `nuxt.config.ts`, `.nuxt/`, `.output/`

The repo will not run after this task; this only establishes the skeleton.

1. [ ] **Step 1.1: Update package.json deps + scripts**

Rewrite `package.json`:

```jsonc
{
  "name": "storypoker",
  "type": "module",
  "private": true,
  "scripts": {
    "dev": "vite --host",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint .",
    "typecheck": "vue-tsc --noEmit -p tsconfig.json",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:unit": "vitest run",
    "test:unit:watch": "vitest",
    "test:unit:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:e2e:smoke": "playwright test tests/e2e/smoke.spec.ts",
    "test:e2e:ui": "playwright test --ui",
    "test:ci": "npm run lint && npm run typecheck && npm run test:unit && npm run build"
  },
  "devDependencies": {
    "@iconify-json/ic": "^1.2.4",
    "@playwright/test": "^1.60.0",
    "@vitejs/plugin-vue": "^5.2.1",
    "@vitest/coverage-v8": "^4.1.6",
    "@vue/eslint-config-typescript": "^13.0.0",
    "autoprefixer": "^10.4.20",
    "dotenv": "^17.4.2",
    "eslint": "^9.39.4",
    "eslint-plugin-vue": "^9.32.0",
    "happy-dom": "^20.9.0",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.17",
    "vite": "^6.0.7",
    "vitest": "^4.1.6",
    "vue-eslint-parser": "^9.4.3",
    "vue-tsc": "^2.2.0"
  },
  "dependencies": {
    "@dicebear/collection": "^9.4.2",
    "@dicebear/core": "^9.4.2",
    "@iconify/vue": "^4.3.0",
    "@supabase/supabase-js": "^2.105.4",
    "pinia": "^3.0.4",
    "v-wave": "^3.0.4",
    "vue": "^3.5.34",
    "vue-i18n": "^10.0.5",
    "vue-router": "^5.0.7"
  },
  "engines": {
    "node": ">=24.15.0",
    "npm": ">=11.12.0"
  }
}
```

Removed: `nuxt`, `@nuxt/eslint`, `@nuxt/icon`, `@nuxtjs/i18n`, `@nuxtjs/tailwindcss`, `@pinia/nuxt`.
Added (devDeps): `@vitejs/plugin-vue`, `@vue/eslint-config-typescript`, `autoprefixer`, `eslint-plugin-vue`, `postcss`, `tailwindcss` (explicitly - previously pulled in by @nuxtjs/tailwindcss), `vite`, `vue-eslint-parser`, `vue-tsc`.
Added (deps): `@iconify/vue`, `vue-i18n`.
Kept `dotenv` (needed for Playwright).

1. [ ] **Step 1.2: Run npm install**

```bash
rm -rf node_modules .nuxt .output package-lock.json
npm install
```

Expected: `package-lock.json` is created and installation completes without errors. Peer warnings about vue-router 5.x are expected (this is already a major version for Vue 3).

1. [ ] **Step 1.3: Create vite.config.ts**

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

1. [ ] **Step 1.4: Create postcss.config.js**

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

1. [ ] **Step 1.5: Replace tsconfig.json**

Delete the current `tsconfig.json` (Nuxt references) and create a new one:

```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "jsx": "preserve",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vite/client"],
    "esModuleInterop": true,
    "allowImportingTsExtensions": false,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "noEmit": true,
    "baseUrl": ".",
    "paths": {
      "~/*": ["app/*"],
      "@/*": ["app/*"]
    }
  },
  "include": [
    "app/**/*.ts",
    "app/**/*.tsx",
    "app/**/*.vue",
    "tests/**/*.ts"
  ],
  "exclude": ["node_modules", "dist", ".nuxt", ".output"]
}
```

1. [ ] **Step 1.6: Create tsconfig.node.json**

```jsonc
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "target": "ES2022",
    "types": ["node"],
    "allowSyntheticDefaultImports": true,
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["vite.config.ts", "vitest.config.ts", "playwright.config.ts", "postcss.config.js", "tailwind.config.ts", "eslint.config.js"]
}
```

1. [ ] **Step 1.7: Move folders into app/**

```bash
git mv assets app/assets
git mv i18n app/i18n
```

1. [ ] **Step 1.8: Create index.html**

In the project root:

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

1. [ ] **Step 1.9: Move favicon.svg to public/**

```bash
mkdir -p public
# If favicon.svg is already in public/ (Nuxt convention), skip
if [ -f app/public/favicon.svg ]; then git mv app/public/favicon.svg public/favicon.svg; fi
if [ -f public/favicon.svg ]; then echo "ok"; else echo "MISSING - find it: find . -name favicon.svg"; fi
```

If `MISSING`, find it with `find . -name favicon.svg -not -path './node_modules/*'` and move it to `public/favicon.svg` with `git mv`.

1. [ ] **Step 1.10: Create app/main.ts (skeleton)**

```ts
import { createApp } from 'vue'
import App from './App.vue'

createApp(App).mount('#app')
```

This is a temporary minimum; Tasks 4 and 5 will expand it.

1. [ ] **Step 1.11: Delete Nuxt config**

```bash
rm -f nuxt.config.ts
rm -rf .nuxt .output
```

1. [ ] **Step 1.12: Update .gitignore**

Check that `.nuxt` and `.output` remain in `.gitignore`, and add `dist`:

```bash
grep -qxF 'dist' .gitignore || echo 'dist' >> .gitignore
```

1. [ ] **Step 1.13: Commit**

```bash
git add -A
git commit -m "chore: scaffold vite + remove nuxt"
```

---

## Task 2: Explicit vue-router + App.vue

**Files:**
1. Create: `app/router.ts`, `app/App.vue`
2. Delete: `app/app.vue`

<!-- Separate lists. -->

1. [ ] **Step 2.1: Create app/router.ts**

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

1. [ ] **Step 2.2: Create app/App.vue**

```vue
<script setup lang="ts">
import { onMounted } from 'vue'
import ConnectionBanner from '~/components/ConnectionBanner.vue'
import { useTheme } from '~/composables/useTheme'

const { init } = useTheme()
onMounted(() => init())
</script>

<template>
  <div class="min-h-screen bg-app text-body">
    <ConnectionBanner />
    <RouterView />
  </div>
</template>
```

1. [ ] **Step 2.3: Delete old app.vue**

```bash
rm app/app.vue
```

1. [ ] **Step 2.4: Wire router in main.ts (intermediate version)**

Rewrite `app/main.ts`:

```ts
import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'

createApp(App).use(router).mount('#app')
```

(Pinia, i18n, and plugins will be added in later tasks to keep commits small.)

1. [ ] **Step 2.5: Commit**

```bash
git add -A
git commit -m "feat: explicit vue-router + App.vue"
```

---

## Task 3: vue-i18n bootstrap

**Files:**
1. Create: `app/i18n.ts`
2. Modify: `app/main.ts`

<!-- Separate lists. -->

1. [ ] **Step 3.1: Create app/i18n.ts**

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

1. [ ] **Step 3.2: Wire i18n in main.ts**

Rewrite `app/main.ts`:

```ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import { i18n } from './i18n'

createApp(App)
  .use(createPinia())
  .use(router)
  .use(i18n)
  .mount('#app')
```

1. [ ] **Step 3.3: Commit**

```bash
git add -A
git commit -m "feat: vue-i18n bootstrap + pinia wiring"
```

---

## Task 4: Explicit imports refactor

The largest commit. Add explicit imports to every SFC, store, and composable that used Nuxt auto-imports. Work file by file and run a sanity check with `npx vue-tsc --noEmit -p tsconfig.json` after every 5-7 files (the number of errors should gradually decrease).

### Mapping (Nuxt auto-import → explicit import)

| Auto-imported | How to import |
|---|---|
| `ref`, `computed`, `onMounted`, `onUnmounted`, `onBeforeUnmount`, `watch`, `reactive`, `toRef`, `toRefs`, `nextTick` | `from 'vue'` |
| `useRoute`, `useRouter` | `from 'vue-router'` |
| `useI18n` | `from 'vue-i18n'` |
| `storeToRefs`, `defineStore` | `from 'pinia'` |
| `useTheme` | `from '~/composables/useTheme'` |
| `useDylanAvatar` | `from '~/composables/useDylanAvatar'` |
| `defineNuxtPlugin` | (removed - see Task 7) |
| `import.meta.client` | (removed - always true in an SPA) |
| `import.meta.server` | (removed - always false) |
| `useRuntimeConfig().public.X` | (refactored in Task 5 to `import.meta.env.VITE_X`) |

**Files to update (complete list from grep):**
1. `app/components/AppHeader.vue`
1. `app/components/AuthModal.vue`
1. `app/components/ConfigureCardDeckModal.vue`
1. `app/components/JoinOverlay.vue`
1. `app/components/PieChart.vue`
1. `app/components/PlayerRow.vue`
1. `app/components/PlayersList.vue`
1. `app/components/ResultsArea.vue`
1. `app/components/Timer.vue`
1. `app/components/UserSettingsModal.vue`
1. `app/components/ConnectionBanner.vue` (verify whether `<script setup>` has auto-imports)
1. `app/composables/useTheme.ts`
1. `app/composables/useDylanAvatar.ts`
1. `app/pages/index.vue`
1. `app/pages/login.vue`
1. `app/pages/signup.vue`
1. `app/pages/forgot-password.vue`
1. `app/pages/reset-password.vue`
1. `app/pages/[slug].vue`
1. `app/stores/auth.ts`
1. `app/stores/room.ts`
1. `app/stores/players.ts`
1. `app/stores/presence.ts`
1. `app/stores/profiles.ts`
1. `app/lib/supabase-instance.ts` (nothing to add - it already has explicit imports)

<!-- Separate lists. -->

1. [ ] **Step 4.1: Update composables**

`app/composables/useTheme.ts` - replace the entire file:

```ts
import { ref, computed } from 'vue'

type Theme = 'light' | 'dark'
const STORAGE_KEY = 'sp-theme'

const theme = ref<Theme>('dark')

function apply(value: Theme, persist: boolean) {
  theme.value = value
  document.documentElement.setAttribute('data-theme', value)
  if (persist) {
    try { localStorage.setItem(STORAGE_KEY, value) } catch {}
  }
}

export function useTheme() {
  function init() {
    let stored: string | null = null
    try { stored = localStorage.getItem(STORAGE_KEY) } catch {}
    if (stored === 'light' || stored === 'dark') {
      apply(stored, false)
    } else {
      apply('dark', false)
    }
  }

  function toggle() {
    apply(theme.value === 'light' ? 'dark' : 'light', true)
  }

  function setTheme(value: Theme) {
    apply(value, true)
  }

  const isLight = computed(() => theme.value === 'light')

  return { theme, isLight, init, toggle, setTheme }
}
```

`app/composables/useDylanAvatar.ts` has no `import.meta.*` guards and already works as is (the code is self-contained). Check with `grep "import.meta" app/composables/useDylanAvatar.ts` - expect 0 results.

1. [ ] **Step 4.2: Update stores**

For EACH store file (`auth.ts`, `room.ts`, `players.ts`, `presence.ts`, `profiles.ts`):

1. Open the file.
2. If `defineStore` is not already imported, add `import { defineStore } from 'pinia'` at the top.
3. If `ref`/`computed`/etc are used, add `import { ref, computed } from 'vue'` (the exact list depends on the file - use `grep -oE "\b(ref|computed|reactive|watch|onMounted|onUnmounted|nextTick|toRef|toRefs)\(" app/stores/X.ts | sort -u`).
4. If `storeToRefs` is used, add it to the same pinia import.

**Sanity check** after all 5 stores:

```bash
npx vue-tsc --noEmit -p tsconfig.json 2>&1 | grep -E "(stores/|error)" | head -30
```

Expected: store errors are gone (errors may remain in components/pages - that is normal; those come next).

1. [ ] **Step 4.3: Update components (10 files)**

For EACH of the 10 components (`AppHeader.vue`, `AuthModal.vue`, `ConfigureCardDeckModal.vue`, `JoinOverlay.vue`, `PieChart.vue`, `PlayerRow.vue`, `PlayersList.vue`, `ResultsArea.vue`, `Timer.vue`, `UserSettingsModal.vue`):

1. Find which Vue/router/i18n/pinia APIs are used:
   ```bash
   grep -oE "\b(ref|computed|reactive|watch|onMounted|onUnmounted|onBeforeUnmount|nextTick|toRef|toRefs|useRoute|useRouter|useI18n|storeToRefs|useTheme|useDylanAvatar)\(" app/components/X.vue | sort -u
   ```
2. Add the corresponding imports at the start of `<script setup lang="ts">` (using the mapping above).
3. Remove all `import.meta.client`/`import.meta.server` guards - for a client guard, delete the condition (the code will always run); for a server guard, delete the entire block.

Work in batches of 3-4 files, then after each batch:

```bash
npx vue-tsc --noEmit -p tsconfig.json 2>&1 | tail -10
```

1. [ ] **Step 4.4: Update pages (6 files)**

Do the same for `index.vue`, `login.vue`, `signup.vue`, `forgot-password.vue`, `reset-password.vue`, `[slug].vue`.

**Special: `[slug].vue`** has `route.params.slug as string`. Replace it with:
```ts
import { useRoute, useRouter } from 'vue-router'
const route = useRoute()
const router = useRouter()
const urlParam = route.params.slug as string
```

If any page has `navigateTo('/path')`, replace it with `router.push('/path')`.

Remove `definePageMeta({ ... })` if present (Nuxt-only).

1. [ ] **Step 4.5: Verify typecheck**

```bash
npx vue-tsc --noEmit -p tsconfig.json
```

Expected: 0 errors. Any remaining error is either a missed auto-import (repeat the grep) or a real bug.

1. [ ] **Step 4.6: Run unit tests**

```bash
npm run test:unit
```

Expected: all tests pass (the tests do not depend on the Nuxt runtime, only on the `~` alias and pinia).

1. [ ] **Step 4.7: Commit**

```bash
git add -A
git commit -m "refactor: explicit imports у SFC/stores/composables"
```

Commit message: "refactor: explicit imports in SFCs/stores/composables".

---

## Task 5: Supabase init + VITE_* env vars

**Files:**
1. Modify: `app/lib/supabase-instance.ts`, `.env/.env`, `.env/.env.local`, `.env/.env.example`, `.env/.env.test`, `.env/.env.test.example`
1. Delete: `app/plugins/supabase.ts`

<!-- Separate lists. -->

1. [ ] **Step 5.1: Update app/lib/supabase-instance.ts**

Replace the entire file:

```ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

export function initSupabase(): void {
  if (_client) return
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const key = import.meta.env.VITE_SUPABASE_KEY as string | undefined
  if (!url || !key) {
    throw new Error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_KEY in env')
  }
  _client = createClient(url, key)
}

export function setSupabase(client: SupabaseClient): void {
  _client = client
}

export function getSupabase(): SupabaseClient {
  if (!_client) throw new Error('Supabase client not initialized. Call initSupabase() or setSupabase() first.')
  return _client
}

export function resetSupabase(): void {
  _client = null
}
```

`setSupabase` remains for tests (Vitest injects a mock).

1. [ ] **Step 5.2: Delete Nuxt plugin**

```bash
rm app/plugins/supabase.ts
```

1. [ ] **Step 5.3: Wire initSupabase in main.ts**

Rewrite `app/main.ts`:

```ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import { i18n } from './i18n'
import { initSupabase } from './lib/supabase-instance'

initSupabase()

createApp(App)
  .use(createPinia())
  .use(router)
  .use(i18n)
  .mount('#app')
```

(Add `v-wave` and `click-outside` in Task 7.)

1. [ ] **Step 5.4: Rename env keys**

For each env file (`.env/.env`, `.env/.env.local`, `.env/.env.example`, `.env/.env.test`, `.env/.env.test.example`):

```bash
# REPLACE: SUPABASE_URL → VITE_SUPABASE_URL, SUPABASE_KEY → VITE_SUPABASE_KEY
# (server-only SUPABASE_SECRET_KEY remains WITHOUT the VITE_ prefix)
```

In the editor, replace `SUPABASE_URL=` → `VITE_SUPABASE_URL=` and `SUPABASE_KEY=` → `VITE_SUPABASE_KEY=`. Do NOT change `SUPABASE_SECRET_KEY`, `SUPABASE_TEST_SERVICE_ROLE_KEY`, or `E2E_*`.

**Playwright config:** leave it as is - `playwright.config.ts` writes `SUPABASE_URL`/`SUPABASE_KEY` to the webServer environment. Update only the values passed through:

Find in `playwright.config.ts`:
```ts
env: {
  SUPABASE_URL: process.env.SUPABASE_URL!,
  SUPABASE_KEY: process.env.SUPABASE_KEY!,
  ...previewBlockedEnv,
},
```
Replace with:
```ts
env: {
  VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  VITE_SUPABASE_KEY: process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_KEY || '',
  ...previewBlockedEnv,
},
```

The fallback to old names preserves compatibility with GitHub Actions secrets (named `E2E_SUPABASE_URL`/`E2E_SUPABASE_ANON_KEY` and mapped to `SUPABASE_URL`/`SUPABASE_KEY` in ci.yml - update that separately in Task 10).

1. [ ] **Step 5.5: Update CLAUDE.md env paragraph**

In the `Environment Setup` section of `CLAUDE.md`, replace the current example:
```
SUPABASE_URL=...
SUPABASE_KEY=...
```
with:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_KEY=...
# SUPABASE_SECRET_KEY=... (server-side only, not VITE_*)
```
Remove the mention of `nuxt.config.ts` mapping to runtimeConfig. Replace it with: "Vite reads `.env/` through `envDir` in `vite.config.ts`; client code uses `import.meta.env.VITE_*`."

1. [ ] **Step 5.6: Run unit tests**

```bash
npm run test:unit
```

Expected: all tests pass (the tests already mock through `setSupabase`).

1. [ ] **Step 5.7: Commit**

```bash
git add -A
git commit -m "refactor: supabase init + VITE_* env vars"
```

---

## Task 6: @iconify/vue instead of @nuxt/icon

**Files:**
1. Create: `app/lib/registerAppIcons.ts`
1. Modify: 8 components with `<Icon name=...>`, `app/main.ts`

<!-- Separate lists. -->

1. [ ] **Step 6.1: Create app/lib/registerAppIcons.ts**

```ts
import { addCollection } from '@iconify/vue'
import moderatorSvg from '~/assets/icons/moderator.svg?raw'
import decidingSvg from '~/assets/icons/deciding.svg?raw'
import offlineSvg from '~/assets/icons/offline.svg?raw'
import leaveRoomSvg from '~/assets/icons/leave-room.svg?raw'

function parseSvg(svg: string): { body: string; width: number; height: number } {
  let width = 24
  let height = 24
  const viewBox = svg.match(/\bviewBox=["']([^"']+)["']/)
  if (viewBox) {
    const parts = viewBox[1].trim().split(/\s+/).map(Number)
    if (parts.length === 4 && !Number.isNaN(parts[2]) && !Number.isNaN(parts[3])) {
      width = parts[2]
      height = parts[3]
    }
  } else {
    const w = svg.match(/\bwidth=["'](\d+)["']/)
    const h = svg.match(/\bheight=["'](\d+)["']/)
    if (w) width = parseInt(w[1], 10)
    if (h) height = parseInt(h[1], 10)
  }
  const body = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').trim()
  return { body, width, height }
}

export function registerAppIcons(): void {
  addCollection({
    prefix: 'app',
    icons: {
      moderator: parseSvg(moderatorSvg),
      deciding: parseSvg(decidingSvg),
      offline: parseSvg(offlineSvg),
      'leave-room': parseSvg(leaveRoomSvg),
    },
  })
}
```

1. [ ] **Step 6.2: Wire registerAppIcons in main.ts**

Add to `app/main.ts` before `createApp`:

```ts
import { registerAppIcons } from './lib/registerAppIcons'
// ... existing imports ...

initSupabase()
registerAppIcons()

createApp(App)
  // ... .use(...) chain ...
```

1. [ ] **Step 6.3: Replace `<Icon name=...>` → `<Icon icon=...>` in 8 files**

Files: `AppHeader.vue`, `AuthModal.vue`, `ConfigureCardDeckModal.vue`, `JoinOverlay.vue`, `PlayerRow.vue`, `Timer.vue`, `UserSettingsModal.vue`, `pages/[slug].vue`.

For EACH file:

1. Add an import in `<script setup>`:
   ```ts
   import { Icon } from '@iconify/vue'
   ```
2. Replace all `<Icon name=` with `<Icon icon=` (regex `s/<Icon name=/<Icon icon=/g` in the file).
3. If `<Icon :name="...">` is present, replace it with `<Icon :icon="...">`.

Quick sweep (sed in-place, BSD-compatible):
```bash
for f in app/components/AppHeader.vue app/components/AuthModal.vue app/components/ConfigureCardDeckModal.vue app/components/JoinOverlay.vue app/components/PlayerRow.vue app/components/Timer.vue app/components/UserSettingsModal.vue app/pages/\[slug\].vue; do
  sed -i '' 's/<Icon name=/<Icon icon=/g; s/<Icon :name=/<Icon :icon=/g' "$f"
done
```

Then manually add `import { Icon } from '@iconify/vue'` to each of these 8 files (sed cannot place the import in the correct location in `<script setup>`).

1. [ ] **Step 6.4: Sanity check**

```bash
grep -rn "<Icon name=" app/ && echo 'STILL HAS name=' || echo 'all replaced'
grep -rn "from '@iconify/vue'" app/components app/pages | wc -l
```

Expected: `all replaced`, 8 files with the import.

1. [ ] **Step 6.5: Typecheck**

```bash
npx vue-tsc --noEmit -p tsconfig.json
```

1. [ ] **Step 6.6: Commit**

```bash
git add -A
git commit -m "refactor: @iconify/vue + addCollection для app: icons"
```

Commit message: "refactor: @iconify/vue + addCollection for app: icons".

---

## Task 7: vWave + clickOutside as Vue plugins

**Files:**
1. Create: `app/directives/clickOutside.ts`
1. Modify: `app/main.ts`
1. Delete: `app/plugins/clickOutside.ts`, `app/plugins/vWave.ts`

<!-- Separate lists. -->

1. [ ] **Step 7.1: Create app/directives/clickOutside.ts**

```ts
import type { Directive } from 'vue'

type ClickOutsideEl = HTMLElement & { _clickOutside?: (e: MouseEvent) => void }

export const clickOutside: Directive<ClickOutsideEl, () => void> = {
  mounted(el, binding) {
    el._clickOutside = (e: MouseEvent) => {
      if (!el.contains(e.target as Node)) binding.value()
    }
    document.addEventListener('click', el._clickOutside)
  },
  unmounted(el) {
    if (el._clickOutside) document.removeEventListener('click', el._clickOutside)
  },
}
```

1. [ ] **Step 7.2: Update app/main.ts (final version)**

```ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import VWave from 'v-wave'
import App from './App.vue'
import { router } from './router'
import { i18n } from './i18n'
import { clickOutside } from './directives/clickOutside'
import { initSupabase } from './lib/supabase-instance'
import { registerAppIcons } from './lib/registerAppIcons'
import '~/assets/css/main.css'

initSupabase()
registerAppIcons()

createApp(App)
  .use(createPinia())
  .use(router)
  .use(i18n)
  .use(VWave, {
    color: 'currentColor',
    initialOpacity: 0.35,
    finalOpacity: 0,
    duration: 0.4,
    easing: 'ease-out',
  })
  .directive('click-outside', clickOutside)
  .mount('#app')
```

The CSS import (`~/assets/css/main.css`) is critical. It enables Tailwind and custom styles.

1. [ ] **Step 7.3: Delete Nuxt plugins**

```bash
rm app/plugins/clickOutside.ts app/plugins/vWave.ts
rmdir app/plugins 2>/dev/null || true
```

1. [ ] **Step 7.4: Verify dev server starts**

```bash
npm run dev
```

Expected: Vite starts without errors at `http://localhost:3000`. Open a browser and check:
1. The home page `/` renders
1. The theme works (dark/light toggle)
1. Icons are visible
1. Localization works (uk by default)

Stop the dev server (Ctrl+C).

1. [ ] **Step 7.5: Run unit tests**

```bash
npm run test:unit
```

1. [ ] **Step 7.6: Commit**

```bash
git add -A
git commit -m "refactor: vWave + clickOutside як Vue plugins"
```

English: "refactor: vWave + clickOutside as Vue plugins".

---

## Task 8: ESLint flat config + Tailwind PostCSS

**Files:**
1. Create: `eslint.config.js`
1. Delete: `.eslintrc*` (if present)

<!-- Separate lists. -->

1. [ ] **Step 8.1: Create eslint.config.js**

At the root:

```js
import vue from 'eslint-plugin-vue'
import vueTs from '@vue/eslint-config-typescript'

export default [
  ...vue.configs['flat/recommended'],
  ...vueTs(),
  {
    rules: {
      'vue/multi-word-component-names': 'off',
      'vue/no-multiple-template-root': 'off',
    },
  },
  {
    ignores: [
      'dist/**',
      '.nuxt/**',
      '.output/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      'node_modules/**',
    ],
  },
]
```

1. [ ] **Step 8.2: Verify postcss.config.js + tailwind**

Check that `postcss.config.js` was created in Task 1.4. Contents:
```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

Check that `tailwind.config.ts` has NO reference to @nuxtjs/tailwindcss:
```bash
grep -n "nuxt" tailwind.config.ts || echo 'clean'
```

1. [ ] **Step 8.3: Run lint**

```bash
npm run lint
```

Expected: 0 errors (warnings are OK). If errors report an unknown plugin configuration, check that `eslint-plugin-vue` and `@vue/eslint-config-typescript` are installed.

1. [ ] **Step 8.4: Run typecheck**

```bash
npm run typecheck
```

Expected: 0 errors.

1. [ ] **Step 8.5: Run full test:ci**

```bash
npm run test:ci
```

This runs lint + typecheck + unit tests + vite build.

Expected: everything passes. If the build fails, diagnose the specific error (often the `~` alias in a CSS import or a missing explicit import).

1. [ ] **Step 8.6: Commit**

```bash
git add -A
git commit -m "chore: eslint flat config + tailwind postcss"
```

---

## Task 9: Netlify SPA + CI update

**Files:**
1. Create: `netlify.toml`, `public/_redirects`
1. Modify: `.github/workflows/ci.yml`

<!-- Separate lists. -->

1. [ ] **Step 9.1: Create netlify.toml**

At the root:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

1. [ ] **Step 9.2: Create public/_redirects**

```
/*  /index.html  200
```

(Trailing newline.)

1. [ ] **Step 9.3: Update .github/workflows/ci.yml**

Find in the `deploy` job (line ~125):
```yaml
      - name: Build (static)
        run: npm run generate

      - name: Deploy to Netlify
        uses: netlify/actions/cli@master
        with:
          args: deploy --dir=.output/public --prod
```

Replace with:
```yaml
      - name: Build
        run: npm run build

      - name: Deploy to Netlify
        uses: netlify/actions/cli@master
        with:
          args: deploy --dir=dist --prod
```

Find in the `e2e` job (line ~80):
```yaml
        env:
          SUPABASE_URL: ${{ secrets.E2E_SUPABASE_URL }}
          SUPABASE_KEY: ${{ secrets.E2E_SUPABASE_ANON_KEY }}
```

Replace with:
```yaml
        env:
          VITE_SUPABASE_URL: ${{ secrets.E2E_SUPABASE_URL }}
          VITE_SUPABASE_KEY: ${{ secrets.E2E_SUPABASE_ANON_KEY }}
          SUPABASE_URL: ${{ secrets.E2E_SUPABASE_URL }}
          SUPABASE_KEY: ${{ secrets.E2E_SUPABASE_ANON_KEY }}
```

(Keep both sets for backward compatibility with the `playwright.config.ts` fallback.)

1. [ ] **Step 9.4: Commit**

```bash
git add -A
git commit -m "chore: netlify spa + ci update"
```

---

## Task 10: Docs update + bundle diff

**Files:**
1. Modify: `CLAUDE.md`, `README.md`, `ROADMAP.md`

<!-- Separate lists. -->

1. [ ] **Step 10.1: Update CLAUDE.md**

Rewrite the section `## Tech Stack`:

```markdown
1. **Framework:** Vue 3.5 + Vite 6 SPA, Composition API `<script setup>`, `srcDir: app/`
1. **Routing:** `vue-router@5` - explicit routes in `app/router.ts`, without file-based routing
1. **Styling:** Tailwind v3 via PostCSS (autoprefixer), tokens in `tailwind.config.ts`, MUI-like classes in `app/assets/css/main.css`
   1. utilities: `text-{primary,body,muted,disabled,inverse,danger,success}`, `bg-{app,appbar,paper,elevated,overlay,skeleton}`, `border` (DEFAULT = `var(--border)`), `shadow-{1..8}`
   1. button modifiers (compose with `.mui-btn`): `.mui-btn-md` (180×46 / 23rad / `#607d8b`), `.mui-btn-sm`, `.mui-btn-text`, `.mui-btn-secondary`
1. **State:** Pinia 3 (no auto-imports - explicit `from 'pinia'`)
1. **Backend:** Supabase Postgres + Realtime + Presence + Auth
1. **i18n:** `vue-i18n@10` (runtime compilation), `legacy: false`, locales `app/i18n/locales/{uk,en}.json`
1. **UI:** `@iconify/vue` + `@iconify-json/ic` (`ic:baseline-*`); custom collection `app:` for `moderator`, `deciding`, `offline`, `leave-room` - registered via `addCollection` in `app/lib/registerAppIcons.ts`; `v-wave`, DiceBear, Roboto 300-700
1. **Node/npm:** Node >=24.15.0, npm >=11.12.0
```

Rewrite the section `## Common Commands`:

```bash
npm install
npm run dev          # Vite dev, port 3000 (host enabled)
npm run build        # vite build → dist/
npm run preview      # vite preview, port 3000
npm run lint         # ESLint flat config
npm run typecheck    # vue-tsc --noEmit
npm test             # vitest run
npm run test:watch
npm run test:unit
npm run test:unit:watch
npm run test:unit:coverage
npm run test:e2e
npm run test:e2e:smoke
npm run test:ci      # lint + typecheck + unit + build (CI runs this)
```

Rewrite the section `## Environment Setup`:

```markdown
All env files are in `/.env/` (gitignored except `*.example`):

1. `/.env/.env.local` - personal overrides
1. `/.env/.env` - team defaults
1. `/.env/.env.test` - credentials for the test Supabase project for Playwright
1. Vite reads them via `envDir: '.env'` in `vite.config.ts`

Template:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_KEY=...        # publishable client key
# SUPABASE_SECRET_KEY=...    # server-side only, WITHOUT the VITE_ prefix
```

Client code reads through `import.meta.env.VITE_*` (only variables prefixed with `VITE_` enter the browser bundle).
```

Rewrite the section `## Project Structure` - replace the Nuxt structure with:

```text
/
├── index.html             # head/meta + theme inline script
├── vite.config.ts
├── postcss.config.js
├── tsconfig.json, tsconfig.node.json
├── eslint.config.js
├── netlify.toml
├── public/
│   ├── _redirects         # /*  /index.html  200
│   └── favicon.svg
├── app/
│   ├── main.ts            # entry: createApp + pinia + router + i18n + plugins
│   ├── router.ts          # 6 explicit routes
│   ├── i18n.ts            # createI18n
│   ├── App.vue            # <RouterView />
│   ├── pages/             # index, [slug], login, signup, forgot-password, reset-password
│   ├── components/        # AppHeader, CardsArea, PlayersList, modals, icons
│   ├── composables/       # useTheme, useDylanAvatar
│   ├── stores/            # auth, room, players, presence, profiles
│   ├── directives/        # clickOutside
│   ├── lib/               # supabase-instance, registerAppIcons
│   ├── utils/             # roomId, cardDecks, authValidation, recentRooms, playerRoles, relativeTime
│   ├── i18n/locales/{uk,en}.json
│   └── assets/css/main.css, assets/icons/
├── supabase/migrations/*.sql
└── tests/
    ├── unit/stores|utils/   # Vitest (alias ~ → app/)
    ├── fixtures/, page-objects/, support/, e2e/
```

Remove all mentions of `nuxt.config.ts`, `@nuxtjs/*`, `@nuxt/*`, `defineNuxtPlugin`, `useRuntimeConfig`, `<NuxtPage />`, `nuxt generate`, `.output/public` from CLAUDE.md. If CLAUDE.md exceeds 200 lines, move expanded details to DESIGN.md and leave short references in CLAUDE.md.

1. [ ] **Step 10.2: Update README.md**

Find mentions of `Nuxt`, `nuxt dev`, `nuxt generate` in `README.md` and replace them with Vite equivalents. Replace any "Built with Nuxt" badge with "Built with Vue + Vite".

1. [ ] **Step 10.3: Update ROADMAP.md**

Add new sections after the current `## Поточний стан` ("Current status") or where appropriate:

```markdown
## Vue + Vite migration ✅ DONE (or ⚠️ IN PROGRESS until completion)

**Spec:** [`docs/superpowers/specs/2026-05-16-vue-vite-migration-design.md`](docs/superpowers/specs/2026-05-16-vue-vite-migration-design.md)
**Plan:** [`docs/superpowers/plans/2026-05-16-vue-vite-migration.md`](docs/superpowers/plans/2026-05-16-vue-vite-migration.md)

Pure Vue 3 + Vite 6 SPA in place of Nuxt 4 SSG. Smaller dependency surface, explicit imports and router, vue-i18n runtime, @iconify/vue.

---

## Post-migration tech debt ⏳ planned

### Tailwind v4
Migrate from v3 (the `@nuxtjs/tailwindcss` legacy has already been removed) to the native `@tailwindcss/vite` plugin with CSS-first `@theme` config. Move `tailwind.config.ts` to `app/assets/css/main.css`. Run visual regression checks using Playwright screenshots (a new iteration).

### vue-i18n precompile
Switch from runtime compilation to `@intlify/unplugin-vue-i18n` (precompile messages into render functions at build time). Faster runtime, smaller bundle, and removal of the dev warning `[intlify] Runtime compilation is being used`.

### Bundle metrics
Record the before/after total size of `dist/assets/*.js` in the repository after migration (PR comment). If the bundle is worse, diagnose it with `rollup-plugin-visualizer`.
```

1. [ ] **Step 10.4: Run full test:ci**

```bash
npm run test:ci
```

Expected: everything passes.

1. [ ] **Step 10.5: Capture after-bundle size + compare with baseline**

```bash
du -sh dist/assets
find dist/assets -name '*.js' -exec wc -c {} + | tail -1
```

Record the result in the PR description as `Before: <baseline>  After: <new>`. If after > before, add a ROADMAP TODO for post-migration analysis with `rollup-plugin-visualizer`.

1. [ ] **Step 10.6: E2E smoke**

```bash
# Stop any locally running dev server on :3000
npm run test:e2e:smoke
```

Expected: the smoke pack passes on chromium and webkit. A webkit failure from `critical-flows.spec.ts` is expected (testIgnore, P2 in ROADMAP).

1. [ ] **Step 10.7: Manual UI smoke**

```bash
npm run build && npm run preview
```

Open `http://localhost:3000` and check manually:
1. Home → "Create room" → enters a room with an 8-character id
1. In the room: theme toggle (dark/light), language toggle (uk/en), `Configure card deck` modal
1. Voting: select a card, `Reveal` (requires a second player or solo - `?` counts)
1. Login/Logout, Sign up flow
1. AppHeader avatar editor
1. Recent Rooms on the home page

<!-- Separate lists. -->

1. [ ] **Step 10.8: Commit**

```bash
git add -A
git commit -m "docs: оновити CLAUDE.md, README, ROADMAP для vue+vite"
```

English: "docs: update CLAUDE.md, README, ROADMAP for vue+vite".

---

## Post-implementation

1. [ ] **Step P.1: Push branch**

```bash
git push -u origin vue-and-vite
```

1. [ ] **Step P.2: Create PR**

Title: `feat: migrate from Nuxt to Vue + Vite`

The body must include:
1. Links to the spec and plan
1. Bundle-size diff (Before / After from Step 10.5)
1. Manual smoke checklist from Step 10.7
1. Note: Tailwind v4 and vue-i18n precompile - in ROADMAP as next iterations

<!-- Separate lists. -->

1. [ ] **Step P.3: Clear TaskList**

Remove all pending migration tasks (via TaskUpdate `status=deleted` or `completed`).

---

## Notes for the executing agent

1. **Do not attempt to write new migration tests.** The existing suite (unit + E2E) provides regression coverage; no functionality changes, so new tests are unnecessary.
1. **Do not touch the stores API.** Stores remain byte-for-byte unchanged functionally; only `import` statements are added.
1. **Do not change the JSON locale structure** or its keys. This is separate work outside the scope.
1. **Do not migrate to Tailwind v4 at the same time.** It is a separate iteration recorded in ROADMAP after this migration.
1. **If `git mv` fails with `pathspec`**, the file may already have moved. Check `git status` and `ls` of the destination path before retrying.
1. **If `vue-tsc` reports errors about `import.meta.env`**, add `/// <reference types="vite/client" />` to `app/main.ts` or ensure `tsconfig.json` has `"types": ["vite/client"]` (Step 1.5).
1. **If `npm run dev` shows `[vue-i18n] Runtime compilation is being used`**, it is a warning, not an error. Leave it as is (recorded in ROADMAP as a precompile follow-up).
1. **If Iconify icons do not render**, check that `registerAppIcons()` is called BEFORE `createApp(...).mount(...)` in `main.ts`. Nothing extra is needed for `ic:baseline-*`: `@iconify-json/ic` is installed as a devDep and `@iconify/vue` resolves ESM lazily.
