# Playwright Smoke E2E Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Додати Playwright smoke pack (3 user flows) у `tests/e2e/`, інтегрувати у CI окремим job-ом, який блокує deploy.

**Architecture:** Root `playwright.config.ts`, тести в `tests/e2e/`, Page Object Model у `tests/page-objects/`, custom Playwright fixtures зі service-role cleanup у `tests/fixtures/`, ESM-сумісний ручний `loadDotenv({ override: true })` для `.env/.env.test`. CI отримує новий `detect-secrets` job, який видає прапори; `e2e` і `deploy` jobs мають `if:` на ці outputs (бо `secrets.*` не expand-яться в job-level `if`).

**Tech Stack:** `@playwright/test` ^1.x, `dotenv` ^16.x, `@supabase/supabase-js` (вже встановлено), Node 24+.

**Спека:** `docs/superpowers/specs/2026-05-15-playwright-e2e-tests-design.md`. Якщо ці файли розходяться — спека канон.

> As-built note: цей план зберігає детальні task-by-task нотатки з початкового розбиття. Канонічна поточна структура описана у секціях Goal/Architecture/Файлова структура вище та у спеці: root `playwright.config.ts`, E2E specs у `tests/e2e/`, fixtures у `tests/fixtures/`, POM у `tests/page-objects/`.

---

## Файлова структура

Створюємо:
- `supabase/migrations/007_players_room_state_realtime.sql` — idempotent додавання `players` і `room_state` до `supabase_realtime` (P5)
- `.env/.env.test.example` — committed шаблон
- `playwright.config.ts` — конфіг (ESM, dotenv, webServer)
- `tests/support/helpers/supabase-admin.ts` — service-role клієнт, тільки в Node
- `tests/fixtures/room.ts` — auto-cleanup створених кімнат
- `tests/fixtures/auth.ts` — auto-cleanup створених юзерів + UI signup helper
- `tests/fixtures/console.ts` — browser console/pageerror guard
- `tests/support/test.ts` — merged Playwright fixtures
- `tests/page-objects/HomePage.ts` — POM для `/`
- `tests/page-objects/RoomPage.ts` — POM для `/<roomId>`
- `tests/page-objects/AuthPage.ts` — POM для `/signup`, `/login`, account menu
- `tests/e2e/smoke.spec.ts` — Flow 1 + Flow 2
- `tests/e2e/critical-flows.spec.ts` — Flow 3 (chromium only)

Модифікуємо:
- `.gitignore` — зняти `package-lock.json`; додати `test-results/`, `playwright-report/`, `!/.env/.env.test.example`
- `package.json` — devDeps + scripts
- `package-lock.json` — починає трекатись після P1
- `app/pages/index.vue` — testids
- `app/pages/signup.vue` — testids
- `app/pages/login.vue` — testids
- `app/components/AppHeader.vue` — testids
- `app/components/CardsArea.vue` — testids + `aria-pressed`
- `app/components/ResultsArea.vue` — `results-area` і `new-round-button` testids
- `app/components/PlayersList.vue` — testid root + типу `players` prop
- `app/components/PlayerRow.vue` — testid root + data-* атрибути + `votePending` поле player
- `app/pages/[slug].vue` — `playersForUi` додає `votePending`
- `.github/workflows/ci.yml` — `detect-secrets` job, новий `e2e` job, виправлення `deploy.if`
- `CLAUDE.md` — нотатка про обов'язковий lockfile (mitigation R1)

---

## Phase 1 — Передумови (blockers)

### Task 1: P1 — lockfile у git

**Files:**
- Modify: `.gitignore`
- Add: `package-lock.json` (генерується npm)

- [ ] **Step 1: Прибрати lockfile з .gitignore**

Edit `.gitignore`: видалити рядок 5 (`package-lock.json`). Решта файлу залишається.

- [ ] **Step 2: Згенерувати lockfile**

Run:
```bash
npm install
```
Expected: створено/оновлено `package-lock.json` у корені.

- [ ] **Step 3: Перевірити що `npm ci` працює локально**

Run:
```bash
rm -rf node_modules && npm ci
```
Expected: успішна інсталяція без помилок.

- [ ] **Step 4: Commit**

```bash
git add .gitignore package-lock.json
git commit -m "chore: track package-lock.json (required for npm ci)"
```

---

### Task 2: P5 — Realtime publication для `players` і `room_state`

**Files:**
- Create: `supabase/migrations/007_players_room_state_realtime.sql`

- [ ] **Step 1: Створити міграцію**

Write `supabase/migrations/007_players_room_state_realtime.sql`:

```sql
do $$ begin
  alter publication supabase_realtime add table players;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table room_state;
exception when duplicate_object then null;
end $$;
```

- [ ] **Step 2: Накатати у test Supabase project**

Manual: відкрити SQL Editor у test Supabase project → paste content вище → Run. Очікувано без помилок (idempotent).

- [ ] **Step 3: Накатати у production Supabase project**

Manual: те саме у production project. Idempotent — повторний прогін не зламається, якщо таблиці вже у publication.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/007_players_room_state_realtime.sql
git commit -m "feat(db): add players and room_state to realtime publication"
```

---

### Task 3 (manual): P2 + P3 — Persistent test user у test Supabase project

**Files:** жодних змін у репо.

- [ ] **Step 1: Створити окремий test Supabase project**

Manual: Supabase Dashboard → New Project. Зафіксувати URL і `anon` key, плюс `service_role` key (Settings → API).

- [ ] **Step 2: Накатати всі міграції 001..007 у test project**

Manual: SQL Editor → виконати кожен файл з `supabase/migrations/` по черзі.

- [ ] **Step 3: Залишити email-confirmation увімкненим**

Manual: Authentication → Providers → Email → переконатись що `Confirm email` ON. Це P2 — тест signup перевіряє success-screen, не autologin.

- [ ] **Step 4: Створити persistent test user**

Manual: Authentication → Users → Add user → Email + Password (зберегти у password manager). Підтвердити email через `Mark as confirmed` або через лист.

- [ ] **Step 5: Завести GitHub secrets**

Manual: repo Settings → Secrets and variables → Actions:
- `E2E_SUPABASE_URL` — URL з test project
- `E2E_SUPABASE_ANON_KEY` — anon publishable key
- `E2E_SUPABASE_SERVICE_ROLE_KEY` — service role key
- `E2E_TEST_USER_EMAIL` — email persistent user
- `E2E_TEST_USER_PASSWORD` — пароль persistent user

Не комітити креди.

---

## Phase 2 — DOM contract (data-testid атрибути)

### Task 4: testids у `app/pages/index.vue`

**Files:**
- Modify: `app/pages/index.vue`

- [ ] **Step 1: Додати testid на input імені**

Edit `app/pages/index.vue` line 114 — додати `data-testid="home-name-input"` у `<input v-model="name" ...>`. Решта атрибутів без змін:

```vue
<input
  v-model="name"
  type="text"
  data-testid="home-name-input"
  :placeholder="$t('home.namePlaceholder')"
  class="mui-input h-[51px] max-w-[280px]"
  :class="{ 'is-error': hasError }"
  @keyup.enter="createRoom"
/>
```

- [ ] **Step 2: Додати testid на кнопку Create Room**

Edit `app/pages/index.vue` line 122 — додати `data-testid="home-create-room"` у `<button @click="createRoom">`. Решта без змін.

- [ ] **Step 3: Запустити unit-suite (sanity)**

Run:
```bash
npm test
```
Expected: PASS (testids не зачіпають unit-логіку).

- [ ] **Step 4: Commit**

```bash
git add app/pages/index.vue
git commit -m "chore(ui): add data-testid for e2e on home page"
```

---

### Task 5: testids + data-* у `PlayerRow.vue` / `PlayersList.vue` + plumbing `votePending`

**Files:**
- Modify: `app/components/PlayerRow.vue`
- Modify: `app/components/PlayersList.vue`
- Modify: `app/pages/[slug].vue`

- [ ] **Step 1: Розширити `playersForUi` у `[slug].vue` полем `votePending`**

Edit `app/pages/[slug].vue` lines 55-61. Замінити computed на:

```ts
const playersForUi = computed(() =>
  visiblePlayers.value.map(p => ({
    ...p,
    is_online: online.value.has(p.id),
    vote: playersStore.voteOf(p.id),
    votePending: pendingVotes.value[p.id] !== undefined,
  }))
)
```

`pendingVotes` уже задестракчений на лінії 26.

- [ ] **Step 2: Додати `votePending` у тип `players` prop у `PlayersList.vue`**

Edit `app/components/PlayersList.vue` lines 2-15. Додати поле `votePending: boolean` в інлайн-тип одного player. Тіло компонента без змін.

```ts
const props = defineProps<{
  players: Array<{
    id: string
    name: string
    is_moderator: boolean
    vote: string | null
    is_online: boolean
    user_id: string | null
    votePending: boolean
  }>
  phase: 'voting' | 'revealed'
  currentPlayerId: string | null
  currentUserIsAuthorizedModerator: boolean
}>()
```

- [ ] **Step 3: Додати `data-testid` на root `PlayersList`**

Edit `app/components/PlayersList.vue` line 30 — додати `data-testid="players-list"` на `<div class="mui-paper">`.

- [ ] **Step 4: Розширити тип `player` prop у `PlayerRow.vue` полем `votePending`**

Edit `app/components/PlayerRow.vue` lines 2-15:

```ts
const props = defineProps<{
  player: {
    id: string
    name: string
    is_moderator: boolean
    vote: string | null
    is_online: boolean
    user_id: string | null
    votePending: boolean
  }
  phase: 'voting' | 'revealed'
  currentPlayerId: string | null
  currentUserIsAuthorizedModerator: boolean
  openMenuId: string | null
}>()
```

- [ ] **Step 5: Додати testid + data-* на root `PlayerRow`**

Edit `app/components/PlayerRow.vue` line 62-65 — root `<div>`. Додати атрибути:

```vue
<div
  class="grid items-center gap-2 rounded relative"
  style="grid-template-columns: 32px 1fr auto 36px;"
  data-testid="player-row"
  :data-player-name="player.name"
  :data-voted="String(player.vote !== null)"
  :data-vote-pending="String(player.votePending)"
>
```

- [ ] **Step 6: Запустити unit-suite**

Run:
```bash
npm test
```
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add app/components/PlayerRow.vue app/components/PlayersList.vue app/pages/\[slug\].vue
git commit -m "chore(ui): add data-testid and vote-pending markers on player rows"
```

---

### Task 6: testids + `aria-pressed` у `CardsArea.vue`

**Files:**
- Modify: `app/components/CardsArea.vue`

- [ ] **Step 1: Додати атрибути на vote-card buttons**

Edit `app/components/CardsArea.vue` lines 23-31 — `<button>` всередині `v-for`. Додати `data-testid="vote-card"`, `:data-value="card"`, `:aria-pressed="String(selectedVote === card)"`:

```vue
<button
  v-wave
  type="button"
  class="mui-card"
  :class="{ 'is-selected': selectedVote === card }"
  data-testid="vote-card"
  :data-value="card"
  :aria-pressed="String(selectedVote === card)"
  @click="emit('vote', card)"
>
  <span class="mui-card-value">{{ card }}</span>
</button>
```

- [ ] **Step 2: Додати testid на кнопку Reveal**

Edit `app/components/CardsArea.vue` line 36 — додати `data-testid="reveal-button"`:

```vue
<button v-wave class="mui-btn" data-testid="reveal-button" :disabled="!hasVotes" @click="emit('reveal')">{{ $t('cards.reveal') }}</button>
```

- [ ] **Step 3: Commit**

```bash
git add app/components/CardsArea.vue
git commit -m "chore(ui): add data-testid and aria-pressed on vote cards"
```

---

### Task 7: testids у `ResultsArea.vue`

**Files:**
- Modify: `app/components/ResultsArea.vue`

- [ ] **Step 1: Додати testid на root container**

Edit `app/components/ResultsArea.vue` line 25 — root `<div>`:

```vue
<div class="flex flex-col items-center gap-8 w-full" data-testid="results-area">
```

- [ ] **Step 2: Додати testid на кнопку Start New Round**

Edit `app/components/ResultsArea.vue` lines 39-44:

```vue
<button
  v-if="isModerator"
  class="mui-btn"
  data-testid="new-round-button"
  @click="emit('startNewRound')"
>
  {{ $t('cards.startNewRound') }}
</button>
```

- [ ] **Step 3: Commit**

```bash
git add app/components/ResultsArea.vue
git commit -m "chore(ui): add data-testid for results area and new-round button"
```

---

### Task 8: testids у `AppHeader.vue`

**Files:**
- Modify: `app/components/AppHeader.vue`

- [ ] **Step 1: testid на кнопку avatar (account menu trigger)**

Edit `app/components/AppHeader.vue` line 116-132 — `<button>` навколо аватара. Додати `data-testid="account-menu-button"`:

```vue
<button
  v-wave
  class="mui-icon-btn"
  style="--hover-bg: rgba(255,255,255,0.08); color: #fff;"
  data-testid="account-menu-button"
  :aria-label="$t('header.currentUserAccount')"
  aria-haspopup="true"
  @click.stop="showMenu = !showMenu"
>
```

- [ ] **Step 2: testid на Sign In menu item**

Edit `app/components/AppHeader.vue` line 174 — додати `data-testid="auth-sign-in-menu-item"`:

```vue
<button v-wave class="mui-menu-item whitespace-nowrap" data-testid="auth-sign-in-menu-item" @click="emit('openSignIn'); showMenu = false">
  <Icon class="mui-menu-icon" name="app:login" /> {{ $t('common.signIn') }}
</button>
```

- [ ] **Step 3: testid на Sign Out menu item**

Edit `app/components/AppHeader.vue` line 187 — додати `data-testid="auth-sign-out-menu-item"`:

```vue
<button v-wave class="mui-menu-item whitespace-nowrap" data-testid="auth-sign-out-menu-item" @click="emit('signOut'); showMenu = false">
  <Icon class="mui-menu-icon" name="app:logout" /> {{ $t('common.signOut') }}
</button>
```

- [ ] **Step 4: Commit**

```bash
git add app/components/AppHeader.vue
git commit -m "chore(ui): add data-testid for account menu controls"
```

---

### Task 9: testids у `signup.vue`

**Files:**
- Modify: `app/pages/signup.vue`

- [ ] **Step 1: testids на signup form fields і submit**

Edit `app/pages/signup.vue`:

- Line 73 (`<input v-model.trim="form.email" ...>`) — додати `data-testid="signup-email"`
- Line 78 (`<input v-model="form.password" ...>`) — додати `data-testid="signup-password"`
- Line 83 (`<input v-model="form.confirm" ...>`) — додати `data-testid="signup-confirm"`
- Line 90 (`<button v-wave class="mui-btn" type="submit" ...>`) — додати `data-testid="signup-submit"`

- [ ] **Step 2: testid на success block**

Edit `app/pages/signup.vue` line 66:

```vue
<div v-if="success" class="text-center mt-6" data-testid="signup-success">
```

- [ ] **Step 3: Commit**

```bash
git add app/pages/signup.vue
git commit -m "chore(ui): add data-testid for signup form"
```

---

### Task 10: testids у `login.vue`

**Files:**
- Modify: `app/pages/login.vue`

- [ ] **Step 1: testids на login form fields і submit**

Edit `app/pages/login.vue`:

- Line 66 (`<input v-model.trim="form.email" ...>`) — додати `data-testid="login-email"`
- Line 75 (`<input v-model="form.password" ...>`) — додати `data-testid="login-password"`
- Line 82 (`<button v-wave class="mui-btn" type="submit" ...>`) — додати `data-testid="login-submit"`

- [ ] **Step 2: Запустити unit-suite + build (sanity для всіх Phase 2 змін)**

Run:
```bash
npm test && npm run build
```
Expected: PASS + успішний build.

- [ ] **Step 3: Commit**

```bash
git add app/pages/login.vue
git commit -m "chore(ui): add data-testid for login form"
```

---

## Phase 3 — gitignore + env scaffolding

### Task 11: Оновити `.gitignore`

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Додати правила**

Edit `.gitignore` — після рядка `!/.env/.env.example` додати:

```
!/.env/.env.test.example

/e2e/test-results/
/e2e/playwright-report/
```

Перевірити, що `package-lock.json` уже вилучено (Task 1). Якщо ні — вилучити.

- [ ] **Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: ignore playwright artifacts, allow .env.test.example"
```

---

### Task 12: `.env/.env.test.example`

**Files:**
- Create: `.env/.env.test.example`

- [ ] **Step 1: Створити шаблон**

Write `.env/.env.test.example`:

```bash
# Local e2e env. Copy to .env/.env.test (gitignored) and fill in test Supabase project credentials.
SUPABASE_URL=https://your-test-project.supabase.co
SUPABASE_KEY=sb_publishable_anon_key_from_test_project
SUPABASE_TEST_SERVICE_ROLE_KEY=sb_service_role_key_from_test_project

# Persistent test user created manually in test Supabase project (P3)
E2E_TEST_USER_EMAIL=e2e-user@storypoker-test.dev
E2E_TEST_USER_PASSWORD=replace-with-strong-password
```

- [ ] **Step 2: Commit**

```bash
git add .env/.env.test.example
git commit -m "chore: add .env.test.example for e2e local runs"
```

---

## Phase 4 — Playwright base setup

### Task 13: Devdeps + npm scripts

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Встановити devdeps**

Run:
```bash
npm install -D @playwright/test dotenv
```
Expected: `package.json` і `package-lock.json` оновлено; обидва пакети у `devDependencies`.

- [ ] **Step 2: Додати scripts**

Edit `package.json`, у `scripts` додати після `"test:watch"`:

```json
"test:e2e": "playwright test -c e2e/playwright.config.ts",
"test:e2e:ui": "playwright test -c e2e/playwright.config.ts --ui"
```

- [ ] **Step 3: Встановити Playwright browsers (локально, один раз)**

Run:
```bash
npx playwright install chromium webkit
```
Expected: завантажено бінарники Chromium і WebKit.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @playwright/test and dotenv devdeps + e2e scripts"
```

---

### Task 14: `e2e/playwright.config.ts`

**Files:**
- Create: `e2e/playwright.config.ts`

- [ ] **Step 1: Створити конфіг**

Write `e2e/playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test'
import { config as loadDotenv } from 'dotenv'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __cfgDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__cfgDir, '..')

if (!process.env.CI) {
  loadDotenv({ path: resolve(repoRoot, '.env/.env.test') })
}

export default defineConfig({
  testDir: './tests',
  outputDir: resolve(__cfgDir, 'test-results'),
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never', outputFolder: resolve(__cfgDir, 'playwright-report') }]]
    : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: devices['Desktop Chrome'] },
    {
      name: 'webkit',
      use: devices['Desktop Safari'],
      testIgnore: ['**/auth-signup-login.spec.ts'],
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npm run build && npm run preview',
        cwd: repoRoot,
        url: 'http://localhost:3000',
        timeout: 180_000,
        reuseExistingServer: !process.env.CI,
        env: {
          SUPABASE_URL: process.env.SUPABASE_URL!,
          SUPABASE_KEY: process.env.SUPABASE_KEY!,
          SUPABASE_TEST_SERVICE_ROLE_KEY: '',
          SUPABASE_SECRET_KEY: '',
          E2E_SUPABASE_SERVICE_ROLE_KEY: '',
          E2E_TEST_USER_EMAIL: '',
          E2E_TEST_USER_PASSWORD: '',
        },
      },
})
```

- [ ] **Step 2: Sanity-check config компілюється**

Run (без `.env/.env.test` спершу):
```bash
npx playwright test -c e2e/playwright.config.ts --list
```
Expected: помилка про "no tests found" АБО успішний `0 tests` — обидва допустимі; головне щоб не було SyntaxError/TypeError.

- [ ] **Step 3: Commit**

```bash
git add e2e/playwright.config.ts
git commit -m "feat(e2e): playwright config with esm dotenv and isolated webserver env"
```

---

## Phase 5 — Fixtures + POMs

### Task 15: `e2e/fixtures/supabase-admin.ts`

**Files:**
- Create: `e2e/fixtures/supabase-admin.ts`

- [ ] **Step 1: Створити admin клієнт**

Write `e2e/fixtures/supabase-admin.ts`:

```ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export function getAdminClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL / SUPABASE_TEST_SERVICE_ROLE_KEY')
  }
  return createClient(url, key, { auth: { persistSession: false } })
}
```

- [ ] **Step 2: Грепнути що не використовується з `app/`**

Run:
```bash
grep -r "supabase-admin" app/
```
Expected: порожній вивід.

- [ ] **Step 3: Commit**

```bash
git add e2e/fixtures/supabase-admin.ts
git commit -m "feat(e2e): service-role admin client (node-only)"
```

---

### Task 16: `e2e/fixtures/room.ts`

**Files:**
- Create: `e2e/fixtures/room.ts`

- [ ] **Step 1: Створити фікстуру з cleanup-policy**

Write `e2e/fixtures/room.ts`:

```ts
import { test as base } from '@playwright/test'
import { getAdminClient } from './supabase-admin'

export type RoomFixtures = {
  trackedRoomIds: string[]
}

export const test = base.extend<RoomFixtures>({
  trackedRoomIds: async ({}, use, testInfo) => {
    const ids: string[] = []
    await use(ids)
    if (!ids.length) return
    const admin = getAdminClient()
    for (const id of ids) {
      const { error } = await admin.from('rooms').delete().eq('id', id)
      if (!error) continue
      const msg = `room cleanup failed for ${id}: ${error.message}`
      if (testInfo.status === 'passed') throw new Error(msg)
      await testInfo.attach('cleanup-error', { body: msg, contentType: 'text/plain' })
    }
  },
})

export const expect = test.expect
```

Cleanup policy (з спеки):
- test passed + cleanup failed → throw (не маскуємо stale state)
- test failed + cleanup failed → attach лог, не override-имо причину падіння

Видалення `rooms` тригерить CASCADE на `room_state` / `players` / `round_history` (`001_initial_schema.sql:43-44`).

- [ ] **Step 2: Commit**

```bash
git add e2e/fixtures/room.ts
git commit -m "feat(e2e): room fixture with service-role cascade cleanup"
```

---

### Task 17: `e2e/fixtures/auth.ts`

**Files:**
- Create: `e2e/fixtures/auth.ts`

- [ ] **Step 1: Створити фікстуру з UI helper і admin-cleanup**

Write `e2e/fixtures/auth.ts`:

```ts
import { test as base, type Page } from '@playwright/test'
import { getAdminClient } from './supabase-admin'

export type AuthFixtures = {
  trackedEmails: string[]
  signupViaUI: (page: Page, email: string, password: string) => Promise<void>
}

async function findUserIdByEmail(
  admin: ReturnType<typeof getAdminClient>,
  email: string,
): Promise<string | null> {
  const needle = email.toLowerCase()
  let page = 1
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw new Error(`listUsers failed on page ${page}: ${error.message}`)
    const users = data?.users ?? []
    const match = users.find(u => (u.email ?? '').toLowerCase() === needle)
    if (match) return match.id
    if (users.length < 1000) return null
    page += 1
  }
}

export const test = base.extend<AuthFixtures>({
  trackedEmails: async ({}, use, testInfo) => {
    const emails: string[] = []
    await use(emails)
    if (!emails.length) return
    const admin = getAdminClient()
    for (const email of emails) {
      try {
        const userId = await findUserIdByEmail(admin, email)
        if (!userId) {
          const msg = `cleanup: user not found for ${email}`
          if (testInfo.status === 'passed') throw new Error(msg)
          await testInfo.attach('cleanup-error', { body: msg, contentType: 'text/plain' })
          continue
        }
        const { error } = await admin.auth.admin.deleteUser(userId)
        if (!error) continue
        const msg = `deleteUser failed for ${email}: ${error.message}`
        if (testInfo.status === 'passed') throw new Error(msg)
        await testInfo.attach('cleanup-error', { body: msg, contentType: 'text/plain' })
      } catch (err: any) {
        if (testInfo.status === 'passed') throw err
        await testInfo.attach('cleanup-error', {
          body: String(err?.message ?? err),
          contentType: 'text/plain',
        })
      }
    }
  },

  signupViaUI: async ({}, use) => {
    await use(async (page, email, password) => {
      await page.goto('/signup')
      await page.getByTestId('signup-email').fill(email)
      await page.getByTestId('signup-password').fill(password)
      await page.getByTestId('signup-confirm').fill(password)
      await page.getByTestId('signup-submit').click()
    })
  },
})

export const expect = test.expect
```

- [ ] **Step 2: Commit**

```bash
git add e2e/fixtures/auth.ts
git commit -m "feat(e2e): auth fixture with admin cleanup and signup helper"
```

---

### Task 18: `e2e/pages/HomePage.ts`

**Files:**
- Create: `e2e/pages/HomePage.ts`

- [ ] **Step 1: Створити POM**

Write `e2e/pages/HomePage.ts`:

```ts
import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

const ROOM_ID_RE = /\/([A-Za-z0-9]{8})(?:\?|#|$)/

export class HomePage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/')
  }

  async createRoom(name: string): Promise<string> {
    await this.page.getByTestId('home-name-input').fill(name)
    await this.page.getByTestId('home-create-room').click()
    await this.page.waitForURL(ROOM_ID_RE)
    const match = this.page.url().match(ROOM_ID_RE)
    if (!match) throw new Error(`URL did not match room id pattern: ${this.page.url()}`)
    await expect(this.page.getByTestId('players-list')).toBeVisible()
    return match[1]
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add e2e/pages/HomePage.ts
git commit -m "feat(e2e): HomePage object"
```

---

### Task 19: `e2e/pages/RoomPage.ts`

**Files:**
- Create: `e2e/pages/RoomPage.ts`

- [ ] **Step 1: Створити POM**

Write `e2e/pages/RoomPage.ts`:

```ts
import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'

export class RoomPage {
  constructor(private readonly page: Page) {}

  playerRow(name: string): Locator {
    return this.page.locator(`[data-testid="player-row"][data-player-name="${name}"]`)
  }

  voteCard(value: string): Locator {
    return this.page.locator(`[data-testid="vote-card"][data-value="${value}"]`)
  }

  resultsArea(): Locator {
    return this.page.getByTestId('results-area')
  }

  revealButton(): Locator {
    return this.page.getByTestId('reveal-button')
  }

  newRoundButton(): Locator {
    return this.page.getByTestId('new-round-button')
  }

  async castVote(value: string) {
    const card = this.voteCard(value)
    await card.click()
    await expect(card).toHaveAttribute('aria-pressed', 'true')
  }

  async waitVoteConfirmed(name: string) {
    const row = this.playerRow(name)
    await expect(row).toHaveAttribute('data-voted', 'true')
    await expect(row).toHaveAttribute('data-vote-pending', 'false')
  }

  async reveal() {
    await this.revealButton().click()
    await expect(this.resultsArea()).toBeVisible()
  }

  async newRound() {
    await this.newRoundButton().click()
    await expect(this.resultsArea()).toBeHidden()
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add e2e/pages/RoomPage.ts
git commit -m "feat(e2e): RoomPage object with vote/reveal/round helpers"
```

---

### Task 20: `e2e/pages/AuthPage.ts`

**Files:**
- Create: `e2e/pages/AuthPage.ts`

- [ ] **Step 1: Створити POM**

Write `e2e/pages/AuthPage.ts`:

```ts
import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

export class AuthPage {
  constructor(private readonly page: Page) {}

  async login(email: string, password: string) {
    await this.page.goto('/login')
    await this.page.getByTestId('login-email').fill(email)
    await this.page.getByTestId('login-password').fill(password)
    await this.page.getByTestId('login-submit').click()
    await this.page.waitForURL((url) => url.pathname === '/')
  }

  async openAccountMenu() {
    await this.page.getByTestId('account-menu-button').click()
  }

  async expectSignedIn() {
    await this.openAccountMenu()
    await expect(this.page.getByTestId('auth-sign-out-menu-item')).toBeVisible()
    await expect(this.page.getByTestId('auth-sign-in-menu-item')).toHaveCount(0)
  }

  async expectSignedOut() {
    await this.openAccountMenu()
    await expect(this.page.getByTestId('auth-sign-in-menu-item')).toBeVisible()
    await expect(this.page.getByTestId('auth-sign-out-menu-item')).toHaveCount(0)
  }

  async signOut() {
    await this.openAccountMenu()
    await this.page.getByTestId('auth-sign-out-menu-item').click()
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add e2e/pages/AuthPage.ts
git commit -m "feat(e2e): AuthPage object with sign-in/out flows"
```

---

## Phase 6 — Тести

### Task 21: Flow 1 — `home-create-room.spec.ts`

**Files:**
- Create: `e2e/tests/home-create-room.spec.ts`

- [ ] **Step 1: Створити локальний `.env/.env.test`**

Manual: скопіювати `.env/.env.test.example` → `.env/.env.test`, заповнити з Task 3 credentials. Файл gitignored.

- [ ] **Step 2: Написати тест**

Write `e2e/tests/home-create-room.spec.ts`:

```ts
import { test, expect } from '../fixtures/room'
import { HomePage } from '../pages/HomePage'

test('home → create room → joined as moderator with auto-rejoin', async ({ page, trackedRoomIds }) => {
  const home = new HomePage(page)
  await home.goto()
  const roomId = await home.createRoom('E2E Tester')
  trackedRoomIds.push(roomId)

  await expect(
    page.locator('[data-testid="player-row"][data-player-name="E2E Tester"]'),
  ).toBeVisible()

  await expect(page.getByTestId('reveal-button')).toBeVisible()

  const session = await page.evaluate(
    (id) => localStorage.getItem(`storypoker_session_${id}`),
    roomId,
  )
  expect(session).not.toBeNull()
  const parsed = JSON.parse(session!)
  expect(parsed.playerId).toEqual(expect.any(String))
  expect(parsed.playerName).toBe('E2E Tester')
  expect(parsed.lastVisitedAt).toEqual(expect.any(Number))

  await page.reload()
  await expect(
    page.locator('[data-testid="player-row"][data-player-name="E2E Tester"]'),
  ).toBeVisible()
})
```

- [ ] **Step 3: Прогнати тест локально**

Run:
```bash
npm run test:e2e -- e2e/tests/home-create-room.spec.ts
```
Expected: 2 PASS (chromium + webkit). Якщо WebKit зависає — підняти `webServer.timeout` або вручну `npm run build && npm run preview` і повторити з `E2E_BASE_URL=http://localhost:3000`.

- [ ] **Step 4: Commit**

```bash
git add e2e/tests/home-create-room.spec.ts
git commit -m "test(e2e): home create-room flow with auto-rejoin"
```

---

### Task 22: Flow 2 — `solo-vote-reveal.spec.ts`

**Files:**
- Create: `e2e/tests/solo-vote-reveal.spec.ts`

- [ ] **Step 1: Написати тест**

Write `e2e/tests/solo-vote-reveal.spec.ts`:

```ts
import { test, expect } from '../fixtures/room'
import { HomePage } from '../pages/HomePage'
import { RoomPage } from '../pages/RoomPage'

test('moderator votes, reveals, starts new round', async ({ page, trackedRoomIds }) => {
  const home = new HomePage(page)
  const room = new RoomPage(page)
  const NAME = 'Moderator Solo'

  const roomId = await home.createRoom(NAME)
  trackedRoomIds.push(roomId)

  await room.castVote('5')
  await room.waitVoteConfirmed(NAME)

  await room.reveal()
  await expect(room.resultsArea()).toContainText('5')

  await room.newRound()
  await expect(room.voteCard('5')).toBeEnabled()
})
```

Залежність від Flow 1 mechanics: home-flow робить `toggleModerator(true)` (`app/pages/index.vue:75`) — тому ми обираємо саме цей шлях, інакше `reveal-button` не з'явиться (CardsArea рендерить його лише при `isModerator`).

Caveat (з спеки): `round_history` не пишеться для solo (потрібно `votes.length >= 2`); ми це не assert-имо.

- [ ] **Step 2: Прогнати тест локально**

Run:
```bash
npm run test:e2e -- e2e/tests/solo-vote-reveal.spec.ts
```
Expected: 2 PASS (chromium + webkit). Якщо vote-confirmed чекає — впевнитися що P5 міграція накатана у test project (без `players` у publication UPDATE подія не приходить, `pendingVotes` не очищується).

- [ ] **Step 3: Commit**

```bash
git add e2e/tests/solo-vote-reveal.spec.ts
git commit -m "test(e2e): solo vote/reveal/new-round flow"
```

---

### Task 23: Flow 3 — `auth-signup-login.spec.ts`

**Files:**
- Create: `e2e/tests/auth-signup-login.spec.ts`

- [ ] **Step 1: Написати тест**

Write `e2e/tests/auth-signup-login.spec.ts`:

```ts
import { randomUUID } from 'node:crypto'
import { test, expect } from '../fixtures/auth'
import { AuthPage } from '../pages/AuthPage'

test('signup → success screen (email confirmation on)', async ({ page, signupViaUI, trackedEmails }) => {
  const password = process.env.E2E_TEST_USER_PASSWORD ?? ''
  test.skip(!password, 'E2E_TEST_USER_PASSWORD is not set')

  const email = `e2e-${randomUUID()}@storypoker-test.dev`
  trackedEmails.push(email)

  await signupViaUI(page, email, password)
  await expect(page.getByTestId('signup-success')).toBeVisible()
})

test('login persistent user → account menu reflects signed-in/out', async ({ page }) => {
  const email = process.env.E2E_TEST_USER_EMAIL ?? ''
  const password = process.env.E2E_TEST_USER_PASSWORD ?? ''
  test.skip(!email || !password, 'E2E_TEST_USER_EMAIL / E2E_TEST_USER_PASSWORD must be set')

  const auth = new AuthPage(page)
  await auth.login(email, password)
  await auth.expectSignedIn()
  await auth.signOut()
  await auth.expectSignedOut()
})
```

webkit-проєкт виключений через `testIgnore` у `playwright.config.ts` (Task 14, project `webkit`). Жодних додаткових `test.skip()` тут не потрібно.

- [ ] **Step 2: Прогнати тест локально**

Run:
```bash
npm run test:e2e -- e2e/tests/auth-signup-login.spec.ts
```
Expected: 2 PASS (тільки chromium; webkit skipped).

- [ ] **Step 3: Прогнати повний smoke-pack**

Run:
```bash
npm run test:e2e
```
Expected: 6 PASS total (3 chromium + 2 webkit + 0 skipped from webkit на auth). Точніше: home/solo по 2, auth тільки 2 chromium → 4 + 2 = 6.

- [ ] **Step 4: Commit**

```bash
git add e2e/tests/auth-signup-login.spec.ts
git commit -m "test(e2e): signup success screen + login sign-out cycle"
```

---

## Phase 7 — CI integration

### Task 24: Переписати `.github/workflows/ci.yml`

**Files:**
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Замінити вміст файлу повністю**

Write `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

jobs:
  detect-secrets:
    runs-on: ubuntu-latest
    outputs:
      has_e2e: ${{ steps.check.outputs.has_e2e }}
      has_netlify: ${{ steps.check.outputs.has_netlify }}
    steps:
      - id: check
        env:
          E2E_URL: ${{ secrets.E2E_SUPABASE_URL }}
          E2E_ANON: ${{ secrets.E2E_SUPABASE_ANON_KEY }}
          E2E_SR: ${{ secrets.E2E_SUPABASE_SERVICE_ROLE_KEY }}
          E2E_USER: ${{ secrets.E2E_TEST_USER_EMAIL }}
          E2E_PASS: ${{ secrets.E2E_TEST_USER_PASSWORD }}
          NETLIFY_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE: ${{ secrets.NETLIFY_SITE_ID }}
        run: |
          if [[ -n "$E2E_URL" && -n "$E2E_ANON" && -n "$E2E_SR" && -n "$E2E_USER" && -n "$E2E_PASS" ]]; then
            echo "has_e2e=true" >> "$GITHUB_OUTPUT"
          else
            echo "has_e2e=false" >> "$GITHUB_OUTPUT"
          fi
          if [[ -n "$NETLIFY_TOKEN" && -n "$NETLIFY_SITE" ]]; then
            echo "has_netlify=true" >> "$GITHUB_OUTPUT"
          else
            echo "has_netlify=false" >> "$GITHUB_OUTPUT"
          fi

  test:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    concurrency:
      group: ci-test-${{ github.ref }}
      cancel-in-progress: true
    steps:
      - uses: actions/checkout@v4
      - name: Use Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - name: Install
        run: npm ci
      - name: Unit tests
        run: npm run test:ci
      - name: Build
        run: npm run build

  e2e:
    needs: detect-secrets
    if: ${{ needs.detect-secrets.outputs.has_e2e == 'true' }}
    runs-on: ubuntu-latest
    timeout-minutes: 15
    concurrency:
      group: ci-e2e-${{ github.ref }}
      cancel-in-progress: true
    steps:
      - uses: actions/checkout@v4
      - name: Use Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - name: Install
        run: npm ci
      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium webkit
      - name: Run E2E
        env:
          SUPABASE_URL: ${{ secrets.E2E_SUPABASE_URL }}
          SUPABASE_KEY: ${{ secrets.E2E_SUPABASE_ANON_KEY }}
          SUPABASE_TEST_SERVICE_ROLE_KEY: ${{ secrets.E2E_SUPABASE_SERVICE_ROLE_KEY }}
          E2E_TEST_USER_EMAIL: ${{ secrets.E2E_TEST_USER_EMAIL }}
          E2E_TEST_USER_PASSWORD: ${{ secrets.E2E_TEST_USER_PASSWORD }}
        run: npm run test:e2e
      - if: ${{ failure() }}
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: e2e/playwright-report/
          retention-days: 7

  deploy:
    needs: [test, e2e, detect-secrets]
    if: |
      always()
      && github.ref == 'refs/heads/main'
      && needs.test.result == 'success'
      && (needs.e2e.result == 'success' || needs.e2e.result == 'skipped')
      && needs.detect-secrets.outputs.has_netlify == 'true'
    runs-on: ubuntu-latest
    timeout-minutes: 15
    concurrency:
      group: ci-deploy-${{ github.ref }}
      cancel-in-progress: true
    steps:
      - uses: actions/checkout@v4
      - name: Use Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - name: Install
        run: npm ci
      - name: Build (static)
        run: npm run generate
      - name: Deploy to Netlify
        uses: netlify/actions/cli@master
        with:
          args: deploy --dir=.output/public --prod
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

Зверни увагу:
- `secrets.*` у job-level `if:` НЕ використовуються — замість цього `needs.detect-secrets.outputs.*`. Це виправляє регресію існуючого `deploy.if` (`.github/workflows/ci.yml:35` у поточному файлі).
- `deploy` має `always() && ...` тому що без `always()` skipped `e2e` job завадить оцінити решту умов. E2E failure блокує deploy, skipped E2E не блокує deploy.

- [ ] **Step 2: Перевірити YAML локально**

Run:
```bash
npx --yes -p js-yaml js-yaml .github/workflows/ci.yml > /dev/null
```
Expected: тихий вихід (валідний YAML). Якщо `js-yaml` недоступний — пропустити і покластись на GitHub validator.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add e2e job and detect-secrets gate; fix deploy if-condition"
```

- [ ] **Step 4: Push і дочекатися першого CI-прогону на feature branch**

Run:
```bash
git push origin HEAD
```

Перевірити GitHub Actions:
- `detect-secrets` пройшов → `has_e2e=true`, `has_netlify=true` (за умови що Task 3 secrets заведено)
- `test` пройшов
- `e2e` пройшов (6 specs)
- `deploy` skipped (бо не на `main`)

Якщо `e2e` падає — скачати artifact `playwright-report` і відкрити `index.html` локально.

---

## Phase 8 — Документація

### Task 25: Зафіксувати lockfile-вимогу і e2e в `CLAUDE.md`

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Додати пункти**

Edit `CLAUDE.md`:
- У секції "Common Commands" після `npm run test:ci` додати:
  ```
  npm run test:e2e     # playwright smoke pack (3 flows)
  npm run test:e2e:ui  # playwright інтерактивний debug
  ```
- У секції "Environment Setup" додати рядок:
  ```
  - `/.env/.env.test` — креди тестового Supabase project для Playwright (gitignored)
  ```
- Додати нову коротку секцію перед "Common Commands":
  ```
  ## Lockfile

  `package-lock.json` — committed (NPM ci у CI вимагає його). Не повертати у `.gitignore`.
  ```

Тримати файл ≤ 200 рядків (constraint з CLAUDE.md). Якщо переповнить — скоротити інші секції або винести в `DESIGN.md`.

- [ ] **Step 2: Перевірити довжину**

Run:
```bash
wc -l CLAUDE.md
```
Expected: ≤ 200.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: note lockfile requirement and e2e scripts"
```

---

## Self-review checklist

Перевірити перед declared done:

**Spec coverage:**
- P1 lockfile → Task 1
- P2 email-confirm-on → Task 3 (manual)
- P3 persistent user → Task 3 (manual)
- P4 deploy `if:` fix → Task 24 (detect-secrets pattern)
- P5 realtime publication → Task 2
- DOM contract (testids) → Tasks 4–10
- File structure (`e2e/...`) → Tasks 14–23
- `playwright.config.ts` ключові поля → Task 14
- Service-role isolation → Task 15 + grep step
- Custom fixtures `room` / `auth` → Tasks 16, 17
- POMs → Tasks 18, 19, 20
- 3 specs → Tasks 21, 22, 23
- CI job + deploy gate → Task 24
- Required GitHub secrets → Task 3 step 5
- Локальний запуск (`.env/.env.test`) → Tasks 12 + 21 step 1

**Type consistency:**
- `votePending: boolean` — введений у Task 5 step 1 (`playersForUi`), використаний в Task 5 steps 2 і 4 (`PlayersList`, `PlayerRow`), assert-иться в `RoomPage.waitVoteConfirmed` (Task 19) і використовується у Task 22.
- `data-voted` / `data-vote-pending` — однакові імена у Task 5 step 5 і у POM (Task 19).
- `data-testid` слова збігаються у компонентах і POM/тестах (зокрема `home-name-input`, `home-create-room`, `player-row`, `vote-card`, `reveal-button`, `new-round-button`, `results-area`, `account-menu-button`, `auth-sign-in-menu-item`, `auth-sign-out-menu-item`, `signup-*`, `login-*`).
- `getByTestId(...)` повертає Locator у всіх POM — узгоджено.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-05-15-playwright-e2e-tests.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — я диспетчую свіжого subagent на task, дворівневий review між тасками, швидка ітерація.

**2. Inline Execution** — виконую таски в цій сесії через executing-plans, batch з checkpoint-ами.

**Який підхід?**
