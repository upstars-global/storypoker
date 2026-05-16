# Spec — Playwright Smoke E2E Tests

**Дата:** 2026-05-15
**Статус:** Ready (approved after 5 review rounds)
**Контекст:** проєкт `storypoker` має лише Vitest unit-suite в `app/stores/__tests__/` і `app/utils/__tests__/`. Browser-level coverage відсутній. CI (`.github/workflows/ci.yml`) запускає `npm run test:ci` + `npm run build`, нічого далі.

## Мета

Додати smoke-pack Playwright тестів, який покриває 3 критичні user flows і запускається в CI на кожному PR. Smoke-pack блокує deploy job у разі падіння.

**Non-goals:** повне покриття всіх features. Поза scope (винесено в [ROADMAP.md → E2E Test Coverage](../../../ROADMAP.md)): multi-user vote, presence, kick, rename, deck config, timer, history table, password reset, room slug aliases, RLS edge cases.

## Передумови (executable blockers до тестів)

- **P1 — Lockfile у git.** `package-lock.json` зараз у `.gitignore` (commit `82bc818 locks gitignored`). `npm ci` без lockfile падає, що блокує і існуючий, і e2e CI. Рішення: вилучити рядок `package-lock.json` з `.gitignore`, закомітити lockfile.
- **P2 — Email confirmation у test Supabase project.** Прерогатива — детермінований assert. Email confirmation у test project лишається **увімкненим**; тест перевіряє "confirm email" success-screen, а не автологін (продукт `app/pages/signup.vue:40-41,66-69` після `signUp()` завжди показує success screen, незалежно від конфірмації). Якщо в майбутньому продукт зміниться на post-signup redirect, цей крок треба переробити.
- **P3 — Persistent test user.** Створити вручну один раз у test Supabase project (email/password з `E2E_TEST_USER_EMAIL` / `E2E_TEST_USER_PASSWORD`), переконатись що email confirmed. Юзер НЕ видаляється тестами.
- **P4 — Deploy job `if:` regression fix.** Існуючий `.github/workflows/ci.yml:35` має `if: ${{ ... secrets.NETLIFY_AUTH_TOKEN != '' ... }}` — `secrets.*` в job-level `if` не expand-яться ([GitHub docs](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions)). Виправити одночасно з додаванням `e2e` job (див. CI integration).
- **P5 — Realtime publication для `players` і `room_state`.** Зараз у `supabase_realtime` додані тільки `rooms` (`004_rooms_realtime.sql`) і `user_profiles` (`005_user_profiles.sql`). UI у `app/pages/[slug].vue` підписується на `players:<id>` і `room_state:<id>` channels — без publication події не приходять, тобто reveal/new round на чистому test project виглядає як "зависло". Додати міграцію `007_players_room_state_realtime.sql` idempotent-патерном, як в існуючій `004_rooms_realtime.sql`:
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
  Накатати у test Supabase project (через SQL Editor) ПЕРЕД першим запуском smoke. Production project, ймовірно, уже має ці таблиці у publication ручним setup-ом — idempotent pattern гарантує що міграція не зламається при повторному прогоні там.

## Архітектура

### Файлова структура

```
e2e/
├── tests/
│   ├── home-create-room.spec.ts
│   ├── solo-vote-reveal.spec.ts
│   └── auth-signup-login.spec.ts
├── fixtures/
│   ├── room.ts                       # unique room id + service-role cleanup
│   ├── auth.ts                       # signup helper + admin cleanup
│   └── supabase-admin.ts             # service-role client (Node-only)
├── pages/
│   ├── HomePage.ts
│   ├── RoomPage.ts
│   └── AuthPage.ts
└── playwright.config.ts
```

Додатково:
- `package.json`:
  - scripts:
    - `"test:e2e": "playwright test -c e2e/playwright.config.ts"`
    - `"test:e2e:ui": "playwright test -c e2e/playwright.config.ts --ui"`
  - devDeps: `@playwright/test`, `dotenv`
- `.env/.env.test.example` (in git), `.env/.env.test` (gitignored)
- `.gitignore`:
  - **зняти** `package-lock.json` (P1)
  - **додати** `e2e/test-results/`, `e2e/playwright-report/`
  - **додати** `!/.env/.env.test.example` (бо `/.env/*` блокує всі файли крім явних unignore-ів)
- `vitest.config.ts`: Vitest зараз має narrow include `app/**` — `e2e/**` уже виключений де-факто; додавати `exclude` опціонально для явності
- `.github/workflows/ci.yml`: новий `e2e` job + виправлення `deploy` gate

### Селектор-контракт (data-testid)

Щоб тести не залежали від класів/i18n-текстів, додати `data-testid` атрибути у компоненти. Список звірений з реальним DOM:

| testid | компонент:line | призначення |
|---|---|---|
| `home-name-input` | `app/pages/index.vue` (input name) | input імені на home |
| `home-create-room` | `app/pages/index.vue` (кнопка Create Room) | submit |
| `players-list` | `app/components/PlayersList.vue` (root) | список гравців |
| `player-row` | `app/components/PlayerRow.vue` (root) | один рядок; також: `data-player-name="<name>"` для filter, `data-voted="true\|false"` (показує optimistic+confirmed vote), `data-vote-pending="true\|false"` (`true` коли голос ще в `playersStore.pendingVotes`, тобто не дійшов до БД) |
| `vote-card` | `app/components/CardsArea.vue` (кожна картка, `data-value="<label>"`, `aria-pressed="true\|false"`) | картки для голосування |
| `reveal-button` | `app/components/CardsArea.vue` (Reveal кнопка) | reveal trigger |
| `new-round-button` | `app/components/ResultsArea.vue` (Start New Round кнопка) | reset trigger |
| `results-area` | `app/components/ResultsArea.vue` (root) | контейнер результатів |
| `account-menu-button` | `app/components/AppHeader.vue:116` (avatar button) | відкриває dropdown |
| `auth-sign-in-menu-item` | `app/components/AppHeader.vue:174` (menu item) | Sign In в dropdown |
| `auth-sign-out-menu-item` | `app/components/AppHeader.vue:187` (menu item) | Sign Out в dropdown |
| `signup-email`, `signup-password`, `signup-confirm`, `signup-submit` | `app/pages/signup.vue` | поля + submit |
| `signup-success` | `app/pages/signup.vue:66` (success block) | success state |
| `login-email`, `login-password`, `login-submit` | `app/pages/login.vue` | поля + submit |

~16 атрибутів у існуючі компоненти. Жодних додаткових стилів/логіки.

### Принципи

- **Ізоляція unit/e2e:** Vitest працює тільки з `app/**`; Playwright — тільки з `e2e/**`
- **Page Object Model:** селектори у `pages/*.ts`, тести — як сценарії
- **Service-role isolation:** `supabase-admin.ts` живе тільки в Node-процесі Playwright fixtures, ніколи не імпортується з `app/`
- **Test data isolation:** кожен тест працює з власним унікальним room id; auth-тести з унікальним email `e2e-{uuid}@storypoker-test.dev`
- **Cleanup-on-teardown:** Playwright fixtures гарантують cleanup навіть при failed test, через service-role (`rooms` не має public DELETE policy)

## Test scope (3 flows)

### Flow 1 — `home-create-room.spec.ts` (Chromium + WebKit)

Source-of-truth: `app/pages/index.vue:65-78` (`createRoom()`).
Home одразу joinить гравця і робить redirect — JoinOverlay після Create Room не з'являється.

1. Goto `/`
2. Fill `[data-testid=home-name-input]` значенням `E2E Tester`
3. Click `[data-testid=home-create-room]`
4. Чекати redirect на `/<roomId>`, де `roomId` match `/^[A-Za-z0-9]{8}$/` (генератор: `app/stores/room.ts:118-121`)
5. Перевірити:
   - `[data-testid=players-list] [data-testid=player-row][data-player-name="E2E Tester"]` присутній
   - `localStorage['storypoker_session_<roomId>']` має поля `playerId`, `playerName`, `lastVisitedAt`
   - `[data-testid=reveal-button]` присутній → гравець є moderator (`index.vue:75` `toggleModerator(player.id, true)`)
6. `page.reload()` → JoinOverlay не показується (auto-rejoin через session у localStorage); `player-row` досі присутній

Cleanup: room fixture зберігає `roomId` через URL parse у `afterEach` і видаляє кімнату через service-role admin.

### Flow 2 — `solo-vote-reveal.spec.ts` (Chromium + WebKit)

Залежність від Flow 1: тест використовує той самий home flow для створення кімнати — це **єдиний** шлях, де гравець стає moderator (`index.vue:75` робить `toggleModerator(true)`). `playersStore.join()` створює `is_moderator: false` (`app/stores/players.ts:94`), тому direct join у існуючу кімнату не дав би moderator-контролів.

1. Виконати Flow 1 steps 1-4 (через `HomePage` Page Object) як `Moderator Solo` → у кімнаті, moderator
2. Click `[data-testid=vote-card][data-value="5"]` → картка має `aria-pressed="true"` (DOM contract: `CardsArea.vue` виставляє `:aria-pressed="String(isSelected)"` на vote-card)
3. Чекати поки `[data-testid=player-row][data-player-name="Moderator Solo"]` одночасно має `data-voted="true"` І `data-vote-pending="false"` — інакше це optimistic state, який ще не дійшов до БД. Це важливо: `playersStore.voteOf()` (`app/stores/players.ts`) повертає pending value, тому UI показує `data-voted="true"` одразу після кліку. Але `voteCounts`/`ResultsArea` у `app/pages/[slug].vue:65-71` читають `visiblePlayers` напряму (без pending), тож якщо тест клікне Reveal до того як голос сів у БД — `ResultsArea` буде порожньою. (`round_history` у solo не пишеться взагалі через `votes.length >= 2` — окремий caveat нижче, не наслідок гонки.)
4. Click `[data-testid=reveal-button]` (живе у `CardsArea`) → `[data-testid=results-area]` видимий, містить текст `5`
5. Click `[data-testid=new-round-button]` (живе у `ResultsArea`) → `[data-testid=results-area]` зникає, `[data-testid=vote-card]` знову clickable

**Caveat:** `round_history` не пишеться при solo (`reveal()` вимагає `votes.length >= 2`); цей тест не перевіряє таблицю history.

### Flow 3 — `auth-signup-login.spec.ts` (Chromium only)

Project-level обмеження через per-test `test.skip(({ browserName }, testInfo) => browserName !== 'chromium')` у `test.beforeEach` або per-test. `test.describe.configure({ project })` — невалідний API. Альтернатива: `projects[].testIgnore` для webkit, виключаючи `auth-signup-login.spec.ts`. Обираємо `testIgnore` для fitness — менше runtime overhead.

**3a — Signup (детерміністичний outcome, email-confirm ON):**

Source-of-truth: `app/pages/signup.vue`. Після `authStore.signUp(email, password)` форма ставить `success.value = true` і показує "confirm email" success screen (`signup.vue:40-41, 66-69`). Watch на `user` (`signup.vue:23-25`) робить redirect тільки якщо `!success.value` — а success встановлюється першим, тому redirect не відбувається. Тест assert-ить success screen, не redirect.

1. Згенерувати unique email `e2e-{crypto.randomUUID()}@storypoker-test.dev`, password з `E2E_TEST_USER_PASSWORD`
2. Goto `/signup`
3. Fill `[data-testid=signup-email]`, `[data-testid=signup-password]`, `[data-testid=signup-confirm]` (всі три обов'язкові; `signup.vue:13` має `confirm` поле)
4. Click `[data-testid=signup-submit]`
5. Чекати `[data-testid=signup-success]` видимим (success screen з "check your email" повідомленням)
6. `afterEach` fixture teardown:
   - `admin.auth.admin.listUsers({ page: N, perPage: 1000 })` — пагінувати від `page: 1` до знаходження user з exact email match (SDK не підтримує `filter` параметр у `PageParams`; перевірено в `@supabase/auth-js`)
   - Якщо знайдено: `admin.auth.admin.deleteUser(userId)`
   - Errors handling — див. секцію [Cleanup errors policy](#cleanup-errors-policy)

**3b — Login:**

Source-of-truth: `app/pages/login.vue`.

1. Persistent test user (P3) з `E2E_TEST_USER_EMAIL` / `E2E_TEST_USER_PASSWORD`
2. Goto `/login`, fill `[data-testid=login-email]` + `[data-testid=login-password]`, click `[data-testid=login-submit]`
3. Чекати redirect на `/`
4. Перевірити: натиснути `[data-testid=account-menu-button]` → відкривається dropdown → `[data-testid=auth-sign-out-menu-item]` присутній, `[data-testid=auth-sign-in-menu-item]` відсутній
5. Click `[data-testid=auth-sign-out-menu-item]` → перевірити signed-out state:
   - відкрити `[data-testid=account-menu-button]` → `[data-testid=auth-sign-in-menu-item]` присутній, `[data-testid=auth-sign-out-menu-item]` відсутній
6. Persistent user НЕ видаляється у teardown

## Інфраструктура

### `e2e/playwright.config.ts`

Ключові поля:
- `testDir: './tests'`
- `outputDir: resolve(__cfgDir, 'test-results')` (де `__cfgDir = dirname(fileURLToPath(import.meta.url))`)
- `fullyParallel: true`
- `workers: process.env.CI ? 2 : 4`
- `retries: process.env.CI ? 1 : 0`
- `reporter: process.env.CI ? [['github'], ['html', { open: 'never', outputFolder: resolve(__cfgDir, 'playwright-report') }]] : 'list'`
- `use.baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000'`
- `use.trace: 'on-first-retry'`, `use.screenshot: 'only-on-failure'`
- `projects:`
  - `{ name: 'chromium', use: devices['Desktop Chrome'] }`
  - `{ name: 'webkit',   use: devices['Desktop Safari'], testIgnore: ['**/auth-signup-login.spec.ts'] }`
- `webServer`: тільки коли `E2E_BASE_URL` не задано
  - `command: 'npm run build && npm run preview'`
  - `cwd: repoRoot` — обов'язково: за замовчуванням `webServer.cwd` дорівнює директорії config-файлу (`e2e/`), де немає `package.json`; без `cwd` команда падає
  - `url: 'http://localhost:3000'`
  - `timeout: 180_000`
  - `reuseExistingServer: !process.env.CI`
  - `env`: Playwright уже мерджить `process.env` (`packages/playwright/src/plugins/webServerPlugin.ts` робить `{...DEFAULT_ENVIRONMENT_VARIABLES, ...process.env, ...this._options.env}`), тому spread не потрібен. Test-only secrets (service role key, persistent user creds) НЕ потрібні Nuxt preview і не повинні в нього потрапити — їх явно blank-имо щоб обмежити leak surface:
    ```ts
    env: {
      SUPABASE_URL: process.env.SUPABASE_URL!,
      SUPABASE_KEY: process.env.SUPABASE_KEY!,
      SUPABASE_TEST_SERVICE_ROLE_KEY: '',
      SUPABASE_SECRET_KEY: '',          // defensive — repo .env.example має таку назву, локальний .env міг би її прокинути
      E2E_SUPABASE_SERVICE_ROLE_KEY: '', // defensive — CI raw GH secret name; у CI він переіменовується в SUPABASE_TEST_SERVICE_ROLE_KEY, але страхуємось
      E2E_TEST_USER_EMAIL: '',
      E2E_TEST_USER_PASSWORD: '',
    }
    ```

**ESM-сумісне завантаження `.env/.env.test`** (`package.json:3` має `"type": "module"`, `__dirname` undefined):

```ts
import { config as loadDotenv } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __cfgDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__cfgDir, '..');

if (!process.env.CI) {
  loadDotenv({ path: resolve(repoRoot, '.env/.env.test') });
}
```

**Canonical env model:**
- **Локально:** `npm run test:e2e` запускає `playwright test -c e2e/playwright.config.ts`. Playwright config робить `loadDotenv` для `.env/.env.test` ДО запуску `webServer`. Через `webServer.env`, Playwright передає `SUPABASE_URL`/`SUPABASE_KEY` у `npm run preview` як child process env. Nuxt preview бачить їх через `process.env` (Nuxt runtime config map у `nuxt.config.ts`). Жодних дублікатів у `.env/.env.local` не потрібно.
- **CI:** GitHub Actions передає всі секрети через `env:` блок у step. Playwright config бачить `process.env.CI=true` і не викликає `loadDotenv`. `webServer.env` так само пробрасує креди у child preview process.

### `e2e/fixtures/supabase-admin.ts`

```ts
import { createClient } from '@supabase/supabase-js';

export function getAdminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE_URL / SUPABASE_TEST_SERVICE_ROLE_KEY');
  return createClient(url, key, { auth: { persistSession: false } });
}
```

Імпортується тільки з `e2e/fixtures/**`, ніколи з `app/`. Code review check: grep `supabase-admin` у `app/` має повертати порожній результат.

### `e2e/fixtures/room.ts`

Custom Playwright fixture:
- `trackedRoomIds: string[]` — track створені кімнати; helper `track(roomId)` додає; або auto-track через парс URL у `page.on('framenavigated')`
- `afterEach` для кожного `roomId`:
  - `await admin.from('rooms').delete().eq('id', roomId)` — service-role JS call (не raw SQL). `rooms` має тільки public select/insert/update, тому потрібен service-role (`supabase/migrations/001_initial_schema.sql:43-44`)
  - `ON DELETE CASCADE` на `room_state.room_id`, `players.room_id`, `round_history.room_id` прибирає решту
  - Errors handling — див. секцію [Cleanup errors policy](#cleanup-errors-policy)

### `e2e/fixtures/auth.ts`

Custom Playwright fixture:
- `trackedEmails: string[]` — track створених юзерів за email (UI/store не повертають `user.id`)
- helper `signupViaUI(page, email, password)` — виконує signup flow, повертає `Promise<void>`
- `afterEach` для кожного email:
  - Пагінувати `admin.auth.admin.listUsers({ page, perPage: 1000 })` від `page=1` до знаходження user з exact `email` match (SDK не підтримує filter параметр; перевірено `@supabase/auth-js` `PageParams` type)
  - `await admin.auth.admin.deleteUser(userId)`
  - `user_profiles` каскадно прибирається (`005_user_profiles.sql` `on delete cascade`)
  - Errors handling — див. секцію [Cleanup errors policy](#cleanup-errors-policy)

### Cleanup errors policy

**Important — Supabase JS SDK не кидає exceptions:** усі calls (`admin.from(...).delete()`, `admin.auth.admin.deleteUser(...)`, `admin.auth.admin.listUsers(...)`) повертають `{ data, error }`. Cleanup-код має явно перевіряти `error` після кожного call і застосовувати policy нижче:

- **Тест passed → cleanup failed:** throw з помилкою; rerun має побачити stale state, не маскувати проблему
- **Тест failed → cleanup failed:** log через `testInfo.attach('cleanup-error', ...)` або `console.warn`; не override-ити початкову помилку тесту, бо вона важливіша

Реалізація: в `afterEach` перевіряти `testInfo.status === 'passed'`. Якщо так — throw on `error`; інакше log. Це стосується ВСІХ cleanup calls у `e2e/fixtures/room.ts` і `e2e/fixtures/auth.ts`.

## CI integration

### `.github/workflows/ci.yml`

Новий job `e2e`, паралельно до `test`. Виправити одночасно `deploy` job, бо `secrets.*` у job-level `if:` не expand-яться у обох випадках.

**Pattern для обох jobs** — окремий detect job із output:

```yaml
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
    - uses: actions/setup-node@v4
      with: { node-version: 24, cache: npm }
    - run: npm ci
    - run: npx playwright install --with-deps chromium webkit
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
    && needs.e2e.result == 'success'
    && needs.detect-secrets.outputs.has_netlify == 'true'
  # ... решта без змін
```

**Передумова:** P1 (lockfile у git) виконано, інакше `npm ci` падає.

### Required GitHub secrets

Завести один раз у repo Settings:
- `E2E_SUPABASE_URL` — окремий test Supabase project URL
- `E2E_SUPABASE_ANON_KEY` — anon publishable key
- `E2E_SUPABASE_SERVICE_ROLE_KEY` — service role key (Settings → API → service_role)
- `E2E_TEST_USER_EMAIL` — persistent test user для login flow (P3)
- `E2E_TEST_USER_PASSWORD` — пароль того ж юзера

## Локальний запуск

1. Виконати P1, P3 (P2 не потрібно — продукт працює з email-confirm ON)
2. Створити `.env/.env.test` за шаблоном `.env/.env.test.example`
3. `npx playwright install chromium webkit` (один раз)
4. `npm run test:e2e` — Playwright config робить `loadDotenv('.env/.env.test')`, потім запустить build + preview + smoke
5. `npm run test:e2e:ui` — інтерактивний debug

## Залежності і ризики

**Нові залежності:**
- `@playwright/test` (devDep, ~50 MB після `playwright install`)
- `dotenv` (devDep, ~80 KB; Nuxt вже залежить транзитивно)

**Ризики:**
- **R1 — Lockfile gitignore регресія:** документувати у `CLAUDE.md` що lockfile required
- **R2 — Email confirmation toggle:** якщо хтось вимкне email-confirm у test Supabase project або зміниться UI (post-signup auto-login), success-screen assert перестане матчити — треба переписати тест
- **R3 — Flakiness від realtime/WebSocket:** preview build з Supabase realtime може мати timing issues. Mitigation: `retries: 1` в CI, `trace: 'on-first-retry'`, generous `webServer.timeout: 180s`
- **R4 — Service role leak:** ключ дає повний DB access. Mitigation: тільки в CI env + локальний `.env/.env.test` (gitignored); `supabase-admin.ts` ніколи не імпортується з `app/`; code review check на grep
- **R5 — Build time у CI:** `npm run build` додає ~1 хв до e2e job. Acceptable
- **R6 — Admin listUsers cost:** для cleanup ми пагінуємо users. На малому test project це OK; якщо їх стане багато (>1000), додати nightly cleanup job для residual `e2e-*` юзерів

## Тестова стратегія перевірки spec

- Unit `npm test` не торкається `e2e/`
- `npm run test:e2e` має пройти локально перед merge
- CI має пройти на feature branch перед merge у main
- Перевірити поведінку deploy gate:
  - На форку без secrets: `detect-secrets` дає `has_e2e=false` + `has_netlify=false`; `e2e` skipped; `deploy` skipped (через `needs.e2e.result == 'success'` false + `has_netlify=false`); workflow не failed
  - На main з усіма secrets, e2e passed: `deploy` runs
  - На main з усіма secrets, e2e failed: `deploy` skipped (smoke блокує prod — це навмисна поведінка, узгоджено з метою)
  - На main, якщо хтось забуде E2E secrets, але Netlify secrets є: `deploy` skipped (бо `e2e.result != 'success'`); це навмисний strict mode — без smoke deploy не йде

## Посилання

- ROADMAP — [E2E Test Coverage beyond smoke](../../../ROADMAP.md#e2e-test-coverage--beyond-smoke--planned)
- Playwright best practices skill (для імплементації): `.agents/skills/playwright-best-practices`
- Source files referenced у спеці:
  - `app/pages/index.vue:65-78` (home create flow)
  - `app/pages/signup.vue:13,40-41,66-69` (success state, confirm field)
  - `app/components/AppHeader.vue:116,174,187` (account menu)
  - `app/components/CardsArea.vue` (vote cards + reveal button)
  - `app/components/ResultsArea.vue` (new-round button)
  - `app/stores/room.ts:118-121` (room id generator — source of truth для create flow)
  - `app/stores/players.ts:94` (`is_moderator: false` у join)
  - `supabase/migrations/001_initial_schema.sql:43-44` (RLS policies, FK cascade)
  - `supabase/migrations/004_rooms_realtime.sql`, `005_user_profiles.sql` — поточні realtime publications і idempotent pattern, на який спирається P5
  - майбутня `supabase/migrations/007_players_room_state_realtime.sql` — P5 prerequisite
- Існуючий CI workflow: `.github/workflows/ci.yml`
- Існуючі Vitest tests: `app/stores/__tests__/`, `app/utils/__tests__/`, `tests/setup.ts`
- GitHub Actions secrets restrictions: https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions
- Playwright `test.describe.configure`: https://playwright.dev/docs/api/class-test
