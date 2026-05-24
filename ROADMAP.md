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
| Design system — light card contrast, btn disabled, ConnectionBanner scoped CSS, home button class soup, universal font selector, on-appbar text tokens, status icon tooltip, MUI typography tokens | ✅ done (2026-05-16, G1/G2/G4/G6/G7/G8/G9/G11) |
| Design system — inline color `style=` → Tailwind utilities | ✅ done (31 заміна у першій хвилі + друга хвиля 2026-05-16 + G11 on-appbar tokens); контекстні CSS vars (`--icon-player-color`, dynamic `:style`, `accent-color`) лишаються свідомо |
| Icons — Iconify `ic` (baseline) міграція | ✅ мігровано 21/25 на `ic:baseline-*` (`@iconify-json/ic`); 4 кастомні (`moderator`/`deciding`/`offline`/`leave-room`) лишаються в локальній `app:` колекції |

---

## Vue + Vite migration ✅ DONE

**Spec:** [`docs/superpowers/specs/2026-05-16-vue-vite-migration-design.md`](docs/superpowers/specs/2026-05-16-vue-vite-migration-design.md)
**Plan:** [`docs/superpowers/plans/2026-05-16-vue-vite-migration.md`](docs/superpowers/plans/2026-05-16-vue-vite-migration.md)

Pure Vue 3 + Vite 6 SPA замість Nuxt 4 SSG. Менший dep-surface, явні imports і router, vue-i18n runtime, @iconify/vue.

---

## Post-migration tech debt ⏳ planned

### Tailwind v4
Перенести з v3 (`@nuxtjs/tailwindcss` спадщина — вже зрізана) на native `@tailwindcss/vite` plugin з CSS-first `@theme` config. Перенести `tailwind.config.ts` у `app/assets/css/main.css`. Візуальна регресійна перевірка через Playwright screenshots (новий iter).

### vue-i18n precompile
Перейти з runtime compilation на `@intlify/unplugin-vue-i18n` (precompile messages у render-функції під час build). Швидший runtime + менший bundle + прибере dev warning `[intlify] Runtime compilation is being used`.

### Bundle metrics
Зафіксувати в репозиторії before/after сумарного розміру `dist/assets/*.js` після завершення міграції (PR-комент). Якщо bundle gorsche — діагностика через `rollup-plugin-visualizer`.

---

## Design Gaps / Open Items

Технічний борг по UI-шару — звіреано проти `assets/css/main.css`, `tailwind.config.ts` і компонентів.

### G1. `--card-bg-color` у light зливається з `--bg-paper` ✅
- **Файл:** `assets/css/main.css:78-79`
- **Fix (2026-05-16):** `--card-bg-color: rgb(255, 255, 255)`, `--card-bg-hover: rgb(248, 248, 248)` — карти відокремлені від `--bg-paper`, hover читається.

### G2. `mui-btn-text:disabled` не визначено ✅
- **Файл:** `assets/css/main.css`
- **Fix (2026-05-16):** додано правило з `color: var(--text-disabled); background: transparent; pointer-events: none;`.

### G3. Inline `style="color: var(--text-*)"` поверх Tailwind ✅ (Tailwind-замапнені токени)
- **Файли:** усі компоненти, де токени вже існують у `tailwind.config.ts`.
- **Прогрес (2026-05-16, друга хвиля):** замінено `style="color: var(--text-primary|body)"` → `text-primary` / `text-body`; `style="border-color: var(--border)"` → клас `border-*` (default token); `box-shadow: var(--shadow-4)` → `shadow-4`; `background-color: var(--bg-appbar)` → `bg-appbar`; `color: #d32f2f` → `text-danger`; `color: #ffffff` → видалено там, де успадковується. Файли: `app.vue`, `index.vue`, `ConfigureCardDeckModal.vue`, `ResultsArea.vue`, `Timer.vue`, `UserSettingsModal.vue`, `PlayersList.vue`, `AppHeader.vue`, `[slug].vue`.
- **Залишилось:** (a) `--icon-player-color` у PlayerRow — контекстний CSS var, не utility-кандидат; (b) `accent-color` у ConfigureCardDeckModal — немає Tailwind v3 утиліти; (c) non-color positioning/sizing (`top: 8px; right: 8px;`, `min-width: 120px`, `font-size: 1.5rem`) — перетинається з G7. AppHeader on-appbar кольори закрито в G11 через `text-appbar-*`.

### G4. Status icons без tooltip на player row ✅
- **Файл:** `app/components/PlayerRow.vue`
- **Fix (2026-05-16):** додано native `:title="$t('players.*')"` на 6 status-іконок (`moderator`, `check-circle` ×2 (online/offline), `deciding`, `cancel`, `offline`). Доданий i18n-ключ `players.noVote` (uk: "не голосував", en: "no vote") і `aria-label` на `ic:baseline-cancel` (раніше був без labelled-state). Обрано native `title` замість окремого `mui-tooltip` (відкрите крос-iter питання) — нульова complexity, працює без JS.

### G5. Контраст vote card values у light ✅
- **Файл:** `assets/css/main.css`
- **Fix (2026-05-16):** `--card-value-color` light з `#6e6e6e` (≈5.05:1 на `#fff` після G1; AA, AAA лише для large text) → `#525252` (~7.81:1 — AAA для normal text у всіх responsive розмірах). Тепер light і dark теми мають близький контраст (dark `#e0e0e0` на `#424242` ≈ 7.61:1).

### G6. Home create-room button дублює `.mui-btn` як class soup ✅
- **Файл:** `app/pages/index.vue:124-128`
- **Fix (2026-05-16):** додано `.mui-btn-md` модифікатор у `main.css` (min-w 180 / h 46 / radius 23 / 13px) — зберіг рівно поточну візуальну специфікацію кнопки. Замінив class soup на `class="mui-btn mui-btn-md mt-[30px]"`.

### G7. Arbitrary px scale замість spacing/typography токенів ✅ (typography частина)
- **Файли:** `tailwind.config.ts`, `app/pages/index.vue`, `app/pages/[slug].vue`, `app/components/ConfigureCardDeckModal.vue`, `app/components/UserSettingsModal.vue`
- **Fix (2026-05-16):** додано `fontSize.mui-h2 / mui-body / mui-table / mui-caption` у `theme.extend` (з MUI lineHeight + letterSpacing, де є). Замінено 10 використань: `text-[22px] font-bold leading-[1.235] tracking-[0.00735em]` → `text-mui-h2 font-bold` (×3); `text-[15px] ... leading-[1.5] tracking-[0.00938em]` → `text-mui-body` (×3); `text-[14px]` → `text-mui-table` (×1); `text-[13px]` → `text-mui-caption` (×3).
- **Свідомо лишено:** layout/sizing one-offs (`pt-[26px]`, `pb-[40px]`, `mt-[11px]`, `mt-[19px]`, `mt-[30px]`, `mt-[60px]`, `h-[51px]`, `max-w-[280px]/[460px]/[920px]/[1240px]/[1400px]`, `w-[151.66px]`, `gap-[2px]`) — кожне унікальне per-page, токенізація без вигоди, лише overhead. `mui-btn-md` уже інкапсулює button height.

### G8. `ConnectionBanner.vue` тримає єдиний `<style scoped>` блок ✅
- **Файл:** `app/components/ConnectionBanner.vue`
- **Fix (2026-05-16):** контейнер і spinner — на Tailwind utilities (`fixed inset-x-0 top-0 z-[9999] h-8 ... bg-amber-500 text-black` + `animate-spin border-2 border-current border-r-transparent rounded-full`). `@keyframes spin` видалено. Залишився мінімальний scoped-блок лише для `banner-fade-*` Transition (~6 рядків).

### G9. `* { font-family }` universal selector ✅
- **Файл:** `assets/css/main.css:82-87`
- **Fix (2026-05-16):** замінено на `html, body, input, button, textarea, select { font-family: ... }`. Form controls не успадковують `font-family` через UA-стилі, тому простий `html, body` не вистачає — селектор перерахований явно.

### G11. AppHeader on-appbar text tokens ✅
- **Файл:** `app/components/AppHeader.vue`
- **Fix (2026-05-16):** додано `textColor.extend.appbar.{subtle: 'rgba(255,255,255,0.4)', muted: 'rgba(255,255,255,0.7)', emphasis: 'rgba(255,255,255,0.85)'}` у `tailwind.config.ts`. Замінено 6 foreground `style="color: rgba(255,255,255,*)"` → `text-appbar-{subtle,muted,emphasis}` / `text-white`. `--hover-bg` CSS var overrides залишено inline (це не utility-кандидат, а локальний override `.mui-icon-btn:hover { background-color: var(--hover-bg) }` для on-appbar контексту).

### G12. Hex hardcodes в SFC і CSS обходять токени ⏳
- **Файли:** `assets/css/main.css:232-235` (`mui-btn-md` зашиває `#607d8b` / hover `#1c313a` замість `var(--primary)`), `app/components/PlayerRow.vue` (focus ring `#546e7a`), player accent palette `#00796b #0288d1 #388e3c #7b1fa2 #e64a19 #f57c00 #fbc02d` (~8 окремих hex без жодного токена).
- **Action:** ввести `--accent-*` групу токенів (per-theme) у `main.css` і `extend.colors.accent.{teal,blue,green,purple,orange,amber,yellow}` у `tailwind.config.ts`; замінити inline hex на utilities. Окремо — або привести `mui-btn-md` до `var(--primary)`, або ввести `--btn-accent` semantic role, якщо `#607d8b` навмисний.

### G13. Inline `style=` для повторюваних non-color значень ⏳
- **Файли:** `app/components/Timer.vue` (5× `style="font-size: 1.125rem;"` на іконках), `app/components/AppHeader.vue` (`style="width: 28px; height: 28px;"`, `style="font-size: 1.5rem;"`), `app/components/PlayerRow.vue` (`style="grid-template-columns: 32px 1fr auto 36px;"`), ~12 випадків загалом.
- **Action:** для іконок ввести utility-розмір (`extend.fontSize.icon-sm: '1.125rem'` або token у `mui-svg-icon` варіантах); для повторюваних layout — utility або компонентна обгортка. `accent-color: var(--primary)` на checkbox — лишити, нема Tailwind v3 утиліти.

### G14. CSS variables без Tailwind-мапінгу ⏳
- **Файли:** `assets/css/main.css` — `--bg-paper-header`, `--card-bg-color`, `--card-bg-hover`, `--hover-bg`, `--icon-player-color` визначені, але не доступні як utility у `tailwind.config.ts`.
- **Action:** додати у `backgroundColor.extend`: `'paper-header': 'var(--bg-paper-header)'`, `card: 'var(--card-bg-color)'`, `'card-hover': 'var(--card-bg-hover)'`, `hover: 'var(--hover-bg)'`. `--icon-player-color` лишити inline як контекстний (G3 уже зафіксував причину).

### G15. Повторювані arbitrary values без extend-токенів ⏳
- **Файли:** `app/pages/[slug].vue` (`max-w-[1400px]`, `z-[9999]`, `h-[51px]`), кілька компонентів.
- **Action:** винести в `extend.maxWidth.content: '1400px'`, `extend.zIndex.banner: '9999'`, `extend.height.input: '51px'`. G7 вже задокументував свідому відмову від токенізації одноразових layout-значень — лишити в силі, тільки 3 повторювані випадки оформити.

### G16. `mui-btn-text` має дивний `min-width` override (nitpick) ⏳
- **Файл:** `assets/css/main.css:128, :177`
- **Action:** `.mui-btn` ставить `min-width: 220px`, `.mui-btn-text` зразу override на 64px. Винести `min-width` тільки у `mui-btn-md/-sm`, у базовому `.mui-btn` прибрати — буде менше cascade-noise.

### G10. Iconify migration ✅
- **Файли:** `package.json` (+`@iconify-json/ic` devDep), `nuxt.config.ts` (collection `app` лишилася для 4 кастомних), `assets/icons/` (21 SVG видалено, 4 залишилися), 8 .vue компонентів.
- **Fix (2026-05-16):** обрано `ic:baseline-*` як 1:1 візуальний відповідник класичним MUI v2 filled-іконкам (замість `material-symbols`, де outlined-default geometry відрізняється). Мігровано 21 ref: `account` → `ic:baseline-account-circle`; `cancel`, `check-circle`, `close`, `dark-mode`, `edit`, `forward-30`, `history`, `light-mode`, `login`, `logout`, `more-vert`, `navigate-before`, `navigate-next`, `pause`, `person-add`, `person-remove`, `replay-30`, `replay`, `settings` → `ic:baseline-<name>`; `play` → `ic:baseline-play-arrow` (rename до MUI-канону).
- **Свідомо в локальній `app:`:** `moderator` (gamepad-style SVG з власною семантичною назвою), `deciding` (кастомний clock-loader, немає чистого Iconify-відповідника), `offline` (специфічна signal_wifi_off-варіація), `leave-room` (door+arrow геометрія неоднозначна щодо MUI input/output/meeting_room). Дает чіткий benefit-tradeoff: 21 ref без локальних assets, 4 — з контрольованою геометрією.
- **Раніше:** очищено `trending-up.svg` + `assets/icons/node_modules/` dev cache; `light-mode.svg` був un-staged до 2026-05-16.

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

## E2E Tech Debt ⏳

Аудит Playwright setup, звірений 2026-05-16. Smoke pack працює коректно; нижче — точкові правки для consistency і зменшення майбутніх flakiness ризиків.

### P1. Mixed signup entry points ⏳
- **Файли:** `tests/fixtures/auth.ts:56-64`, `tests/page-objects/AuthPage.ts`
- **Action:** `signupViaUI` живе як фікстура, але `login/signOut/expectSignedIn` — у `AuthPage` POM. Винести `signup(email, pwd)` у `AuthPage`, прибрати `signupViaUI` фікстуру (а `trackedEmails` лишити окремо).

### P2. Webkit `testIgnore` без коментаря ⏳
- **Файл:** `playwright.config.ts:42`
- **Action:** `testIgnore: ['**/critical-flows.spec.ts']` без пояснення *чому*. Додати inline-коментар (ймовірно: Supabase email confirmation flow / session storage специфіка на webkit), щоб через кілька місяців не довелося ре-investigate.

### P3. Порожні fixture-папки ⏳
- **Файли:** `tests/fixtures/{data,factories,mocks,nuxt}/`
- **Action:** усі порожні. Або scaffolding (тоді `.gitkeep` + README з призначенням), або видалити — зараз noise.

### P4. Зайвий `consoleErrors: _consoleErrors` у підписах ⏳
- **Файл:** `tests/e2e/smoke.spec.ts:5, :33`
- **Action:** `{ auto: true }` у `console.ts` гарантує тригер без явного запиту в параметрах. Прибрати `_consoleErrors` з обох тестів.

### P5. `waitForURL` лямбда замість рядка (nitpick) ⏳
- **Файл:** `tests/page-objects/AuthPage.ts:12`
- **Action:** `waitForURL((url) => url.pathname === '/')` → `waitForURL('/')`.

### P6. `reuseExistingServer` + різні build modes ⏳
- **Файл:** `playwright.config.ts:48-52`
- **Action:** webServer.command — `npm run build && npm run preview`, але `reuseExistingServer: !process.env.CI` reuse-не вже запущений `npm run dev` на :3000. Локально це означає тести можуть пройти на dev-build, а на CI/prod-preview зафейлити. Варіанти: (а) використати окремий порт для preview, (б) змінити webServer на `npm run dev` як швидший local feedback (trade-off — preview ближче до prod), (в) задокументувати в CLAUDE.md, що E2E вимагає зупиненого dev server.

### P7. Console errors без allowlist ⏳
- **Файл:** `tests/fixtures/console.ts:11-13`
- **Action:** ловиться будь-який `console.error()` / `pageerror`. Supabase realtime може логувати очікувані reconnect events як error рівень. Поки тестів мало — нема. До розширення coverage додати `expectedConsoleErrors: (string | RegExp)[]` як налаштовуваний параметр фікстури.

### P8. Roboto via Google Fonts CDN під час E2E ⏳
- **Файл:** `nuxt.config.ts:20`
- **Action:** кожен test чекає на `fonts.googleapis.com`. На CI / slow connection — джерело flakiness і повільності. Або route block у global setup (`page.route('**/fonts.googleapis.com/**', r => r.abort())`), або self-host Roboto через `@nuxtjs/google-fonts`.

### P9. Shared E2E_TEST_USER акаунт ⏳ (поки не блокер)
- **Файл:** `tests/e2e/critical-flows.spec.ts:16-26`
- **Action:** `login persistent user` тест використовує один shared акаунт через env. `fullyParallel: true` працює бо тільки 1 тест його займає. До появи кількох login-залежних тестів — впровадити per-worker account factory.

### P10. Виділений безкоштовний Supabase test-проєкт ⏳
- **Контекст:** окремого dev/test Supabase-оточення в проєкті немає — єдина БД це прод. E2E потребує `.env/.env.test` із `SUPABASE_URL` + `SUPABASE_TEST_SERVICE_ROLE_KEY` (`tests/support/helpers/supabase-admin.ts`) для cleanup кімнат у teardown (`tests/fixtures/room.ts`). Тестувати проти прода ризиковано: public read/write RLS = нульова ізоляція даних, потреба класти prod service-role у CI, і відсутність cleanup для auth-юзерів/`user_profiles` → постійне засмічення.
- **Action:** створити окремий безкоштовний Supabase-проєкт (free tier дозволяє кілька), накотити міграції `001`–`007` через SQL Editor, скласти креди в `.env/.env.test` і CI-секрети. Розблоковує локальний `npm run test:e2e` і e2e в CI без ризику для прода.

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
