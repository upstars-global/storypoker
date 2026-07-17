# Story Poker - Roadmap

План робіт і відкритих питань. Iter-плани й специфікації окремих фіч - у [`docs/superpowers/plans/`](docs/superpowers/plans/) та [`docs/superpowers/specs/`](docs/superpowers/specs/). Аудит дизайн-системи - у [`DESIGN.md`](DESIGN.md).

> Статус станом на 2026-07-17.

---

## Поточний стан

| Зріз | Стан |
|---|---|
| Iter 1 - Foundation + Realtime | ✅ DONE |
| Iter 2 - Auth & Account | ⚠️ IN PROGRESS |
| Iter 3 - Insights & History | ✅ DONE (Alignment Trends + column + CSV) |
| Iter 4 - Estimation Scale | ⚠️ IN PROGRESS (deck-switch у кімнаті є, create-picker немає) |
| Vue + Vite migration | ✅ DONE (Vue 3.5 + Vite 8/Rolldown SPA) |
| Tailwind v4 migration | ✅ DONE (native `@tailwindcss/vite`, CSS-first `@theme` у `main.css`, `tailwind.config.ts` прибрано) |
| Reka UI | ↩️ REVERTED - замінено власними `AppModal`/`AppTooltip` + `useClickOutside` (менший dep-surface) |
| Icons - Iconify | ✅ `@iconify-json/ic` offline + `app:` custom collection; `<AppIcon>` + `mapIconName()` (feature-flag ремап на lucide/rounded) |
| Themes / palettes | ✅ classic / cyberdeck / matcha (light+dark), `data-palette`+`data-theme`, inline pre-JS у `index.html` |
| Side widget | ✅ Timer ↔ SlotMachine перемикач (`sp-side-widget`), джекпот-broadcast + `SlotWinBanner` |

---

## Post-migration tech debt

### vue-i18n precompile ⏳
Перейти з runtime compilation на `@intlify/unplugin-vue-i18n` (precompile messages у build). Швидший runtime, менший bundle, прибере dev warning `[intlify] Runtime compilation is being used`.

### Lazy routes + DiceBear split ⏳
`app/router.ts` статично імпортує всі 7 сторінок; DiceBear-колекції входять в initial bundle, хоч потрібні лише в кімнаті/налаштуваннях. Перевести auth-сторінки і `/ffc` на `() => import(...)`, DiceBear - у динамічний import.

### Production sourcemaps ⏳
`vite.config.ts` тримає `build: { sourcemap: true }` для прода (розкриває код, +3.6 MB у `dist/`). Лишити тільки для stage або вантажити в error-tracker.

---

## Iter 2 - Auth & Account ⚠️ IN PROGRESS

Зроблено:
- ✅ Sign Up з підтвердженням email, Sign In + persistent session, скидання пароля
- ✅ Прив'язка гри до акаунту (`playersStore.linkUser` → `players.user_id`)
- ✅ Профілі: `user_profiles` (`avatar_style/avatar_seed`) + `UserSettingsModal`

Залишилось:
- [ ] OAuth provider (Google / GitHub) - опціонально
- [ ] Зміна email і display name на акаунті (зараз - лише пароль)
- [ ] Захист критичних дій (Reveal / Configure Card Deck) тільки для авторизованих модераторів (зараз gating client-side, RLS `using (true)`)

---

## Iter 3 - Insights & History ✅ DONE

- ✅ **Alignment Trends** - `AlignmentTrendsModal` з історією раундів (alignment score, average, series toggle, tooltips, axis titles)
- ✅ **Alignment** колонка у Recent Rooms на головній (`roundAlignment` + `avgAlignment`)
- ✅ Експорт результатів раунду (CSV у `HistoryModal.vue`)
- ✅ `round_history` зберігає `active_cards`/`deck_preset` знятого раунду (міграція `010`)

---

## Iter 4 - Estimation Scale ⚠️ IN PROGRESS

- [x] Зміна scale у активній кімнаті без втрати голосів - `roomStore.setDeckPreset()` + `ConfigureCardDeckModal`
- [x] Poll-question пресет (`vote_question`, кастомні опції; міграція `009`)
- [ ] Picker при створенні кімнати (Scrum / Fibonacci / T-shirt / Hours / Boolean / Custom)
- [ ] Збереження кастомних scales на акаунт користувача (повторне використання)
- [ ] Винести Configure Card Deck з модалки в окрему вкладку/розділ кімнати

---

## Design system - open items

Tailwind v4 CSS-first (`app/assets/css/main.css`) з `@theme`/`@utility`/`@custom-variant`. Токени color/bg/text/border/shadow/typography зведені; більшість inline `style=` мігровано на utilities. Лишилось:

- ⏳ **Accent-палітра гравців** - `#00796b #0288d1 …` (~8 hex у PlayerRow) без токенів; ввести `--accent-*` групу. `--btn-md-bg: #607d8b` уже токенізовано.
- ⏳ **Контекстні CSS vars** без utility-мапінгу (`--icon-player-color`, `--hover-bg`) - свідомо inline як контекстні override.
- ⏳ **Повторювані arbitrary values** (`max-w-[1400px]`, `z-[9999]`, `h-[51px]`) - винести 3 повторювані у `@theme`; one-off layout лишити.

---

## Architecture / hardening (з аудиту 2026-06-24, актуальне)

Два незалежні аудити (Claude + Codex) зійшлися на пріоритетах. Найважливіше досі не зроблено:

### P0 - Security / RLS ⏳
Усі політики - `using (true)` / `with check (true)` (`001`, `002`, `005`). З anon-ключем у бандлі будь-хто може змінити чужий голос/профіль, self-promote в модератори, захопити slug, переписати `room_state`, читати всі `round_history`/`user_profiles` глобально. Дія: звузити write-політики по `room_id`, `user_profiles` тільки при `auth.uid() = user_id`, модераторські мутації - у security-definer RPC.

### P0 - Атомарність раунду ⏳
`reveal()`/`startNewRound()`/create-room - окремі не-транзакційні запити (`app/stores/room.ts`). Два модератори можуть записати два snapshots; create може лишити `rooms` без `room_state`. Дія: Postgres RPC `create_room()`/`reveal_round(expected_started_at)`/`start_new_round()` з транзакціями + optimistic concurrency; DB-constraints на `phase`/`deck_preset`/довжини/`room_id NOT NULL`.

### P1 - Обробка помилок ⏳
Порожні `catch {}` у `[slug].vue` (×3) і store-методи без перевірки `{ error }` тихо ковтають фейли rename/shields/vote. Дія: typed helper для Supabase-result, loading/error state, localized toast з retry, rollback для всіх optimistic updates.

### P1 - `[slug].vue` god-component ⏳
~600 рядків: route resolution, session restore, 5 realtime-каналів, presence, snapshots, countdown, профілі, всі UI-actions. Виділити `useRoomSession`/`useRoomRealtime`/`useRoundSnapshot`/`useRoomActions`/`useCountdownBroadcast`; реагувати на зміну `route.params.slug`.

### P2 - Realtime lifecycle ⏳
`openChannel()` (presence) може викликатись повторно без закриття попереднього → zombie channels. `user_profiles` канал підписаний **без фільтра** - апдейт будь-якого профілю в БД летить усім клієнтам. Дія: single-flight reconnect + generation guard + `removeChannel()` на cleanup; фільтр/видалення `user_profiles`-каналу.

### P2 - `resolveRoom` filter injection ⏳
`room.ts:179` - `.or(`id.eq.${input},slug.eq.${input}`)` з сирим `input`. Спецсимволи (`,` `.` `)`) ламають фільтр. Дія: валідувати через `isValidRoomSlug`/8-символьний id, або два окремі `.eq()`.

### P2 - Bundle / lint ⏳
Монолітний chunk (~757 KB / 233 KB gzip), eager routes, DiceBear у initial, prod sourcemaps, невикористані deps. Lint проходить із ~461 warning - ввести `--max-warnings 0` поступово; підключити generated Supabase types замість `any`.

---

## E2E Tech Debt ⏳

### P10. Виділений test-Supabase проєкт - головний блокер ⏳
Окремого dev/test Supabase немає - єдина БД це прод. E2E потребує `.env/.env.test` (URL + service-role) для cleanup у teardown. Тестувати проти прода ризиковано (public RLS = нульова ізоляція). Дія: створити безкоштовний проєкт, накотити `001`–`010`, скласти креди в CI-секрети. **Розблоковує локальний `npm run test:e2e` і e2e в CI.**

Точкові правки (після test-проєкту):
- P1. `signupViaUI` фікстура vs `AuthPage` POM - винести `signup()` у POM
- P2. Webkit `testIgnore: ['**/critical-flows.spec.ts']` без коментаря - додати пояснення
- P3. Порожні `tests/fixtures/{data,factories,mocks,nuxt}/` - `.gitkeep`+README або видалити
- P4. Зайвий `_consoleErrors` у підписах smoke-тестів
- P6. `reuseExistingServer` reuse-не dev-build замість preview - окремий порт або документація
- P7. Console errors без allowlist - `expectedConsoleErrors` param до розширення coverage
- P8. Roboto через Google Fonts CDN під час E2E - route-block у setup або self-host
- P9. Shared `E2E_TEST_USER` - per-worker account factory до кількох login-тестів

---

## E2E Test Coverage - beyond smoke ⏳

Smoke pack (home→create, solo vote→reveal→new round, signup/login) працює. Поза smoke, чекає на test-Supabase:

- [ ] Multi-user vote (2 contexts: moderator + player → reveal)
- [ ] Presence (offline, visibility-hidden untrack, reconnect reconciliation)
- [ ] Kick / rename player (self + authorized moderator)
- [ ] Configure Card Deck (preset switch + custom subset, голоси не губляться)
- [ ] Timer (start/pause/resume/reset/±30s, moderator-gating)
- [ ] Round history (votes ≥ 2 → запис, перегляд у UI)
- [ ] Slot machine (3 спіни/раунд, джекпот-broadcast, `SlotWinBanner`)
- [ ] Alignment trends modal + Recent Rooms alignment column
- [ ] Password reset flow, room slug aliases, RLS edge cases

---

## Cross-iter Open Questions

- Mobile layout верифіковано лише empirically (референс desktop-only 1440×900) - окремий design pass для mobile/tablet?
- ~~Tooltip-стратегія~~ ✅ interactive контроли → `AppTooltip`; декоративні status-іконки → native `title`.
- ~~Reka UI~~ ↩️ прибрано; власні `AppModal` (native `<dialog>`) + `AppTooltip` + `useClickOutside`.
- Чи мігрувати на MD3 / shadcn-стиль (ширші радіуси, surface tint), як пропонує `DESIGN.md`? Зараз - Material Design 2 з трьома palette-темами.

---

## Посилання

- [`DESIGN.md`](DESIGN.md) - повна дизайн-специфікація + audit
- [`docs/superpowers/plans/`](docs/superpowers/plans/) - iter-плани окремих фіч
- [`docs/superpowers/specs/`](docs/superpowers/specs/) - специфікації фіч
