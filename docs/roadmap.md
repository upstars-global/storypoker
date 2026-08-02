# Story Poker Roadmap

- Last reviewed: 2026-07-17

Кожна активна або майбутня ініціатива має окремий файл у
[`initiatives/`](initiatives/). Цей індекс - єдина актуальна точка входу;
детальний дизайн і implementation steps лишаються у
[`superpowers/specs/`](superpowers/specs/) та
[`superpowers/plans/`](superpowers/plans/). Дизайн-специфікація й аудит -
[`DESIGN.md`](../DESIGN.md).

Статуси: `Planned` - є визначений результат або готові spec/plan; `Partial` -
частина результату вже в коді; `Idea` - потрібен окремий discovery/design;
`Implemented` - результат перевірено в коді; `Descoped` - передумова більше не
відповідає прийнятому рішенню.

Поле `Ініційовано` - дата, коли пункт уперше сформульовано (у кореневому
`ROADMAP.md` до міграції або в аудиті); `Last reviewed` - дата останньої
перевірки фактичного стану.

## P0

- [RLS та авторизація мутацій](initiatives/rls-security.md) - звузити write-політики, RPC для модераторських дій. `Planned`
- [Атомарність раунду](initiatives/round-atomicity.md) - транзакційні RPC для reveal / new round / create room. `Planned`

## P1

- [Обробка помилок](initiatives/error-handling.md) - typed Supabase-result, toast з retry, rollback. `Planned`
- [Декомпозиція `[slug].vue`](initiatives/room-page-decomposition.md) - винести realtime, session і actions у composables. `Planned`
- [Auth & Account](initiatives/auth-account.md) - зміна email / display name, серверний гейтинг критичних дій. `Partial`
- [Estimation Scale](initiatives/estimation-scale.md) - deck picker при створенні кімнати, збережені кастомні шкали. `Partial`

## P2

- [Realtime lifecycle](initiatives/realtime-lifecycle.md) - zombie channels і нефільтрований `user_profiles`-канал. `Planned`
- [`resolveRoom` filter injection](initiatives/resolve-room-filter.md) - валідація input перед `.or()`. `Planned`
- [Виділений test-Supabase проєкт](initiatives/e2e-test-supabase-project.md) - головний блокер E2E. `Planned`
- [E2E coverage поза smoke](initiatives/e2e-coverage.md) - multi-user, presence, deck, timer, history. `Planned`
- [Оптимізація бандла](initiatives/bundle-optimization.md) - lazy routes і DiceBear split. `Planned`
- [Production sourcemaps](initiatives/production-sourcemaps.md) - прибрати `.map` з прод-збірки. `Planned`
- [Lint strictness і Supabase types](initiatives/lint-and-supabase-types.md) - `--max-warnings 0`, generated types. `Planned`

## P3

- [vue-i18n precompile](initiatives/vue-i18n-precompile.md) - `@intlify/unplugin-vue-i18n`. `Planned`
- [Design system - токени, що лишились](initiatives/design-system-tokens.md) - accent-палітра, повторювані arbitrary values. `Partial`

## Future ideas

- [Mobile / tablet layout pass](initiatives/mobile-layout.md).
- [Візуальний напрям (MD2 → MD3 / shadcn)](initiatives/visual-direction.md).

## Completed

- [Завершені ініціативи](completed.md).
