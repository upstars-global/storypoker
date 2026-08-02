# Виділений test-Supabase проєкт

- Status: Planned
- Priority: P2
- Ініційовано: 2026-05-15
- Last reviewed: 2026-07-17
- Related: [spec](../superpowers/specs/2026-05-15-playwright-e2e-tests-design.md)

## Навіщо

Окремого dev/test Supabase немає - єдина БД це прод. E2E потребує
`.env/.env.test` (URL + service-role) для cleanup у teardown, а тестувати проти
прода ризиковано: public RLS дає нульову ізоляцію. Це головний блокер локального
`npm run test:e2e` і e2e в CI.

## Очікуваний результат

Ізольований Supabase-проєкт із накоченими міграціями і кредами в CI-секретах.

## Обсяг

- Створити безкоштовний проєкт, накотити міграції `001`–`010`.
- Скласти креди в `.env/.env.test` і CI-секрети.

Точкові правки після появи test-проєкту:

- P1. `signupViaUI` фікстура vs `AuthPage` POM - винести `signup()` у POM.
- P2. Webkit `testIgnore: ['**/critical-flows.spec.ts']` без коментаря - додати пояснення.
- P3. Порожні `tests/fixtures/{data,factories,mocks,nuxt}/` - `.gitkeep` + README або видалити.
- P4. Зайвий `_consoleErrors` у підписах smoke-тестів.
- P6. `reuseExistingServer` бере dev-build замість preview - окремий порт або документація.
- P7. Console errors без allowlist - `expectedConsoleErrors` param до розширення coverage.
- P8. Roboto через Google Fonts CDN під час E2E - route-block у setup або self-host.
- P9. Shared `E2E_TEST_USER` - per-worker account factory до кількох login-тестів.

## Критерії завершення

- `npm run test:e2e` проходить локально проти test-проєкту.
- E2E-job у CI запускається зі своїми секретами.

## Наступний крок

Створити проєкт і накотити міграції.
