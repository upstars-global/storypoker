# Spec - Playwright Smoke E2E Tests

**Date:** 2026-05-15
**Status:** Ready (approved after 5 review rounds)
**Context:** The `storypoker` project has only a Vitest unit suite in `app/stores/__tests__/` and `app/utils/__tests__/`. Browser-level coverage is absent. CI (`.github/workflows/ci.yml`) runs `npm run test:ci` + `npm run build` and nothing further.

## Goal

Add a Playwright smoke pack covering 3 critical user flows and running in CI on every PR. The smoke pack blocks the deploy job if it fails.

**Non-goals:** Full coverage of all features. Out of scope (moved to [E2E coverage beyond smoke](../../initiatives/e2e-coverage.md)): multi-user vote, presence, kick, rename, deck config, timer, history table, password reset, room slug aliases, RLS edge cases.

## Prerequisites (executable blockers before tests)

1. **P1 - Lockfile in git.** `package-lock.json` is currently in `.gitignore` (commit `82bc818 locks gitignored`). `npm ci` fails without a lockfile, blocking both existing and e2e CI. Solution: remove the `package-lock.json` line from `.gitignore` and commit the lockfile.
2. **P2 - Email confirmation in the test Supabase project.** The priority is a deterministic assertion. Email confirmation remains **enabled** in the test project; the test checks the "confirm email" success screen instead of automatic login (the product, `app/pages/signup.vue:40-41,66-69`, always shows the success screen after `signUp()`, regardless of confirmation). If the product changes to a post-signup redirect in the future, this step must be revised.
3. **P3 - Persistent test user.** Create once manually in the test Supabase project (email/password from `E2E_TEST_USER_EMAIL` / `E2E_TEST_USER_PASSWORD`), and ensure the email is confirmed. Tests do NOT delete the user.
4. **P4 - Deploy job `if:` regression fix.** The existing `.github/workflows/ci.yml:35` has `if: ${{ ... secrets.NETLIFY_AUTH_TOKEN != '' ... }}` - `secrets.*` is not expanded in a job-level `if` ([GitHub docs](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions)). Fix this alongside the addition of the `e2e` job (see CI integration).
5. **P5 - Realtime publication for `players` and `room_state`.** Currently only `rooms` (`004_rooms_realtime.sql`) and `user_profiles` (`005_user_profiles.sql`) are added to `supabase_realtime`. The UI in `app/pages/[slug].vue` subscribes to `players:<id>` and `room_state:<id>` channels - without publication, events do not arrive, so reveal/new round appears to hang on a clean test project. Add migration `007_players_room_state_realtime.sql` using an idempotent pattern, as in the existing `004_rooms_realtime.sql`:
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
   Apply it to the test Supabase project (via SQL Editor) BEFORE the first smoke run. The production project likely already has these tables in the publication through manual setup - the idempotent pattern guarantees the migration will not fail if run there again.

## Architecture

### File structure

```
playwright.config.ts
tests/
├── e2e/
│   ├── smoke.spec.ts                 # home/create + solo vote/reveal
│   └── critical-flows.spec.ts        # auth signup/login, chromium only
├── fixtures/
│   ├── room.ts                       # unique room id + service-role cleanup
│   ├── auth.ts                       # signup helper + admin cleanup
│   └── console.ts                    # browser console/pageerror guard
├── page-objects/
│   ├── HomePage.ts
│   ├── RoomPage.ts
│   └── AuthPage.ts
└── support/
    ├── test.ts                       # merged Playwright fixtures
    └── helpers/supabase-admin.ts     # service-role client (Node-only)
```

Additionally:

1. `package.json`:
   1. scripts:
      1. `"test:e2e": "playwright test"`
      2. `"test:e2e:smoke": "playwright test tests/e2e/smoke.spec.ts"`
      3. `"test:e2e:ui": "playwright test --ui"`
   2. devDeps: `@playwright/test`, `dotenv`
2. `.env/.env.test.example` (in git), `.env/.env.test` (gitignored)
3. `.gitignore`:
   1. **remove** `package-lock.json` (P1)
   2. **add** `test-results/`, `playwright-report/`
   3. **add** `!/.env/.env.test.example` (because `/.env/*` blocks all files except explicit unignores)
4. `vitest.config.ts`: Vitest currently has a narrow `app/**` include; `tests/e2e/**` is outside the unit suite
5. `.github/workflows/ci.yml`: new `e2e` job + `deploy` gate fix

### Selector contract (data-testid)

Add `data-testid` attributes to components so tests do not depend on classes/i18n text. The list has been checked against the actual DOM:

| testid | component:line | purpose |
|---|---|---|
| `home-name-input` | `app/pages/index.vue` (input name) | name input on home |
| `home-create-room` | `app/pages/index.vue` (Create Room button) | submit |
| `players-list` | `app/components/PlayersList.vue` (root) | player list |
| `player-row` | `app/components/PlayerRow.vue` (root) | one row; also: `data-player-name="<name>"` for filtering, `data-voted="true\|false"` (shows optimistic+confirmed vote), `data-vote-pending="true\|false"` (`true` while the vote is still in `playersStore.pendingVotes`, meaning it has not reached the DB) |
| `vote-card` | `app/components/CardsArea.vue` (each card, `data-value="<label>"`, `aria-pressed="true\|false"`) | voting cards |
| `reveal-button` | `app/components/CardsArea.vue` (Reveal button) | reveal trigger |
| `new-round-button` | `app/components/ResultsArea.vue` (Start New Round button) | reset trigger |
| `results-area` | `app/components/ResultsArea.vue` (root) | results container |
| `account-menu-button` | `app/components/AppHeader.vue:116` (avatar button) | opens dropdown |
| `auth-sign-in-menu-item` | `app/components/AppHeader.vue:174` (menu item) | Sign In in dropdown |
| `auth-sign-out-menu-item` | `app/components/AppHeader.vue:187` (menu item) | Sign Out in dropdown |
| `signup-email`, `signup-password`, `signup-confirm`, `signup-submit` | `app/pages/signup.vue` | fields + submit |
| `signup-success` | `app/pages/signup.vue:66` (success block) | success state |
| `login-email`, `login-password`, `login-submit` | `app/pages/login.vue` | fields + submit |

~16 attributes in existing components. No additional styles or logic.

### Principles

1. **Unit/e2e isolation:** Vitest works only with `app/**`; Playwright only with `tests/e2e/**`
2. **Page Object Model:** selectors in `tests/page-objects/*.ts`, tests as scenarios
3. **Service-role isolation:** `supabase-admin.ts` lives only in the Node process of Playwright fixtures and is never imported from `app/`
4. **Test data isolation:** each test uses its own unique room id; auth tests use a unique email `e2e-{uuid}@storypoker-test.dev`
5. **Cleanup-on-teardown:** Playwright fixtures guarantee cleanup even on a failed test, through service-role (`rooms` has no public DELETE policy)

## Test scope (3 flows)

### Flow 1 - `tests/e2e/smoke.spec.ts` / create room (Chromium + WebKit)

Source of truth: `app/pages/index.vue:65-78` (`createRoom()`).
Home immediately joins the player and redirects - JoinOverlay does not appear after Create Room.

1. Go to `/`
2. Fill `[data-testid=home-name-input]` with `E2E Tester`
3. Click `[data-testid=home-create-room]`
4. Wait for redirect to `/<roomId>`, where `roomId` matches `/^[A-Za-z0-9]{8}$/` (generator: `app/stores/room.ts:118-121`)
5. Check:
   1. `[data-testid=players-list] [data-testid=player-row][data-player-name="E2E Tester"]` is present
   2. `localStorage['storypoker_session_<roomId>']` has fields `playerId`, `playerName`, `lastVisitedAt`
   3. `[data-testid=reveal-button]` is present → the player is a moderator (`index.vue:75` `toggleModerator(player.id, true)`)
6. `page.reload()` → JoinOverlay is not shown (auto-rejoin via the session in localStorage); `player-row` is still present

Cleanup: the room fixture saves `roomId` by parsing the URL in `afterEach` and deletes the room through the service-role admin.

### Flow 2 - `tests/e2e/smoke.spec.ts` / solo vote reveal (Chromium + WebKit)

Dependency on Flow 1: the test uses the same home flow to create a room - this is the **only** path where the player becomes a moderator (`index.vue:75` calls `toggleModerator(true)`). `playersStore.join()` creates `is_moderator: false` (`app/stores/players.ts:94`), so directly joining an existing room would not provide moderator controls.

1. Perform Flow 1 steps 1-4 (through the `HomePage` Page Object) as `Moderator Solo` → in the room, moderator
2. Click `[data-testid=vote-card][data-value="5"]` → the card has `aria-pressed="true"` (DOM contract: `CardsArea.vue` sets `:aria-pressed="String(isSelected)"` on vote-card)
3. Wait until `[data-testid=player-row][data-player-name="Moderator Solo"]` has both `data-voted="true"` AND `data-vote-pending="false"` - otherwise it is optimistic state that has not reached the DB. This matters: `playersStore.voteOf()` (`app/stores/players.ts`) returns the pending value, so the UI shows `data-voted="true"` immediately after the click. But `voteCounts`/`ResultsArea` in `app/pages/[slug].vue:65-71` read `visiblePlayers` directly (without pending), so if the test clicks Reveal before the vote reaches the DB, `ResultsArea` will be empty. (`round_history` is never written in solo because of `votes.length >= 2` - a separate caveat below, not a consequence of the race.)
4. Click `[data-testid=reveal-button]` (in `CardsArea`) → `[data-testid=results-area]` is visible and contains text `5`
5. Click `[data-testid=new-round-button]` (in `ResultsArea`) → `[data-testid=results-area]` disappears, `[data-testid=vote-card]` is clickable again

**Caveat:** `round_history` is not written in solo (`reveal()` requires `votes.length >= 2`); this test does not check the history table.

### Flow 3 - `tests/e2e/critical-flows.spec.ts` / auth (Chromium only)

Project-level restriction via per-test `test.skip(({ browserName }, testInfo) => browserName !== 'chromium')` in `test.beforeEach` or per test. `test.describe.configure({ project })` is an invalid API. Alternative: `projects[].testIgnore` for webkit, excluding `critical-flows.spec.ts`. Choose `testIgnore` for fitness - less runtime overhead.

**3a - Signup (deterministic outcome, email-confirm ON):**

Source of truth: `app/pages/signup.vue`. After `authStore.signUp(email, password)`, the form sets `success.value = true` and shows the "confirm email" success screen (`signup.vue:40-41, 66-69`). The watch on `user` (`signup.vue:23-25`) redirects only if `!success.value` - success is set first, so no redirect occurs. The test asserts the success screen, not a redirect.

1. Generate a unique email `e2e-{crypto.randomUUID()}@storypoker-test.dev`, password from `E2E_TEST_USER_PASSWORD`
2. Go to `/signup`
3. Fill `[data-testid=signup-email]`, `[data-testid=signup-password]`, `[data-testid=signup-confirm]` (all three are required; `signup.vue:13` has a `confirm` field)
4. Click `[data-testid=signup-submit]`
5. Wait for `[data-testid=signup-success]` to be visible (success screen with a "check your email" message)
6. `afterEach` fixture teardown:
   1. `admin.auth.admin.listUsers({ page: N, perPage: 1000 })` - paginate from `page: 1` until finding a user with an exact email match (the SDK does not support a `filter` parameter in `PageParams`; verified in `@supabase/auth-js`)
   2. If found: `admin.auth.admin.deleteUser(userId)`
   3. Error handling - see [Cleanup errors policy](#cleanup-errors-policy)

**3b - Login:**

Source of truth: `app/pages/login.vue`.

1. Persistent test user (P3) with `E2E_TEST_USER_EMAIL` / `E2E_TEST_USER_PASSWORD`
2. Go to `/login`, fill `[data-testid=login-email]` + `[data-testid=login-password]`, click `[data-testid=login-submit]`
3. Wait for redirect to `/`
4. Check: click `[data-testid=account-menu-button]` → dropdown opens → `[data-testid=auth-sign-out-menu-item]` is present, `[data-testid=auth-sign-in-menu-item]` is absent
5. Click `[data-testid=auth-sign-out-menu-item]` → check signed-out state:
   1. Open `[data-testid=account-menu-button]` → `[data-testid=auth-sign-in-menu-item]` is present, `[data-testid=auth-sign-out-menu-item]` is absent
6. Persistent user is NOT deleted in teardown

## Infrastructure

### `playwright.config.ts`

Key fields:

1. `testDir: './tests/e2e'`
2. `outputDir: resolve(__cfgDir, 'test-results/playwright')` (where `__cfgDir = dirname(fileURLToPath(import.meta.url))`)
3. `fullyParallel: true`
4. `workers: process.env.CI ? 2 : 4`
5. `retries: process.env.CI ? 1 : 0`
6. `reporter: process.env.CI ? [['github'], ['html', { open: 'never', outputFolder: resolve(__cfgDir, 'playwright-report') }]] : 'list'`
7. `use.baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000'`
8. `use.trace: 'on-first-retry'`, `use.screenshot: 'only-on-failure'`
9. `projects:`
   1. `{ name: 'chromium', use: devices['Desktop Chrome'] }`
   2. `{ name: 'webkit',   use: devices['Desktop Safari'], testIgnore: ['**/critical-flows.spec.ts'] }`
10. `webServer`: only when `E2E_BASE_URL` is not set
    1. `command: 'npm run build && npm run preview'`
    2. `cwd: __cfgDir` - repo root containing `package.json`
    3. `url: 'http://localhost:3000'`
    4. `timeout: 180_000`
    5. `reuseExistingServer: !process.env.CI`
    6. `env`: Playwright already merges `process.env` (`packages/playwright/src/plugins/webServerPlugin.ts` uses `{...DEFAULT_ENVIRONMENT_VARIABLES, ...process.env, ...this._options.env}`), so a spread is unnecessary. Nuxt preview does NOT need test-only secrets (service role key, persistent user credentials), and they must not reach it. Explicitly blank them to limit the leak surface:
       ```ts
       env: {
         SUPABASE_URL: process.env.SUPABASE_URL!,
         SUPABASE_KEY: process.env.SUPABASE_KEY!,
         SUPABASE_TEST_SERVICE_ROLE_KEY: '',
         SUPABASE_SECRET_KEY: '',          // defensive - repo .env.example uses this name, local .env could pass it through
         E2E_SUPABASE_SERVICE_ROLE_KEY: '', // defensive - raw CI GitHub secret name; CI renames it to SUPABASE_TEST_SERVICE_ROLE_KEY, but protect against it
         E2E_TEST_USER_EMAIL: '',
         E2E_TEST_USER_PASSWORD: '',
       }
       ```

**ESM-compatible loading of `.env/.env.test`** (`package.json:3` has `"type": "module"`, `__dirname` is undefined):

```ts
import { config as loadDotenv } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __cfgDir = dirname(fileURLToPath(import.meta.url));

if (!process.env.CI) {
  loadDotenv({ path: resolve(__cfgDir, '.env/.env.test'), override: true });
}
```

**Canonical env model:**

1. **Local:** `npm run test:e2e` runs the root `playwright.config.ts`. The Playwright config calls `loadDotenv({ override: true })` for `.env/.env.test` BEFORE starting `webServer`, so test-project credentials override shell defaults. Through `webServer.env`, Playwright passes `SUPABASE_URL`/`SUPABASE_KEY` to `npm run preview` as child process env. Nuxt preview sees them through `process.env` (Nuxt runtime config map in `nuxt.config.ts`). No duplicates are needed in `.env/.env.local`.
2. **CI:** GitHub Actions passes all secrets through the step's `env:` block. The Playwright config sees `process.env.CI=true` and does not call `loadDotenv`. `webServer.env` likewise passes credentials to the child preview process.

### `tests/support/helpers/supabase-admin.ts`

```ts
import { createClient } from '@supabase/supabase-js';

export function getAdminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE_URL / SUPABASE_TEST_SERVICE_ROLE_KEY');
  return createClient(url, key, { auth: { persistSession: false } });
}
```

Imported only from `tests/fixtures/**`, never from `app/`. Code review check: grep for `supabase-admin` in `app/` must return an empty result.

### `tests/fixtures/room.ts`

Custom Playwright fixture:

1. `trackedRoomIds: string[]` - track created rooms; the `track(roomId)` helper adds them; alternatively auto-track by parsing the URL in `page.on('framenavigated')`.
2. `afterEach` for each `roomId`:
   1. `await admin.from('rooms').delete().eq('id', roomId)` - service-role JS call (not raw SQL). `rooms` has only public select/insert/update, so service-role is required (`supabase/migrations/001_initial_schema.sql:43-44`).
   2. `ON DELETE CASCADE` on `room_state.room_id`, `players.room_id`, `round_history.room_id` removes the rest.
   3. Error handling - see [Cleanup errors policy](#cleanup-errors-policy).

### `tests/fixtures/auth.ts`

Custom Playwright fixture:

1. `trackedEmails: string[]` - track created users by email (UI/store do not return `user.id`).
2. Helper `signupViaUI(page, email, password)` performs the signup flow and returns `Promise<void>`.
3. `afterEach` for each email:
   1. Paginate `admin.auth.admin.listUsers({ page, perPage: 1000 })` from `page=1` until a user with an exact `email` match is found (SDK does not support a filter parameter; checked the `@supabase/auth-js` `PageParams` type).
   2. `await admin.auth.admin.deleteUser(userId)`
   3. `user_profiles` is removed by cascade (`005_user_profiles.sql` `on delete cascade`).
   4. Error handling - see [Cleanup errors policy](#cleanup-errors-policy).

### Cleanup errors policy

**Important - Supabase JS SDK does not throw exceptions:** all calls (`admin.from(...).delete()`, `admin.auth.admin.deleteUser(...)`, `admin.auth.admin.listUsers(...)`) return `{ data, error }`. Cleanup code must explicitly check `error` after each call and apply the policy below:

1. **Test passed, cleanup failed:** throw the error; the rerun must see stale state and not mask the problem.
2. **Test failed, cleanup failed:** log via `testInfo.attach('cleanup-error', ...)` or `console.warn`; do not override the original test error, because it is more important.

Implementation: check `testInfo.status === 'passed'` in `afterEach`. If true, throw on `error`; otherwise log. This applies to ALL cleanup calls in `tests/fixtures/room.ts` and `tests/fixtures/auth.ts`.

## CI integration

### `.github/workflows/ci.yml`

Add a new `e2e` job in parallel with `test`. Fix the `deploy` job at the same time, because `secrets.*` are not expanded in job-level `if:` in either case.

**Pattern for both jobs:** a separate detect job with output:

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
        path: |
          playwright-report/
          test-results/playwright/
        retention-days: 7

deploy:
  needs: [test, e2e, detect-secrets]
  if: |
    always()
    && github.ref == 'refs/heads/main'
    && needs.test.result == 'success'
    && (needs.e2e.result == 'success' || needs.e2e.result == 'skipped')
    && needs.detect-secrets.outputs.has_netlify == 'true'
  # ... rest unchanged
```

**Prerequisite:** P1 (lockfile in git) is complete; otherwise `npm ci` fails.

### Required GitHub secrets

Set up once in repo Settings:

1. `E2E_SUPABASE_URL` - separate test Supabase project URL
2. `E2E_SUPABASE_ANON_KEY` - anon publishable key
3. `E2E_SUPABASE_SERVICE_ROLE_KEY` - service role key (Settings → API → service_role)
4. `E2E_TEST_USER_EMAIL` - persistent test user for login flow (P3)
5. `E2E_TEST_USER_PASSWORD` - password of the same user

## Local execution

1. Complete P1, P3 (P2 is unnecessary - the product works with email-confirm ON).
2. Create `.env/.env.test` from the `.env/.env.test.example` template.
3. `npx playwright install chromium webkit` (once).
4. `npm run test:e2e` - the Playwright config calls `loadDotenv({ override: true })` for `.env/.env.test`, then starts build + preview + smoke.
5. `npm run test:e2e:ui` - interactive debugging.

## Dependencies and risks

**New dependencies:**

1. `@playwright/test` (devDep, ~50 MB after `playwright install`)
2. `dotenv` (devDep, ~80 KB; Nuxt already depends on it transitively)

**Risks:**

1. **R1 - Lockfile gitignore regression:** document in `CLAUDE.md` that the lockfile is required.
2. **R2 - Email confirmation toggle:** if someone disables email-confirm in the test Supabase project or the UI changes (post-signup auto-login), the success-screen assertion will no longer match and the test must be rewritten.
3. **R3 - Realtime/WebSocket flakiness:** preview build with Supabase realtime may have timing issues. Mitigation: `retries: 1` in CI, `trace: 'on-first-retry'`, generous `webServer.timeout: 180s`.
4. **R4 - Service role leak:** the key grants full DB access. Mitigation: only in CI env + local `.env/.env.test` (gitignored); `supabase-admin.ts` is never imported from `app/`; grep code review check.
5. **R5 - CI build time:** `npm run build` adds ~1 min to the e2e job. Acceptable.
6. **R6 - Admin listUsers cost:** cleanup paginates users. This is OK for a small test project; if there are many (>1000), add a nightly cleanup job for residual `e2e-*` users.

## Test strategy for verifying the spec

1. Unit `npm test` does not touch `tests/e2e/`.
2. `npm run test:e2e` must pass locally before merge.
3. CI must pass on the feature branch before merge to main.
4. Verify deploy gate behavior:
   1. On a fork without secrets: `detect-secrets` gives `has_e2e=false` + `has_netlify=false`; `e2e` is skipped; `deploy` is skipped because of `has_netlify=false`; the workflow does not fail.
   2. On main with all secrets and e2e passed: `deploy` runs.
   3. On main with all secrets and e2e failed: `deploy` is skipped (smoke blocks production - this is intentional and aligned with the goal).
   4. On main, if E2E secrets are absent but Netlify secrets are present: `deploy` runs after the main checks; E2E blocks deploy only when the job runs and fails.

## References

1. Roadmap - [E2E coverage beyond smoke](../../initiatives/e2e-coverage.md)
2. Playwright best practices skill (for implementation): `.agents/skills/playwright-best-practices`
3. Source files referenced in the spec:
   1. `app/pages/index.vue:65-78` (home create flow)
   2. `app/pages/signup.vue:13,40-41,66-69` (success state, confirm field)
   3. `app/components/AppHeader.vue:116,174,187` (account menu)
   4. `app/components/CardsArea.vue` (vote cards + reveal button)
   5. `app/components/ResultsArea.vue` (new-round button)
   6. `app/stores/room.ts:118-121` (room id generator - source of truth for create flow)
   7. `app/stores/players.ts:94` (`is_moderator: false` on join)
   8. `supabase/migrations/001_initial_schema.sql:43-44` (RLS policies, FK cascade)
   9. `supabase/migrations/004_rooms_realtime.sql`, `005_user_profiles.sql` - current realtime publications and idempotent pattern on which P5 relies
   10. Future `supabase/migrations/007_players_room_state_realtime.sql` - P5 prerequisite
4. Existing CI workflow: `.github/workflows/ci.yml`
5. Existing Vitest tests: `app/stores/__tests__/`, `app/utils/__tests__/`, `tests/setup.ts`
6. GitHub Actions secrets restrictions: https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions
7. Playwright `test.describe.configure`: https://playwright.dev/docs/api/class-test
