# Story Poker — Roadmap

План робіт і відкритих питань. Iter-плани й специфікації окремих фіч — у [`docs/superpowers/plans/`](docs/superpowers/plans/) та [`docs/superpowers/specs/`](docs/superpowers/specs/). Аудит дизайн-системи — у [`DESIGN.md`](DESIGN.md) (розділ 10).

> Статус станом на 2026-05-14.

---

## Поточний стан

| Зріз | Стан |
|---|---|
| Iter 1 — Foundation + Realtime | ✅ DONE |
| Iter 2 — Auth & Account | ⚠️ IN PROGRESS |
| Iter 3 — Insights & History | ⏳ planned |
| Iter 4 — Estimation Scale | ⏳ planned (частина зроблена) |
| Design system — Tailwind tokens | ✅ зареєстровані в `tailwind.config.ts` |
| Design system — light card contrast, btn disabled, inline `style=` | ❌ open (див. нижче) |

---

## Design Gaps / Open Items

Технічний борг по UI-шару — звіреано проти `assets/css/main.css`, `tailwind.config.ts` і компонентів.

### G1. `--card-bg-color` у light зливається з `--bg-paper`
- **Файл:** `assets/css/main.css:78-79`
- **Симптом:** `--card-bg-color: rgb(240,240,240)` = `--bg-paper`; `--card-bg-hover` теж `rgb(240,240,240)` — карти не відокремлені від фону і hover не зчитується в light темі.
- **Fix:**
  ```css
  html[data-theme='light'] {
    --card-bg-color: rgb(255, 255, 255);
    --card-bg-hover: rgb(248, 248, 248);
  }
  ```

### G2. `mui-btn-text:disabled` не визначено
- **Файл:** `assets/css/main.css` (правило відсутнє)
- **Симптом:** disabled-стан text-кнопки виглядає як активний.
- **Fix:**
  ```css
  .mui-btn-text:disabled {
    color: var(--text-disabled);
    pointer-events: none;
  }
  ```

### G3. Inline `style="color: var(--text-*)"` поверх Tailwind
- **Файли:** `app/components/AppHeader.vue`, `app/pages/[slug].vue` — ~30+ використань
- **Симптом:** обходить Tailwind, ускладнює рефакторинг і темізацію. Утиліти (`text-muted`, `bg-paper`, `text-body` тощо) уже доступні через `tailwind.config.ts`.
- **Підхід:** поступова заміна під час touching компонента.

### G4. Status icons без tooltip на player row
- **Файл:** `app/components/PlayerRow.vue` (потребує перевірки)
- **Симптом:** `aria-label="moderator|inactive|player deciding"` присутні, але hover-tooltip користувачу без screen-reader не показує сенс іконки.
- **Підхід:** додати `title` або `mui-tooltip` поверх icon-комірок.

### G5. Контраст vote card values у light
- **Симптом:** `rgb(97,97,97)` на `#f5f5f5` ≈ 5.7:1 — проходить WCAG AA, але не AAA. Не блокер, але варто врахувати при наступному redesign.

---

## Iter 1 — Foundation + Realtime ✅ DONE

**Spec:** [`docs/superpowers/specs/2026-05-04-pinia-presence-design.md`](docs/superpowers/specs/2026-05-04-pinia-presence-design.md)
**Plan:** [`docs/superpowers/plans/2026-05-04-pinia-presence.md`](docs/superpowers/plans/2026-05-04-pinia-presence.md)

- Pinia stores: `auth`, `room`, `players`, `presence`; видалено старі composables
- Supabase Presence для online-статусу (замість колонки `is_online`)
- Optimistic `castVote` з rollback і реконсиляцією через realtime
- Differential realtime updates (`applyChange(payload)` замість full refetch)
- Reconciliation refetch після `reconnecting → online`
- `ConnectionBanner` (mobile-friendly: visibility=hidden → untrack/unsubscribe)
- Постійна схема `round_history` у БД (`001_initial_schema.sql`): `reveal()` пише snapshot `{player_id, name, vote}[]` тільки якщо `votes.length >= 2`
- UI: redesign модалки Configure Card Deck (3-кол + preset dropdown), збільшені карти 180×270, restructured header menu, Recent Rooms таблиця на головній, light/dark toggle, перейменовано `Story Point Poker → Story Poker`
- Vitest suite для усіх stores
- Дрібні: завантаження env з `/.env/.env` + `/.env/.env.local` через `dotenv.config()` у `nuxt.config.ts`, `lastVisitedAt` у session, центровані pie chart і карти

---

## Iter 2 — Auth & Account ⚠️ IN PROGRESS

Зроблено:
- ✅ Sign Up з підтвердженням email (`app/pages/signup.vue`)
- ✅ Sign In + persistent session (`app/pages/login.vue`)
- ✅ Скидання пароля (`forgot-password.vue` + `reset-password.vue`)
- ✅ Прив'язка гри до акаунту (`playersStore.linkUser` → `players.user_id`)
- ✅ Часткові профілі: `user_profiles` (`avatar_style/avatar_seed`) + `UserSettingsModal`

Залишилось:
- [ ] OAuth provider (Google / GitHub) — опціонально
- [ ] Зміна email і display name на акаунті (зараз — лише пароль)
- [ ] Захист критичних дій (Reveal / Configure Card Deck) тільки для авторизованих модераторів
  - Зараз `Authorized moderator` обмежує лише `rename room / rename / kick / slug` (`CLAUDE.md`, секція Roles)

---

## Iter 3 — Insights & History ⏳ planned

DB-схема `round_history` уже існує (`001_initial_schema.sql`, `reveal()` пише snapshot тільки якщо `votes.length >= 2`). Залишається UI-агрегація поверх неї.

- [ ] **Alignment Trends** — стат-сторінка/модалка з історією раундів кімнати (alignment score, average points, найчастіша карта)
- [ ] **Alignment Trend** колонка у Recent Rooms на головній (зараз без колонки)
- [ ] Експорт результатів раунду (CSV / clipboard)

---

## Iter 4 — Estimation Scale ⏳ planned

- [x] Зміна scale у активній кімнаті без втрати голосів — `roomStore.setDeckPreset()` + `ConfigureCardDeckModal`
- [ ] Picker при створенні кімнати (Scrum / Fibonacci / T-shirt / Hours / Boolean / Custom)
- [ ] Збереження кастомних scales на акаунт користувача (для повторного використання)
- [ ] Винести Configure Card Deck з модалки в окрему вкладку/розділ кімнати

---

## Cross-iter Open Questions

- Mobile layout верифіковано лише empirically; референс із `examples/room.html` — desktop-only (1440 × 900). Окремий design pass для mobile/tablet?
- Tooltip-стратегія: створити переоднаковлений `mui-tooltip` чи покладатися на native `title`? Впливає на G4 і будь-які майбутні status-icons.
- Чи мігрувати на MD3 / shadcn-стиль (ширші радіуси, surface tint), як пропонує DESIGN.md розд. 8? Зараз — Material Design 2.

---

## Посилання

- [`DESIGN.md`](DESIGN.md) — повна дизайн-специфікація + audit
- [`docs/superpowers/plans/`](docs/superpowers/plans/) — iter-плани окремих фіч
- [`docs/superpowers/specs/`](docs/superpowers/specs/) — специфікації фіч
