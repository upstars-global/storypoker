# Story Poker — Roadmap

План робіт і відкритих питань. Iter-плани й специфікації окремих фіч — у [`docs/superpowers/plans/`](docs/superpowers/plans/) та [`docs/superpowers/specs/`](docs/superpowers/specs/). Аудит дизайн-системи — у [`DESIGN.md`](DESIGN.md) (розділ 10).

> Статус станом на 2026-05-16.

---

## Поточний стан

| Зріз | Стан |
|---|---|
| Iter 1 — Foundation + Realtime | ✅ DONE |
| Iter 2 — Auth & Account | ⚠️ IN PROGRESS |
| Iter 3 — Insights & History | ⏳ planned |
| Iter 4 — Estimation Scale | ⏳ planned (частина зроблена) |
| Design system — Tailwind tokens | ✅ `colors/bg/text/border/shadow`, `darkMode: ['selector', '[data-theme="dark"]']` |
| Design system — inline color `style=` → tokens | ✅ done (2026-05-16, 31 заміна по 9 файлах) |
| Design system — light card contrast, btn disabled, non-color inline `style=`, home button class soup, MUI px scale | ❌ open (G1, G2, G3-залишок, G6, G7, G8, G9) |
| Icons — local `assets/icons/*.svg` (25 шт.) | ✅ почищено `trending-up.svg` + dev cache; G10 опційний follow-up |

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
- **Файли:** `app/components/AppHeader.vue`, `app/pages/[slug].vue`
- **Симптом:** обходить Tailwind, ускладнює рефакторинг і темізацію. Утиліти (`text-muted`, `bg-paper`, `text-body`, `text-danger`, `text-primary` тощо) доступні через `tailwind.config.ts`.
- **Прогрес (2026-05-16):** ✅ кольорові inline-styles (`color: var(--danger|primary|text-muted)`) — 31 заміна по 9 файлах; додано `text-danger`/`text-success` у `textColor.extend`; `darkMode: ['selector', '[data-theme="dark"]']` сконфігуровано.
- **Залишилось:** non-color inline styles — `font-size` (×13), positioning (`top: 8px; right: 8px;` ×5; `min-width: 120px` ×5), `width: 24px/28px/36px` тощо. Замінити при touching компонента або в окремому проході.

### G4. Status icons без tooltip на player row
- **Файл:** `app/components/PlayerRow.vue` (потребує перевірки)
- **Симптом:** `aria-label="moderator|inactive|player deciding"` присутні, але hover-tooltip користувачу без screen-reader не показує сенс іконки.
- **Підхід:** додати `title` або `mui-tooltip` поверх icon-комірок.

### G5. Контраст vote card values у light
- **Симптом:** `rgb(97,97,97)` на `#f5f5f5` ≈ 5.7:1 — проходить WCAG AA, але не AAA. Не блокер, але варто врахувати при наступному redesign.

### G6. Home create-room button дублює `.mui-btn` як class soup
- **Файл:** `app/pages/index.vue:126`
- **Симптом:** єдина кнопка в проєкті, яка НЕ використовує `.mui-btn` — натомість ~19 утиліт + arbitrary `bg-[#607d8b]`/`shadow-[...]` inline (~600 байт). Інші 12 файлів через клас. Поведінка майже ідентична (різниця в `min-width`/`height`/`border-radius`).
- **Fix:** замінити на `<button v-wave class="mui-btn">`, доклеїти `mui-btn-lg` модифікатор якщо потрібен інший розмір.

### G7. Arbitrary px scale замість spacing/typography токенів
- **Файли:** `app/pages/index.vue`, інші pages (~34 випадків `text-[22px]`, `text-[15px]`, `text-[13px]`, `h-[46px]`, `h-[51px]`, `mt-[11px]`, `mt-[19px]`, `mt-[30px]`, `mt-[60px]`, `max-w-[280px]`/`[460px]`/`[920px]` тощо).
- **Симптом:** магічні MUI px-значення розкидані по коду; немає єдиного джерела розмірів кнопок/inputs.
- **Підхід:** винести найчастіші у `theme.extend.spacing`/`fontSize`/`maxWidth` як named tokens (`mui-btn-h`, `mui-input-h`, etc.) АБО прийняти як неминучу transcription MUI specs і додати ESLint-disable з коментарем. Поточний стан — magic numbers без виправдання.

### G8. `ConnectionBanner.vue` тримає єдиний `<style scoped>` блок
- **Файл:** `app/components/ConnectionBanner.vue:23-51`
- **Симптом:** ~30 рядків raw CSS включно зі `@keyframes spin`. Усе вкладається в утиліти: `fixed top-0 inset-x-0 h-8 flex items-center justify-center gap-2 bg-amber-500 text-black text-sm font-medium z-[9999]` + Tailwind built-in `animate-spin`.
- **Fix:** конвертувати у utility classes + Vue Transition class (`banner-fade-*` → конфігурувати через Tailwind transition utilities або лишити мінімальний scoped block для transition).

### G9. `* { font-family }` universal selector
- **Файл:** `assets/css/main.css:82-84`
- **Симптом:** universal-селектор для шрифту замість inheritance через `html`/`body`. Не критично, але anti-pattern.
- **Fix:** перенести на `html, body { font-family: ... }` — інші елементи отримають `inherit`.

### G10. Невикористаний icon-asset видалено + light-mode асет був un-staged
- **Файл:** `assets/icons/light-mode.svg` (тепер staged), `assets/icons/trending-up.svg` (видалено), `assets/icons/node_modules/` (видалено)
- **Симптом до фіксу:** `app:light-mode` referenced у `AppHeader.vue:168` — якби CI зробив deploy без commit, світла тема показала б порожню іконку.
- **Подальше (опційно):** додати pre-commit/CI check, який валідує що всі `app:<name>` посилання мають відповідний `assets/icons/<name>.svg`. Або: розглянути міграцію з local `assets/icons/*.svg` на Iconify `material-symbols` колекцію (потрібен per-icon visual diff — геометрія MUI ≠ material-symbols 1:1, `moderator`/`deciding`/`offline` можуть не мати точних відповідників).

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

## E2E Test Coverage — beyond smoke ⏳ planned

Smoke pack (планується, спека: `docs/superpowers/specs/2026-05-15-playwright-e2e-tests-design.md`) покриває 3 критичні flows: home→create room, solo vote→reveal→new round, signup/login. Все нижче — поза smoke і чекає на окремий iter:

- [ ] Multi-user vote (2 browser contexts: moderator + player → reveal → результати)
- [ ] Presence (online/offline, visibility-hidden → untrack, reconnect reconciliation)
- [ ] Kick player (authorized moderator)
- [ ] Rename player (self + by authorized moderator)
- [ ] Configure Card Deck (preset switch + custom active subset, голоси не губляться)
- [ ] Timer (start/pause/resume/reset/±30s, контроли тільки для authorized moderator)
- [ ] Round history (votes ≥ 2 → запис у `round_history`, перегляд історії в UI)
- [ ] Password reset flow (forgot → email link → reset)
- [ ] Room slug aliases (set slug, редирект з `/<roomId>` на `/<slug>`)
- [ ] RLS edge cases (anon access boundaries, soft-delete via `left_at`)

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
