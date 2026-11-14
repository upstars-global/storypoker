# Dedicated test Supabase project

1. Status: Planned
2. Priority: P2
3. Initiated: 2026-05-15
4. Last reviewed: 2026-07-17
5. Related: [spec](../superpowers/specs/2026-05-15-playwright-e2e-tests-design.md)

## Why

There is no separate dev/test Supabase project; the only database is production.
E2E needs `.env/.env.test` (URL + service-role) for cleanup in teardown, and
running tests against production is risky: public RLS provides zero isolation.
This is the main blocker for local `npm run test:e2e` and E2E in CI.

## Expected outcome

An isolated Supabase project with migrations applied and credentials in CI secrets.

## Scope

1. Create a free project and apply migrations `001`-`010`.
2. Put credentials in `.env/.env.test` and CI secrets.

Targeted changes after the test project is available:

1. P1. `signupViaUI` fixture vs `AuthPage` POM: move `signup()` into the POM.
2. P2. Webkit `testIgnore: ['**/critical-flows.spec.ts']` has no comment: add an explanation.
3. P3. Empty `tests/fixtures/{data,factories,mocks,nuxt}/`: add `.gitkeep` + README or delete them.
4. P4. Remove the redundant `_consoleErrors` in smoke test signatures.
5. P6. `reuseExistingServer` uses the dev build instead of preview: use a separate port or document it.
6. P7. Console errors have no allowlist: add an `expectedConsoleErrors` param before expanding coverage.
7. P8. Roboto uses the Google Fonts CDN during E2E: block the route in setup or self-host.
8. P9. Shared `E2E_TEST_USER`: create a per-worker account factory before adding multiple login tests.

## Completion criteria

1. `npm run test:e2e` passes locally against the test project.
2. The E2E job in CI runs with its own secrets.

## Next step

Create the project and apply the migrations.
