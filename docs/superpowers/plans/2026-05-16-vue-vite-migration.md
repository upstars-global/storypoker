# Vue + Vite Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate Story Poker з Nuxt 4 SSG на pure Vue 3 + Vite 6 SPA без зміни UI/UX/функціональності.

**Architecture:** Big-bang міграція на гілці `vue-and-vite`. Кожен таск = один коміт. Repo не запускається з кінця Task 1 до завершення Task 7 — це нормально, big-bang дозволяє це. Sanity-run `npm run dev` після Task 7. Vitest standalone (працює одразу). E2E прогоняємо тільки після Task 10.

**Tech Stack:** Vue 3.5, Vite 6, vue-router 5, Pinia 3, vue-i18n 10 (runtime compilation), @iconify/vue 4, Tailwind v3 (PostCSS), ESLint 9 flat config, Vitest 4, Playwright 1.60.

**Spec:** [`docs/superpowers/specs/2026-05-16-vue-vite-migration-design.md`](../specs/2026-05-16-vue-vite-migration-design.md)

---

## Pre-flight

Зафіксуй baseline-метрики до початку, щоб у Task 11 порівняти.

- [ ] **Step 0.1: Capture baseline bundle size**

```bash
npm run generate 2>&1 | tail -20
du -sh .output/public/_nuxt 2>/dev/null
find .output/public/_nuxt -name '*.js' -exec wc -c {} + | tail -1
```

Запиши результат — потім в Task 11 порівняємо з `dist/assets`.

- [ ] **Step 0.2: Verify clean working tree**

```bash
git status
git branch --show-current
```

Очікувано: `clean`, `vue-and-vite`.

---

## Task 1: Scaffold Vite + remove Nuxt

**Files:**
- Create: `vite.config.ts`, `postcss.config.js`, `tsconfig.json` (replace), `tsconfig.node.json`, `index.html`, `app/main.ts` (skeleton)
- Move: `assets/` → `app/assets/`, `i18n/` → `app/i18n/`
- Modify: `package.json` (deps + scripts)
- Delete: `nuxt.config.ts`, `.nuxt/`, `.output/`

Repo після цього таску ще не запускається — підкреслюємо тільки скелет.

- [ ] **Step 1.1: Update package.json deps + scripts**

Перепиши `package.json`:

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
Added (devDeps): `@vitejs/plugin-vue`, `@vue/eslint-config-typescript`, `autoprefixer`, `eslint-plugin-vue`, `postcss`, `tailwindcss` (явно — раніше тягнувся @nuxtjs/tailwindcss), `vite`, `vue-eslint-parser`, `vue-tsc`.
Added (deps): `@iconify/vue`, `vue-i18n`.
Kept `dotenv` (потрібен для Playwright).

- [ ] **Step 1.2: Run npm install**

```bash
rm -rf node_modules .nuxt .output package-lock.json
npm install
```

Очікувано: `package-lock.json` створено, install без помилок. Якщо є peer-warnings про vue-router 5.x — це норма (це вже мажор для Vue 3).

- [ ] **Step 1.3: Create vite.config.ts**

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

- [ ] **Step 1.4: Create postcss.config.js**

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

- [ ] **Step 1.5: Replace tsconfig.json**

Видали поточний `tsconfig.json` (Nuxt-references) і створи новий:

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

- [ ] **Step 1.6: Create tsconfig.node.json**

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

- [ ] **Step 1.7: Move folders into app/**

```bash
git mv assets app/assets
git mv i18n app/i18n
```

- [ ] **Step 1.8: Create index.html**

В корені (root проєкту):

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

- [ ] **Step 1.9: Перенеси favicon.svg в public/**

```bash
mkdir -p public
# якщо favicon.svg вже в public/ (Nuxt convention) — skip
if [ -f app/public/favicon.svg ]; then git mv app/public/favicon.svg public/favicon.svg; fi
if [ -f public/favicon.svg ]; then echo "ok"; else echo "MISSING — find it: find . -name favicon.svg"; fi
```

Якщо `MISSING` — знайди через `find . -name favicon.svg -not -path './node_modules/*'` і перенеси в `public/favicon.svg` через `git mv`.

- [ ] **Step 1.10: Create app/main.ts (skeleton)**

```ts
import { createApp } from 'vue'
import App from './App.vue'

createApp(App).mount('#app')
```

Це тимчасовий мінімум — у Task 4 і 5 розширимо.

- [ ] **Step 1.11: Delete Nuxt config**

```bash
rm -f nuxt.config.ts
rm -rf .nuxt .output
```

- [ ] **Step 1.12: Update .gitignore**

Перевір, що `.nuxt` і `.output` лишаються в `.gitignore`, додай `dist`:

```bash
grep -qxF 'dist' .gitignore || echo 'dist' >> .gitignore
```

- [ ] **Step 1.13: Commit**

```bash
git add -A
git commit -m "chore: scaffold vite + remove nuxt"
```

---

## Task 2: Explicit vue-router + App.vue

**Files:**
- Create: `app/router.ts`, `app/App.vue`
- Delete: `app/app.vue`

- [ ] **Step 2.1: Create app/router.ts**

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

- [ ] **Step 2.2: Create app/App.vue**

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

- [ ] **Step 2.3: Delete old app.vue**

```bash
rm app/app.vue
```

- [ ] **Step 2.4: Wire router у main.ts (proміжна версія)**

Перепиши `app/main.ts`:

```ts
import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'

createApp(App).use(router).mount('#app')
```

(Pinia, i18n, plugins додамо в наступних тасках, щоб коміти лишались малими.)

- [ ] **Step 2.5: Commit**

```bash
git add -A
git commit -m "feat: explicit vue-router + App.vue"
```

---

## Task 3: vue-i18n bootstrap

**Files:**
- Create: `app/i18n.ts`
- Modify: `app/main.ts`

- [ ] **Step 3.1: Create app/i18n.ts**

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

- [ ] **Step 3.2: Wire i18n у main.ts**

Перепиши `app/main.ts`:

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

- [ ] **Step 3.3: Commit**

```bash
git add -A
git commit -m "feat: vue-i18n bootstrap + pinia wiring"
```

---

## Task 4: Explicit imports refactor

Найбільший коміт. Кожен SFC/store/composable, що використовував Nuxt auto-imports, отримує явні `import`-и. Виконуй файл за файлом, після кожних 5-7 файлів — sanity-check `npx vue-tsc --noEmit -p tsconfig.json` (очікувано: помилок поменшає поступово).

### Маппінг (Nuxt auto-import → явний import)

| Auto-imported | Як імпортувати |
|---|---|
| `ref`, `computed`, `onMounted`, `onUnmounted`, `onBeforeUnmount`, `watch`, `reactive`, `toRef`, `toRefs`, `nextTick` | `from 'vue'` |
| `useRoute`, `useRouter` | `from 'vue-router'` |
| `useI18n` | `from 'vue-i18n'` |
| `storeToRefs`, `defineStore` | `from 'pinia'` |
| `useTheme` | `from '~/composables/useTheme'` |
| `useDylanAvatar` | `from '~/composables/useDylanAvatar'` |
| `defineNuxtPlugin` | (видаляється — див. Task 7) |
| `import.meta.client` | (видаляється — завжди true в SPA) |
| `import.meta.server` | (видаляється — завжди false) |
| `useRuntimeConfig().public.X` | (рефакториться в Task 5 під `import.meta.env.VITE_X`) |

**Файли для оновлення (повний список з grep):**
- `app/components/AppHeader.vue`
- `app/components/AuthModal.vue`
- `app/components/ConfigureCardDeckModal.vue`
- `app/components/JoinOverlay.vue`
- `app/components/PieChart.vue`
- `app/components/PlayerRow.vue`
- `app/components/PlayersList.vue`
- `app/components/ResultsArea.vue`
- `app/components/Timer.vue`
- `app/components/UserSettingsModal.vue`
- `app/components/ConnectionBanner.vue` (якщо у `<script setup>` є auto-imports — verify)
- `app/composables/useTheme.ts`
- `app/composables/useDylanAvatar.ts`
- `app/pages/index.vue`
- `app/pages/login.vue`
- `app/pages/signup.vue`
- `app/pages/forgot-password.vue`
- `app/pages/reset-password.vue`
- `app/pages/[slug].vue`
- `app/stores/auth.ts`
- `app/stores/room.ts`
- `app/stores/players.ts`
- `app/stores/presence.ts`
- `app/stores/profiles.ts`
- `app/lib/supabase-instance.ts` (нічого додавати — він вже з явними імпортами)

- [ ] **Step 4.1: Update composables**

`app/composables/useTheme.ts` — заміни весь файл:

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

`app/composables/useDylanAvatar.ts` — без `import.meta.*` guards, файл вже працює як є (читаючи код, він автономний). Перевір `grep "import.meta" app/composables/useDylanAvatar.ts` — очікувано 0 результатів.

- [ ] **Step 4.2: Update stores**

Для КОЖНОГО store файлу (`auth.ts`, `room.ts`, `players.ts`, `presence.ts`, `profiles.ts`):

1. Відкрий файл.
2. Якщо `defineStore` ще не імпортовано — додай `import { defineStore } from 'pinia'` зверху.
3. Якщо `ref`/`computed`/etc використовуються — додай `import { ref, computed } from 'vue'` (точний список залежить від файлу — використовуй `grep -oE "\b(ref|computed|reactive|watch|onMounted|onUnmounted|nextTick|toRef|toRefs)\(" app/stores/X.ts | sort -u`).
4. Якщо `storeToRefs` — додай в той самий pinia import.

**Sanity check** після всіх 5 stores:

```bash
npx vue-tsc --noEmit -p tsconfig.json 2>&1 | grep -E "(stores/|error)" | head -30
```

Очікувано: store-помилки зникли (можуть лишатись помилки в components/pages — це норма, перейдемо до них).

- [ ] **Step 4.3: Update components (10 файлів)**

Для КОЖНОГО з 10 components (`AppHeader.vue`, `AuthModal.vue`, `ConfigureCardDeckModal.vue`, `JoinOverlay.vue`, `PieChart.vue`, `PlayerRow.vue`, `PlayersList.vue`, `ResultsArea.vue`, `Timer.vue`, `UserSettingsModal.vue`):

1. Знайди, які Vue/router/i18n/pinia API використовуються:
   ```bash
   grep -oE "\b(ref|computed|reactive|watch|onMounted|onUnmounted|onBeforeUnmount|nextTick|toRef|toRefs|useRoute|useRouter|useI18n|storeToRefs|useTheme|useDylanAvatar)\(" app/components/X.vue | sort -u
   ```
2. Додай відповідні `import`-и в самий початок `<script setup lang="ts">` (за маппінгом вище).
3. Прибери все `import.meta.client`/`import.meta.server` — для client guard просто видали умову (код виконається завжди), для server guard видали увесь блок.

Працюй по 3-4 файли, потім після кожної пачки:

```bash
npx vue-tsc --noEmit -p tsconfig.json 2>&1 | tail -10
```

- [ ] **Step 4.4: Update pages (6 файлів)**

Аналогічно для `index.vue`, `login.vue`, `signup.vue`, `forgot-password.vue`, `reset-password.vue`, `[slug].vue`.

**Special: `[slug].vue`** має `route.params.slug as string`. Заміни на:
```ts
import { useRoute, useRouter } from 'vue-router'
const route = useRoute()
const router = useRouter()
const urlParam = route.params.slug as string
```

Якщо у будь-якій сторінці зустрінеш `navigateTo('/path')` — заміни на `router.push('/path')`.

Якщо `definePageMeta({ ... })` — видали (Nuxt-only).

- [ ] **Step 4.5: Verify typecheck**

```bash
npx vue-tsc --noEmit -p tsconfig.json
```

Очікувано: 0 помилок. Якщо щось лишилось — це або пропущений auto-import (повторити grep), або реальний баг.

- [ ] **Step 4.6: Run unit tests**

```bash
npm run test:unit
```

Очікувано: усі тести зелені (тести не залежать від Nuxt runtime, лише від `~` alias і pinia).

- [ ] **Step 4.7: Commit**

```bash
git add -A
git commit -m "refactor: explicit imports у SFC/stores/composables"
```

---

## Task 5: Supabase init + VITE_* env vars

**Files:**
- Modify: `app/lib/supabase-instance.ts`, `.env/.env`, `.env/.env.local`, `.env/.env.example`, `.env/.env.test`, `.env/.env.test.example`
- Delete: `app/plugins/supabase.ts`

- [ ] **Step 5.1: Update app/lib/supabase-instance.ts**

Замінити весь файл:

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

`setSupabase` лишається для тестів (Vitest injects mock).

- [ ] **Step 5.2: Delete Nuxt plugin**

```bash
rm app/plugins/supabase.ts
```

- [ ] **Step 5.3: Wire initSupabase у main.ts**

Перепиши `app/main.ts`:

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

(`v-wave` і `click-outside` додамо в Task 7.)

- [ ] **Step 5.4: Rename env keys**

Для кожного env-файлу (`.env/.env`, `.env/.env.local`, `.env/.env.example`, `.env/.env.test`, `.env/.env.test.example`):

```bash
# REPLACE: SUPABASE_URL → VITE_SUPABASE_URL, SUPABASE_KEY → VITE_SUPABASE_KEY
# (server-only SUPABASE_SECRET_KEY залишається БЕЗ префіксу VITE_)
```

Виконай у редакторі: знайди `SUPABASE_URL=` → `VITE_SUPABASE_URL=`, `SUPABASE_KEY=` → `VITE_SUPABASE_KEY=`. НЕ чіпай `SUPABASE_SECRET_KEY`, `SUPABASE_TEST_SERVICE_ROLE_KEY`, `E2E_*`.

**Playwright config:** залиш як є — `playwright.config.ts` пишe `SUPABASE_URL`/`SUPABASE_KEY` в env webServer-а. Onовіть лише саме передавання:

Знайди в `playwright.config.ts`:
```ts
env: {
  SUPABASE_URL: process.env.SUPABASE_URL!,
  SUPABASE_KEY: process.env.SUPABASE_KEY!,
  ...previewBlockedEnv,
},
```
Замінь на:
```ts
env: {
  VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  VITE_SUPABASE_KEY: process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_KEY || '',
  ...previewBlockedEnv,
},
```

Fallback на старі імена — для зворотньої сумісності з GitHub Actions secrets (вони називаються `E2E_SUPABASE_URL`/`E2E_SUPABASE_ANON_KEY`, мапяться в `SUPABASE_URL`/`SUPABASE_KEY` в ci.yml — окремо оновимо в Task 10).

- [ ] **Step 5.5: Update CLAUDE.md env paragraph**

У `CLAUDE.md` секція `Environment Setup` — поточний приклад:
```
SUPABASE_URL=...
SUPABASE_KEY=...
```
заміни на:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_KEY=...
# SUPABASE_SECRET_KEY=... (server-side only, не VITE_*)
```
І прибери згадку про `nuxt.config.ts` маппінг у runtimeConfig. Заміни на: "Vite читає `.env/` через `envDir` у `vite.config.ts`; клієнтський код через `import.meta.env.VITE_*`."

- [ ] **Step 5.6: Run unit tests**

```bash
npm run test:unit
```

Очікувано: усі тести зелені (тести вже мокають через `setSupabase`).

- [ ] **Step 5.7: Commit**

```bash
git add -A
git commit -m "refactor: supabase init + VITE_* env vars"
```

---

## Task 6: @iconify/vue замість @nuxt/icon

**Files:**
- Create: `app/lib/registerAppIcons.ts`
- Modify: 8 components з `<Icon name=...>`, `app/main.ts`

- [ ] **Step 6.1: Create app/lib/registerAppIcons.ts**

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

- [ ] **Step 6.2: Wire registerAppIcons у main.ts**

Додай у `app/main.ts` перед `createApp`:

```ts
import { registerAppIcons } from './lib/registerAppIcons'
// ... existing imports ...

initSupabase()
registerAppIcons()

createApp(App)
  // ... .use(...) chain ...
```

- [ ] **Step 6.3: Replace `<Icon name=...>` → `<Icon icon=...>` у 8 файлах**

Файли: `AppHeader.vue`, `AuthModal.vue`, `ConfigureCardDeckModal.vue`, `JoinOverlay.vue`, `PlayerRow.vue`, `Timer.vue`, `UserSettingsModal.vue`, `pages/[slug].vue`.

Для КОЖНОГО файлу:

1. Додай імпорт у `<script setup>`:
   ```ts
   import { Icon } from '@iconify/vue'
   ```
2. Заміни всі `<Icon name=` на `<Icon icon=` (regex `s/<Icon name=/<Icon icon=/g` в файлі).
3. Якщо є `<Icon :name="...">` — заміни на `<Icon :icon="...">`.

Швидкий sweep (sed in-place, BSD-compatible):
```bash
for f in app/components/AppHeader.vue app/components/AuthModal.vue app/components/ConfigureCardDeckModal.vue app/components/JoinOverlay.vue app/components/PlayerRow.vue app/components/Timer.vue app/components/UserSettingsModal.vue app/pages/\[slug\].vue; do
  sed -i '' 's/<Icon name=/<Icon icon=/g; s/<Icon :name=/<Icon :icon=/g' "$f"
done
```

Потім вручну додай `import { Icon } from '@iconify/vue'` у кожен з цих 8 файлів (sed не зможе помістити імпорт у правильне місце `<script setup>`).

- [ ] **Step 6.4: Sanity check**

```bash
grep -rn "<Icon name=" app/ && echo 'STILL HAS name=' || echo 'all replaced'
grep -rn "from '@iconify/vue'" app/components app/pages | wc -l
```

Очікувано: `all replaced`, 8 файлів з імпортом.

- [ ] **Step 6.5: Typecheck**

```bash
npx vue-tsc --noEmit -p tsconfig.json
```

- [ ] **Step 6.6: Commit**

```bash
git add -A
git commit -m "refactor: @iconify/vue + addCollection для app: icons"
```

---

## Task 7: vWave + clickOutside як Vue plugins

**Files:**
- Create: `app/directives/clickOutside.ts`
- Modify: `app/main.ts`
- Delete: `app/plugins/clickOutside.ts`, `app/plugins/vWave.ts`

- [ ] **Step 7.1: Create app/directives/clickOutside.ts**

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

- [ ] **Step 7.2: Update app/main.ts (фінальна версія)**

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

CSS import (`~/assets/css/main.css`) — критичний. Це активує Tailwind та custom styles.

- [ ] **Step 7.3: Delete Nuxt plugins**

```bash
rm app/plugins/clickOutside.ts app/plugins/vWave.ts
rmdir app/plugins 2>/dev/null || true
```

- [ ] **Step 7.4: Verify dev server starts**

```bash
npm run dev
```

Очікувано: Vite старт без помилок, URL `http://localhost:3000`. Відкрий браузер і перевір:
- Головна `/` рендериться
- Тема працює (toggle dark/light)
- Іконки видно
- Локалізація працює (uk за замовчуванням)

Зупини dev server (Ctrl+C).

- [ ] **Step 7.5: Run unit tests**

```bash
npm run test:unit
```

- [ ] **Step 7.6: Commit**

```bash
git add -A
git commit -m "refactor: vWave + clickOutside як Vue plugins"
```

---

## Task 8: ESLint flat config + Tailwind PostCSS

**Files:**
- Create: `eslint.config.js`
- Delete: `.eslintrc*` (якщо є)

- [ ] **Step 8.1: Create eslint.config.js**

У корені:

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

- [ ] **Step 8.2: Verify postcss.config.js + tailwind**

Перевір, що `postcss.config.js` створено в Task 1.4. Зміст:
```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

Перевір, що `tailwind.config.ts` НЕ має reference на @nuxtjs/tailwindcss:
```bash
grep -n "nuxt" tailwind.config.ts || echo 'clean'
```

- [ ] **Step 8.3: Run lint**

```bash
npm run lint
```

Очікувано: 0 errors (можуть бути warnings — це OK). Якщо є errors про невідому конфігурацію плагіну — перевір що `eslint-plugin-vue` і `@vue/eslint-config-typescript` встановлені.

- [ ] **Step 8.4: Run typecheck**

```bash
npm run typecheck
```

Очікувано: 0 errors.

- [ ] **Step 8.5: Run full test:ci**

```bash
npm run test:ci
```

Це виконає: lint + typecheck + unit tests + vite build.

Очікувано: усе зелене. Якщо build падає — діагностуй конкретну помилку (часто це `~` alias у CSS-import або пропущений explicit import).

- [ ] **Step 8.6: Commit**

```bash
git add -A
git commit -m "chore: eslint flat config + tailwind postcss"
```

---

## Task 9: Netlify SPA + CI update

**Files:**
- Create: `netlify.toml`, `public/_redirects`
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 9.1: Create netlify.toml**

У корені:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

- [ ] **Step 9.2: Create public/_redirects**

```
/*  /index.html  200
```

(Trailing newline.)

- [ ] **Step 9.3: Update .github/workflows/ci.yml**

Знайди в `deploy` job (рядок ~125):
```yaml
      - name: Build (static)
        run: npm run generate

      - name: Deploy to Netlify
        uses: netlify/actions/cli@master
        with:
          args: deploy --dir=.output/public --prod
```

Замінь на:
```yaml
      - name: Build
        run: npm run build

      - name: Deploy to Netlify
        uses: netlify/actions/cli@master
        with:
          args: deploy --dir=dist --prod
```

Знайди в `e2e` job (рядок ~80):
```yaml
        env:
          SUPABASE_URL: ${{ secrets.E2E_SUPABASE_URL }}
          SUPABASE_KEY: ${{ secrets.E2E_SUPABASE_ANON_KEY }}
```

Замінь на:
```yaml
        env:
          VITE_SUPABASE_URL: ${{ secrets.E2E_SUPABASE_URL }}
          VITE_SUPABASE_KEY: ${{ secrets.E2E_SUPABASE_ANON_KEY }}
          SUPABASE_URL: ${{ secrets.E2E_SUPABASE_URL }}
          SUPABASE_KEY: ${{ secrets.E2E_SUPABASE_ANON_KEY }}
```

(Залишаємо обидва набори для backward-compat з `playwright.config.ts` fallback.)

- [ ] **Step 9.4: Commit**

```bash
git add -A
git commit -m "chore: netlify spa + ci update"
```

---

## Task 10: Docs update + bundle diff

**Files:**
- Modify: `CLAUDE.md`, `README.md`, `ROADMAP.md`

- [ ] **Step 10.1: Update CLAUDE.md**

Перепиши секцію `## Tech Stack`:

```markdown
- **Framework:** Vue 3.5 + Vite 6 SPA, Composition API `<script setup>`, `srcDir: app/`
- **Routing:** `vue-router@5` — явні маршрути в `app/router.ts`, без file-based routing
- **Styling:** Tailwind v3 через PostCSS (autoprefixer), токени в `tailwind.config.ts`, MUI-like класи в `app/assets/css/main.css`
  - utilities: `text-{primary,body,muted,disabled,inverse,danger,success}`, `bg-{app,appbar,paper,elevated,overlay,skeleton}`, `border` (DEFAULT = `var(--border)`), `shadow-{1..8}`
  - button modifiers (compose з `.mui-btn`): `.mui-btn-md` (180×46 / 23rad / `#607d8b`), `.mui-btn-sm`, `.mui-btn-text`, `.mui-btn-secondary`
- **State:** Pinia 3 (без auto-imports — явні `from 'pinia'`)
- **Backend:** Supabase Postgres + Realtime + Presence + Auth
- **i18n:** `vue-i18n@10` (runtime compilation), `legacy: false`, локалі `app/i18n/locales/{uk,en}.json`
- **UI:** `@iconify/vue` + `@iconify-json/ic` (`ic:baseline-*`); custom collection `app:` для `moderator`, `deciding`, `offline`, `leave-room` — зареєстровано через `addCollection` у `app/lib/registerAppIcons.ts`; `v-wave`, DiceBear, Roboto 300–700
- **Node/npm:** Node >=24.15.0, npm >=11.12.0
```

Перепиши секцію `## Common Commands`:

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

Перепиши секцію `## Environment Setup`:

```markdown
Усі env-файли — у `/.env/` (gitignored, окрім `*.example`):

- `/.env/.env.local` — персональні override
- `/.env/.env` — командні defaults
- `/.env/.env.test` — креди тестового Supabase project для Playwright
- Vite читає через `envDir: '.env'` у `vite.config.ts`

Шаблон:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_KEY=...        # publishable client key
# SUPABASE_SECRET_KEY=...    # server-side only, БЕЗ VITE_ префіксу
```

Клієнтський код читає через `import.meta.env.VITE_*` (тільки змінні з префіксом `VITE_` потрапляють у browser bundle).
```

Перепиши секцію `## Project Structure` — заміни Nuxt-структуру на:

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
│   ├── router.ts          # явні 6 routes
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

Видали з CLAUDE.md будь-які згадки `nuxt.config.ts`, `@nuxtjs/*`, `@nuxt/*`, `defineNuxtPlugin`, `useRuntimeConfig`, `<NuxtPage />`, `nuxt generate`, `.output/public`. Якщо CLAUDE.md перевищить 200 рядків — перенеси розширені деталі в DESIGN.md, а в CLAUDE.md залиш короткі посилання.

- [ ] **Step 10.2: Update README.md**

Знайди в `README.md` згадки `Nuxt`, `nuxt dev`, `nuxt generate` — заміни на Vite-еквіваленти. Якщо є badge "Built with Nuxt" — заміни на "Built with Vue + Vite".

- [ ] **Step 10.3: Update ROADMAP.md**

Додай нові розділи після поточного `## Поточний стан` (або там, де логічно):

```markdown
## Vue + Vite migration ✅ DONE (або ⚠️ IN PROGRESS до завершення)

**Spec:** [`docs/superpowers/specs/2026-05-16-vue-vite-migration-design.md`](docs/superpowers/specs/2026-05-16-vue-vite-migration-design.md)
**Plan:** [`docs/superpowers/plans/2026-05-16-vue-vite-migration.md`](docs/superpowers/plans/2026-05-16-vue-vite-migration.md)

Pure Vue 3 + Vite 6 SPA замість Nuxt 4 SSG. Менший dep-surface, явні imports і router, vue-i18n runtime, @iconify/vue.

---

## Post-migration tech debt ⏳ planned

### Tailwind v4
Перенести з v3 (`@nuxtjs/tailwindcss` спадщина — вже зрізана) на native `@tailwindcss/vite` plugin з CSS-first `@theme` config. Перенести `tailwind.config.ts` у `app/assets/css/main.css`. Візуальна регресійна перевірка через Playwright screenshots (новий iter).

### vue-i18n precompile
Перейти з runtime compilation на `@intlify/unplugin-vue-i18n` (precompile messages у render-функції під час build). Швидший runtime + менший bundle + прибере dev warning `[intlify] Runtime compilation is being used`.

### Bundle metrics
Зафіксувати в репозиторії before/after сумарного розміру `dist/assets/*.js` після завершення міграції (PR-комент). Якщо bundle gorsche — діагностика через `rollup-plugin-visualizer`.
```

- [ ] **Step 10.4: Run full test:ci**

```bash
npm run test:ci
```

Очікувано: усе зелене.

- [ ] **Step 10.5: Capture after-bundle size + порівняй з baseline**

```bash
du -sh dist/assets
find dist/assets -name '*.js' -exec wc -c {} + | tail -1
```

Запиши результат у PR-опис як `Before: <baseline>  After: <new>`. Якщо after > before — додай у ROADMAP TODO для post-migration аналізу через `rollup-plugin-visualizer`.

- [ ] **Step 10.6: E2E smoke**

```bash
# Зупини будь-який локально запущений dev server на :3000
npm run test:e2e:smoke
```

Очікувано: smoke pack зелений на chromium і webkit. Якщо webkit фейлить через `critical-flows.spec.ts` — це очікувано (testIgnore, P2 у ROADMAP).

- [ ] **Step 10.7: Manual UI smoke**

```bash
npm run build && npm run preview
```

Відкрий `http://localhost:3000` і перевір вручну:
- Home → "Create room" → потрапляє в кімнату з 8-символьним id
- У кімнаті: тема toggle (dark/light), мова toggle (uk/en), `Configure card deck` modal
- Голосування: вибір карти, `Reveal` (потрібен другий гравець або соло — `?` рахується)
- Login/Logout, Sign up flow
- AppHeader avatar editor
- Recent Rooms на головній

- [ ] **Step 10.8: Commit**

```bash
git add -A
git commit -m "docs: оновити CLAUDE.md, README, ROADMAP для vue+vite"
```

---

## Post-implementation

- [ ] **Step P.1: Push branch**

```bash
git push -u origin vue-and-vite
```

- [ ] **Step P.2: Create PR**

Назва: `feat: migrate from Nuxt to Vue + Vite`

Body має містити:
- Посилання на spec і plan
- Bundle-size diff (Before / After з Step 10.5)
- Чек-лист manual smoke з Step 10.7
- Note: Tailwind v4 і vue-i18n precompile — у ROADMAP як наступні iters

- [ ] **Step P.3: Очисти TaskList**

Видали всі pending tasks з migration (через TaskUpdate `status=deleted` або `completed`).

---

## Notes for the executing agent

- **Не намагайся писати нові тести для міграції.** Існуюча suite (unit + E2E) — це регресійний контроль; жодних змін у функціональності не вноситься, тому нові тести не потрібні.
- **Не торкайся stores API.** Стори лишаються байт-в-байт з функціональної точки зору; додаються тільки `import` statements.
- **Не змінюй структуру JSON-локалей** і не міняй ключів. Це окрема робота, поза скоупом.
- **Не намагайся одночасно мігрувати на Tailwind v4.** Це окремий iter, зафіксований у ROADMAP після цієї міграції.
- **Якщо `git mv` фейлить через `pathspec`** — файл уже міг бути переміщений. Перевір `git status` і `ls` цільового шляху перед повтором.
- **Якщо `vue-tsc` показує помилки про `import.meta.env`** — додай `/// <reference types="vite/client" />` в `app/main.ts` або переконайся, що `tsconfig.json` має `"types": ["vite/client"]` (Step 1.5).
- **Якщо `npm run dev` показує `[vue-i18n] Runtime compilation is being used`** — це warning, не error. Лишаємо як є (зафіксовано в ROADMAP як precompile follow-up).
- **Якщо Iconify icons не рендеряться** — перевір, що `registerAppIcons()` викликається ПЕРЕД `createApp(...).mount(...)` у `main.ts`. Для `ic:baseline-*` нічого додатково не треба — `@iconify-json/ic` встановлений як devDep і `@iconify/vue` ESM лазено резолвить.
