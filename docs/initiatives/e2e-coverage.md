# E2E coverage поза smoke

- Status: Planned
- Priority: P2
- Ініційовано: 2026-05-15
- Last reviewed: 2026-07-17
- Related: [spec](../superpowers/specs/2026-05-15-playwright-e2e-tests-design.md)

## Навіщо

Smoke pack (home → create, solo vote → reveal → new round, signup / login)
працює, але основні багатокористувацькі сценарії не покриті.

## Очікуваний результат

E2E покриває сценарії, які неможливо перевірити unit-тестами: кілька браузерних
контекстів, presence, realtime.

## Обсяг

- Multi-user vote (2 contexts: moderator + player → reveal).
- Presence (offline, visibility-hidden untrack, reconnect reconciliation).
- Kick / rename player (self + authorized moderator).
- Configure Card Deck (preset switch + custom subset, голоси не губляться).
- Timer (start / pause / resume / reset / ±30s, moderator-gating).
- Round history (votes ≥ 2 → запис, перегляд у UI).
- Slot machine (3 спіни за раунд, джекпот-broadcast, `SlotWinBanner`).
- Alignment trends modal + Recent Rooms alignment column.
- Password reset flow, room slug aliases, RLS edge cases.

## Залежності

- [Виділений test-Supabase проєкт](e2e-test-supabase-project.md).

## Критерії завершення

- Перелічені сценарії мають стабільні специфікації у `tests/e2e/`.

## Наступний крок

Multi-user vote - найбільша цінність за найменшу ціну після test-проєкту.
