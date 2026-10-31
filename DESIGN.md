# DESIGN.md - Story Point Poker Room

Аналіз дизайн-системи сторінки `examples/room.html` (захоплено з `https://app.storypoint.poker/nG8AOnjC`).

---

## 1. Стек і архітектура UI

- **Framework:** React + **Material UI 5** (Emotion CSS-in-JS, `MuiPaper-root`, `MuiAppBar-*`, `MuiCard-root`, `MuiMenu-paper` тощо)
- **Дизайн-мова:** Material Design 2 (a не M3) - класичні `elevation 0..24`, прямокутні карточки з рад. 4-7px, тіні «Material shadow stack»
- **Тема:** автоматична через `prefers-color-scheme` (немає UI-перемикача - повністю системна)
- **Іконки:** Material Symbols (виключно SVG, через `@mui/icons-material`)
- **Аватари:** [DiceBear `bottts` 7.x](https://api.dicebear.com/7.x/bottts) - згенеровані за `seed = playerName`
- **Шрифт:** `Roboto, Helvetica, Arial, sans-serif` (з Google Fonts: `Roboto:300,400,500,700` + `Source Sans Pro:300,400,600,700`)

---

## 2. Дизайн-токени

### 2.1 Кольорова палітра

#### Brand
| Токен | Hex | Призначення |
|---|---|---|
| `primary` | `#455a64` | AppBar, Players header, кнопка JOIN ROOM (Blue Grey 700) |
| `primary.dark-mode` | `#546e7a` | Той самий primary в темній темі (Blue Grey 600) |
| `primary.dark` | `#1c313a` | Темний відтінок для hover/active |
| `accent` | `#00cdcd` | Pinned tab колір (бренд-tinted) |
| `error` | `rgb(198, 63, 23)` | Деструктивні стани (помилки, leave room) |

#### Light theme - surfaces & text
| Роль | Значення |
|---|---|
| `background.default` | `rgb(250, 250, 250)` ≈ `#fafafa` |
| `background.paper` | `#ffffff` |
| `surface.subtle` | `rgb(245, 245, 245)` ≈ `#f5f5f5` (картки голосування) |
| `surface.hover` | `rgb(240, 240, 240)` ≈ `#f0f0f0` |
| `text.primary` | `rgba(0, 0, 0, 0.87)` |
| `text.secondary` | `rgb(97, 97, 97)` (Grey 700) |
| `text.disabled` | `rgba(0, 0, 0, 0.38)` |
| `divider` | `rgba(0, 0, 0, 0.12)` |
| `action.hover` | `rgba(69, 90, 100, 0.04)` (primary @ 4%) |
| `action.selected` | `rgba(69, 90, 100, 0.08)` |

#### Dark theme - surfaces & text
| Роль | Значення |
|---|---|
| `background.default` | `rgb(33, 33, 33)` ≈ `#212121` |
| `background.paper` | `rgb(51, 51, 51)` ≈ `#333333` |
| `surface.elevated` | `rgb(66, 66, 66)` ≈ `#424242` |
| `text.primary` | `#ffffff` |
| `text.secondary` | `rgb(184, 192, 196)` (cool gray) |
| `text.disabled` | `rgba(255, 255, 255, 0.3)` |
| `divider` | `rgba(255, 255, 255, 0.12)` |
| `action.hover` | `rgba(255, 255, 255, 0.08)` |
| `action.selected` | `rgba(255, 255, 255, 0.12)` |

### 2.2 Типографіка

Базовий розмір - `16px`, шкала Material:

| Роль | Розмір | Вага | Приклад |
|---|---|---|---|
| `h1` | `2.9991rem` (~48px) | 700 | - |
| `h2` | `2.7849rem` (~44px) | 700 | - |
| `h3` | `2.5707rem` (~41px) | 700 | - |
| `h4` | `2rem` | 700 | - |
| `h5` | `1.5rem` | 700 | значення на картках голосування |
| `h6` | `1.25rem` | 600 | заголовок «Players», «Story Point Poker» |
| `subtitle1` | `1.125rem` | 500 | - |
| `body1` | `1rem` | 400 | основний текст |
| `body2` | `0.9375rem` | 400 | підписи, метаінфо |
| `caption` | `0.75em` | 400 | бейджі, статус-помітки |

**Ваги в системі:** `400 / 500 / 600 / 700` (light не використовується)

### 2.3 Тіні (Material elevation stack)

| Рівень | Значення |
|---|---|
| `elevation 0` | `none` |
| `elevation 1` | `0 2px 1px -1px rgba(0,0,0,.2), 0 1px 1px rgba(0,0,0,.14), 0 1px 3px rgba(0,0,0,.12)` |
| `elevation 3` | `0 3px 3px -2px ..., 0 3px 4px ..., 0 1px 8px ...` (Players card) |
| `elevation 4` | `0 2px 4px -1px ..., 0 4px 5px ..., 0 1px 10px ...` (AppBar) |
| `elevation 8` | `0 5px 5px -3px ..., 0 8px 10px 1px ..., 0 3px 14px 2px ...` (Menu, Popover) |

В темній темі тіні **зберігаються** (на відміну від Material 3, де вони замінюються на surface tint).

### 2.4 Border radius

| Токен | Значення | Де |
|---|---|---|
| `radius.none` | `0` | AppBar |
| `radius.sm` | `4px` | Картки голосування, поля вводу |
| `radius.md` | `5px / 7px` | Player rows |
| `radius.pill` | `25px` | Кнопка JOIN ROOM (на login-екрані) |
| `radius.full` | `50%` | Аватари, IconButton |

### 2.5 Spacing scale

Базується на 8-px grid (Material standard):
`4 / 8 / 16 / 24 / 32 / 48` (px)

Розрізи з реального коду: `padding: 16px / 24px / 32px / 36px`, `margin: 4px / 8px / 24px / 32px`.

---

## 3. Layout

```
┌────────────────────────────────────────────────────────────────────┐
│ AppBar (sticky, 64px tall, primary bg, elevation 4)                │
│  ┌─Logo "Story Point Poker"  ──────── User chip + Avatar IconBtn─┐│
│  └────────────────────────────────────────────────────────────────┘│
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌─────────────────┐    ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐           │
│  │ Players Card    │    │  1  │ │  2  │ │  3  │ │  5  │  ...      │
│  │ (elevation 3)   │    └─────┘ └─────┘ └─────┘ └─────┘           │
│  │  ─ row io       │                                               │
│  │  ─ row Tester   │    ┌─────┐ ┌─────┐ ┌─────┐                    │
│  │  ─ row Тестер   │    │  20 │ │  ?  │ │  ☕ │                    │
│  └─────────────────┘    └─────┘ └─────┘ └─────┘                    │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

- **AppBar:** позиція `sticky`, висота `64px`, фон `#455a64`, текст білий
- **Sidebar (Players):** фіксована ширина ~`260px`, `margin: 16px`, `elevation 3`
- **Vote area:** flex-wrap, картки `~150 × 200px`, gap `16px`, центровані по горизонталі

---

## 4. Компоненти

### 4.1 AppBar
- `MuiAppBar-positionSticky` + `MuiAppBar-colorPrimary`
- Висота `64px`, padding-left/right `24px`
- Контейнер з логотипом (h6, weight 600) ліворуч, праворуч - текст username + IconButton з PersonIcon

### 4.2 Players Card
- `MuiPaper-elevation3`, рад. `5px`
- Header: `#455a64` фон, білий h6 «Players», center, padding `8px 16px`
- Список - `<List>` з рядками: avatar + name + status icons + 3-dot menu (тільки для current user)
- Status icons (праворуч): `aria-label="moderator|inactive|player deciding"`
- Висота рядка `48px`, `border-radius: 7px` на hover

### 4.3 Vote Card
- `MuiCard-root` + `MuiPaper-elevation1`
- Розмір `~150 × 200px`, фон `#f5f5f5` (light) / `#424242` (dark)
- Значення центроване, `font-size: 1.5rem` (h5), `font-weight: 400`, колір `text.secondary`
- States:
  - **default:** `elevation 1`, фон subtle
  - **hover:** ледь вищий контраст фону (`#f0f0f0`)
  - **selected:** `elevation 3` + білий фон в light, або трохи світліший в dark
- Спеціальні значення: `?` (unknown estimate), `☕` (coffee break) - як емоджі (1.5rem)

### 4.4 Player row (in Players list)
- `<ListItem>` з:
  - Avatar (round, 40 × 40, DiceBear bottts; авторизовані можуть завантажити власне фото - непорожній `user_profiles.avatar_url` + Storage bucket `avatars`, спека `docs/specs/2026-08-02-custom-avatar-upload-design.md`)
  - Primary text (name) - `body1` 400; **bold 500** для current user
  - Trailing - статус-іконки (16px, opacity 0.54) + 3-dot IconButton (тільки своя)

### 4.5 Avatar Menu (top-right)
- `MuiPopover` + `MuiMenu-paper`, `elevation 8`
- Опції: `Sign In`, `Sign Up` (для гостя)
- Іконки 24px зліва від тексту

### 4.6 Player context menu (3-dot)
- Те саме `MuiMenu-paper`, опції: **Is Moderator** / **Is Observer** (з Switch), **Rename Player**, **Leave Room**
- Switch - стандартний MUI з primary тремоном

---

## 5. Іконографіка

Усі іконки - **Material Symbols / Icons** (SVG, viewBox 24×24):

| Іконка | aria-label | Призначення |
|---|---|---|
| `SportsEsports` | - | Геймпад біля гравця-«bot» (io) |
| `WifiOff` | `inactive` | Гравець офлайн |
| `Schedule` (clock) | `player deciding` | Гравець ще обирає |
| `MilitaryTech` / shield | `moderator` | Модератор кімнати |
| `MoreVert` | - | 3-dot меню гравця |
| `AccountCircle` | `account of current user` | Avatar IconButton в AppBar |

**Жодних емоджі замість іконок** - структурні елементи виключно SVG. Емоджі (`☕`) використовуються лише як **семантичне значення** на vote card.

---

## 6. Інтерактивні стейти

| State | Light | Dark |
|---|---|---|
| Default surface | `#ffffff` / `#f5f5f5` | `#333` / `#424242` |
| Hover | +`rgba(69,90,100,.04)` | +`rgba(255,255,255,.08)` |
| Active / Pressed | +`rgba(69,90,100,.12)` | +`rgba(255,255,255,.12)` |
| Selected | `elevation 3` + accent border | те саме |
| Disabled | opacity `.38` | opacity `.5` (text), `.3` (icon) |
| Focus visible | `outline: 2px solid #455a64` (MUI default) | `2px solid #00cdcd` |

---

## 7. Адаптивність

Захоплена розмітка - **desktop layout** (1440 × 900). На мобільних, ймовірно:
- AppBar залишається sticky
- Players sidebar схлопується в expandable панель або bottom sheet
- Vote cards перебудовуються в 3 колонки

> ⚠️ Захоплена тільки одна точка зору; mobile-варіант не верифіковано.

---

## 8. Анти-патерни / зауваги

- ❌ **Немає UI-перемикача теми** - користувач залежить від системних налаштувань. UX-кейс «хочу темну тему вдень» не покритий
- ❌ **Status icons без tooltip** на player row - `aria-label` є, але hover-tooltip не показує сенс іконки користувачу-без-screen-reader
- ❌ **Контраст vote card в light:** значення `rgb(97,97,97)` на фоні `#f5f5f5` - контраст ~5.7:1 (OK для AA, але не AAA)
- ⚠️ **Material Design 2** замість M3 - виглядає трохи застаріло (плоскі тіні, прямі углы). Сучасніший вигляд дав би перехід на MD3 (динамічна палітра, surface tint, ширші радіуси `12-16px`)
- ⚠️ **DiceBear аватари** генеруються через зовнішнє API на кожен render - варто кешувати або генерувати на клієнті (`@dicebear/core`)

---

## 9. Рекомендації для відтворення

Якщо переписувати на власний стек:

```ts
// Tailwind config (приклад)
colors: {
  primary: { DEFAULT: '#455a64', dark: '#1c313a', light: '#546e7a' },
  accent:  { DEFAULT: '#00cdcd' },
  surface: {
    light:    { base: '#fafafa', paper: '#ffffff', subtle: '#f5f5f5', hover: '#f0f0f0' },
    dark:     { base: '#212121', paper: '#333333', subtle: '#424242', hover: '#3a3a3a' },
  },
},
fontFamily: { sans: ['Roboto', 'Helvetica', 'Arial', 'sans-serif'] },
borderRadius: { sm: '4px', md: '7px', pill: '25px' },
boxShadow: {
  e1: '0 2px 1px -1px rgba(0,0,0,.2), 0 1px 1px rgba(0,0,0,.14), 0 1px 3px rgba(0,0,0,.12)',
  e3: '0 3px 3px -2px rgba(0,0,0,.2), 0 3px 4px rgba(0,0,0,.14), 0 1px 8px rgba(0,0,0,.12)',
  e4: '0 2px 4px -1px rgba(0,0,0,.2), 0 4px 5px rgba(0,0,0,.14), 0 1px 10px rgba(0,0,0,.12)',
  e8: '0 5px 5px -3px rgba(0,0,0,.2), 0 8px 10px 1px rgba(0,0,0,.14), 0 3px 14px 2px rgba(0,0,0,.12)',
},
```

**Бажаний апгрейд:**
- Перейти на MD3 / shadcn/ui - отримати кращу типографіку, surface tint, dynamic theming
- Додати свій theme-toggle (зберігати в `localStorage`)
- Додати tooltip на статус-іконки гравця
- Анімований transition між темами (`transition: background 200ms ease, color 200ms ease`)
- Фіксовані values голосування винести в config (зараз - Fibonacci `1, 2, 3, 5, 8, 13, 20, ?, ☕`)

---

## 10. Аудит поточної реалізації (assets/css/main.css)

> Аудит станом на 2026-05-14. Версія: Tailwind v3 via `@nuxtjs/tailwindcss ^6`.

### 10.1 Що реалізовано

- Повна система CSS custom properties (`--bg-*`, `--text-*`, `--primary`, `--shadow-*`)
- Dual-theme через `html[data-theme='dark|light']` - без flash завдяки inline script у `<head>` (nuxt.config.ts)
- MUI-like бібліотека в `@layer components`: `mui-btn`, `mui-btn-text`, `mui-icon-btn`, `mui-input`, `mui-card`, `mui-menu`, `mui-menu-item`, `mui-modal-overlay`, `mui-modal-paper`, `mui-switch`, `mui-h5`, `mui-h6`, `mui-body`, `mui-caption`, `mui-svg-icon`
- Responsive `mui-card-value` (4 breakpoints: base / 600 / 900 / 1200)
- Consistent shadow scale (1/2/3/4/8 = Material elevation stack)
- ✅ Tailwind токени зареєстровані в `tailwind.config.ts` (раніше - пр. 10.2 #1): `primary`, `primary-hover`, `primary-soft`, `danger`, `success`, `bg-{app,appbar,paper,elevated,overlay,skeleton}`, `text-{primary,body,muted,disabled,inverse}`, `border-{DEFAULT,input}`, `shadow-{1,2,3,4,8}`

### 10.2 Виявлені проблеми

| # | Проблема | Вплив |
|---|----------|-------|
| 2 | Inline `style=` у компонентах (AppHeader, [slug].vue та ін.) | Обходить Tailwind, важко рефакторити та підтримувати |
| 3 | ✅ Виправлено - `mui-btn-text:disabled` визначено | - |
| 4 | ✅ Виправлено (2026-07-12) - див. §10.4 | Карти й панелі більше не зливаються з фоном у light mode |

### 10.3 Рекомендовані виправлення

**Пріоритет 1 - fix light mode card contrast:** ✅ реалізовано (2026-07-12) через `--card-border`/`--card-shadow`, див. §10.4 - фінальне рішення додає контур+тінь, а не тільки зміну фону.

**Пріоритет 2 - `mui-btn-text:disabled`:** ✅ вже реалізовано в кодовій базі.

**Пріоритет 3 - поступово замінити inline `style="color: var(--text-*)"` на Tailwind утиліти (`text-muted`, `bg-paper` тощо).** Досі актуально; частково зроблено для `text-white` → `text-primary` (§10.4), решта inline-стилів (AppHeader, countdown-кнопки) лишається.

### 10.4 Зміни сесії 2026-07-12

**Контраст карток/панелей у light theme (§10.2 #4).** Додано теми-залежні токени в `html[data-theme='light']`:
- `--card-border: 1px solid rgba(0,0,0,0.192)`, `--card-shadow: 0px 1px 2px rgba(0,0,0,0.096)` - читає `.mui-card` (голосувальні картки) і `.mui-icon-btn` (іконки-кнопки)
- `--paper-border: var(--card-border)`, `--paper-shadow: var(--card-shadow)` - читає `.mui-paper` (Players/Timer/AlignmentCard/SlotMachine), а заразом і `.mui-modal-paper`/`.mui-menu`, які вже раніше читали `--paper-border`
- Для `.mui-icon-btn` контур вимкнено в темних барах (`.bg-appbar`, `.mui-paper-header`), де він не потрібен

**Новий компонент `.mui-chip`** (Filter/Choice chip, `border-radius: var(--radius-chip, 999px)`) - замінив нативний чекбокс-грід карток колоди та `.mui-shield`-пікер третьої картки в `ConfigureCardDeckModal.vue`. `.mui-shield` лишився без змін для вибору ролі гравця (`PlayerEditModal.vue`).

**`.mui-icon-group`** - тонкий спільний контур (`border-radius: 999px`, `min-width: 128px`, `min-height: 44px`), об'єднує групу іконок-кнопок в один блок замість окремих рамок на кожній.

**Механіка старту відліку (`CardsArea.vue`) переосмислена:**
- Прибрано окрему CTA-кнопку "Прошу голосувати" (`cards.revealCountdown`) і концепцію "коротке натискання = обраний режим за замовчуванням" (`sp-countdown-mode` в localStorage більше не використовується)
- Кожна з 3 іконок (`Без звуку` / `Простий звук` / `З атмосферою`) - самодостатня дія: **утримання 1.4с** (`pointerdown`/`keydown Enter-Space`, скасовується на `pointerup`/`pointerleave`/`blur`, прив'язане до конкретного режиму щоб `blur` сусідньої кнопки не скасовував чуже утримання) заповнює тонкий SVG-ореол (`stroke-dashoffset`-transition, синхронізована з `HOLD_MS` в CSS) і стартує `startCountdown(mode)`
- Ореол: `stroke-width: 2`, колір `var(--text-primary)` (тема-залежний: чорний у light, білий у dark), вписаний у межі самої кнопки (не виходить за контур групи)
- Поки триває відлік, група `.mui-icon-group` не зникає - рамка лишається на місці, кнопки всередині заміняються центрованим лічильником (`countdownCounter`)
- Іконка "Простий звук": `app:bank` → кастомна `app:timer` (двострілковий циферблат; виправлено через `fill-rule="evenodd"`, бо напрямок обходу контуру ховав другу стрілку)

**`text-white` → `text-primary`** у заголовках/статистиці/вкладках-фільтрах (`AlignmentTrendsModal`, `HistoryModal`, `ConfigureCardDeckModal`, `ResultsArea`, `CardsArea`) - білий текст на світлому фоні модалок був практично невидимий у light theme. Білий текст лишено тільки там, де він лежить на кольорових бейджах/бульбашках (не теми-залежний фон).

**Vote question (`CardsArea.vue`)** - редактор відповідей: кожен рядок отримав `✕` (видалення будь-якого рядка, не тільки останнього), "+" винесено в окрему кнопку `mui-btn-text` "Додати варіант" під списком; старт голосування блокується, якщо є доданий, але порожній рядок.

---

## 11. Функціонал та механіки

> Усі ролеві гейти нижче - **client-side only**. RLS на `rooms`/`room_state`/`players`/`round_history` - `using (true)` (публічний read/write для anon key, `supabase/migrations/001_initial_schema.sql`). Розмежування ролей ніяк не enforced на рівні БД.

### 11.1 Функціонал модератора

Ролі визначаються в `app/pages/[slug].tsx`:
```ts
const isModerator = currentPlayer?.is_moderator ?? false
const isAuthorizedModerator = isModerator && !!user
```

**Модератор (`is_moderator`, авторизація не потрібна)** - увесь нижній блок кнопок у `CardsArea.tsx` (`{isModerator && ...}`) плюс кілька контролів поза ним:

| Дія | Компонент / handler |
|---|---|
| Розкрити оцінки (reveal) | `CardsArea.tsx` reveal-button → `roomStore.reveal()` |
| Скинути голоси (reset) | `CardsArea.tsx` reset-button → `roomStore.resetVotes()` |
| Показати попередній раунд (undo) | `CardsArea.tsx` undo-button → `showLastRound = !showLastRound` |
| Запустити відлік розкриття | `CardsArea.tsx` hold-to-start (силент/зі звуком/з атмосферою) → `broadcastCountdownStart` - деталі §11.6 |
| Почати новий раунд | `ResultsArea.tsx`, `showNewRound={isModerator}` → `roomStore.startNewRound()` |
| Налаштувати опитування (`voting`/`vote_question`) | `CardsArea.tsx`, умова `... && isModerator` → `setPollQuestion`/`startVoteQuestion` |
| Налаштувати колоду карт і кола результатів | `AppHeader.tsx` меню → `ConfigureCardDeckModal` (чіпи «Показувати результати», §11.9) |
| Виключити гравця (kick) | `PlayerRow.tsx`, гейт `currentUserIsModerator` → `playersStore.kick` |
| Керування таймером (reset/pause/resume/±30s) | `Timer.tsx`, `canControl={isModerator}` (саме `isModerator`, **не** `isAuthorizedModerator`) |

**Авторизований модератор (`isModerator && user`)** - додатково над списком вище:

| Дія | Компонент / handler |
|---|---|
| Перейменувати кімнату / встановити slug | `AppHeader.tsx`, вкладена умова `user` усередині `isModerator` → `roomStore.setRoomName(name, slug)` |
| Фон кімнати (завантажити / кадрувати / прибрати) | `AppHeader.tsx` → `RoomBackgroundModal` (лише `isAuthorizedModerator`, який є власником фону або фон ще нічий) → `roomStore.uploadBackground` / `removeBackground`, §11.10 |
| Перейменувати іншого гравця + його shields | `PlayerRow.tsx`, гейт `currentUserIsAuthorizedModerator` (вкладено в `currentUserIsModerator`-блок) → `PlayerEditModal` |

### 11.2 Функціонал гравця

Доступно будь-якому учаснику кімнати, незалежно від `is_moderator`:

- Голосувати за активну картку (`CardsArea.tsx`, картки не гейтяться роллю - лише `canVote`)
- Перейменувати себе / встановити власні shields (`PlayerRow.tsx`, гейт `isOwn` → `PlayerEditModal`)
- Вийти з кімнати (`PlayerRow.tsx`, гейт `isOwn` → soft-delete `left_at`)
- **Перемкнути власний прапорець модератора** (`PlayerRow.tsx`, гейт тільки `isOwn`, без перевірки `currentUserIsModerator`) - самопризначення доступне будь-кому, не тільки поточному модератору; тогл ЧУЖОГО прапорця модератора в UI відсутній взагалі
- Переглянути історію раундів / графік узгодженості (`AppHeader.tsx`, гейт лише `roomName` - тобто кімната має назву, роль не перевіряється)
- Перемкнути тему/палітру/мову, бічний віджет Timer ↔ SlotMachine
- Грати в слот-машину (3 спіни за раунд, у `PO`/`SM` - 5; гейтинг - §11.8)

### 11.3 Графік узгодженості та тренди (`AlignmentTrendsModal.tsx`)

**Джерело даних:** один запит `roomStore.fetchHistory()` в `useEffect` при відкритті - увесь
`round_history` кімнати (без пагінації/дат-фільтра на рівні БД). `isNumericPreset()` лишає
`scrum`/`fibonacci`/`hours`/`goal_clarity` і раунди без пресету; для останніх додатково потрібен хоча б
один числовий голос.

**Гранулярність - один раунд = одна точка графіка.** Кожен відфільтрований запис `round_history`
мапиться 1:1 у `ChartPoint {date, alignments, overall, deckPreset, round}`:
`roleRoundAlignment(round, shieldsMap)` дає бали ролей, `summarizeRound(round, shieldsMap).alignment` -
загальний бал. Агрегування по днях/тижнях немає.

> ⚠️ `shieldsMap` будується з поточних shields видимих гравців на момент відкриття модалки. Зміна ролі
перераховує минулі раунди під нову роль; без ролі й гравці, яких уже немає серед видимих, рахуються як
DEV. Роль на момент голосування у snapshot не зберігається.

**Фільтри:**
- Часове вікно: `30D` / `90D` / `6M` (default) / `1Y` - `cutoff` рахується від `Date.now()`
- Колода: `deckFilter` обмежує до одного `deck_preset` або показує всі

**Формула `alignmentScore(votes, deckOrder)` (`app/utils/alignment.ts`):**
1. `estimateCards` = порядок колоди мінус `{'?', '☕'}`
2. Кожен голос → індекс позиції у `estimateCards`; голоси за `?`/`☕` не рахуються
3. Якщо рахованих голосів < 2 → `null`
4. `span = estimateCards.length - 1`; якщо колода має 1 картку-оцінку → `100`
5. `spread = max(індекс) - min(індекс)` серед голосів
6. **`score = round(100 * (1 - spread / span))`** - 100 = усі обрали одну картку (або сусідні), 0 = найдальші картки колоди одночасно проголосовані

Графік трендів малює окрему лінію на кожну з ролей DEV, BE, FE, SRE, QA, GQA, AQA, PO, SM, що має
не-null бал у видимому періоді (`roleRoundAlignment()` у `roundStats.ts`, сира роль - `voteCohortFor()`
з `resultCohorts.ts`). Кожна лінія перемикається в легенді. `COHORT_COLORS` - спільна мапа для ліній і
бейджів історії та знімка; GQA - `#ff7043`, AQA - `#fdd835`, QA - `#ffa726`. Чіпи «Показувати
результати» (§11.9) на історію, тренди, головну й нові поля API не впливають. Кастомні ролі не мають
рольових ліній.

**Legacy rounds без `active_cards`/`deck_preset`** (виправлено 2026-07-26): `alignmentScore` повертає
`null`, якщо `deckOrder` порожній - а раунди, записані до міграції `010_round_history_deck.sql`, мають
`active_cards = null` (і найстаріші - ще й `deck_preset = null`), тому їхній alignment мовчки випадав з
графіка, хоча голоси в них цілком реальні й числові. `resolveActiveCards(activeCards, deckPreset)`
(`app/utils/roundStats.ts`) підставляє `defaultActive` відповідного пресету з `cardDecks.ts`, а якщо
навіть `deck_preset` відсутній - `DEFAULT_PRESET_ID` (`'scrum'`); це наближення (реальна колода на
момент раунду могла бути звуженою), але краще за повне випадання точки. Викликається в
`roleRoundAlignment`/`summarizeRound` - тому й `AlignmentTrendsModal`, і `HistoryModal` тепер бачать ці
раунди. **Дзеркалить** `resolveActiveCards` у `netlify/functions/room-json.mts` (комміти
`e1dcf02`/`beca0e5`) - синхронізувати вручну при зміні формули в обох місцях.

**Загальний бал раунду:** історія, головна й картки трендів рахують `alignmentScore` одним пулом голосів
оцінювачів DEV/BE/FE/SRE/QA/GQA/AQA, без PO/SM і кастомних ролей (`estimatorVotes()`). Якщо жоден
оцінювач не голосував, пул - усі голоси. Середнє оцінок рахується з того самого пулу. Бал - ціле 0-100,
`null` при менше ніж двох голосах картами колоди без `?`/`☕`. Головна показує округлене середнє не-null
загальних балів числових раундів; poll- і нечислові колоди виключені. Legacy-поля API для agilecharts
зберігають свій контракт (`netlify/AGENTS.md`).

**Агрегати поверх відфільтрованих точок** беруть загальні бали раундів:

- Поточний бал - останній не-null бал у видимому періоді; середній - округлене середнє не-null балів
- Тренд - тільки якщо ≥4 не-null балів: `pct = (середнє нової половини - середнє старої половини) / стара половина × 100`;
  `up` якщо `pct > 1`, `down` якщо `< -1`, інакше `stable`

**Бейджі рівня (`alignmentLevel`/`levelColor`):** `Perfect ≥90` (зелений), `High ≥75` (зелений), `Medium ≥40` (жовтий), `Low <40` (червоний).

> ⚠️ Горизонтальні пунктирні лінії-орієнтири на самому графіку (`REF_LINES`: 100/75/50/25, підписані як `100%`/`75%`/`50%`/`25%`) - це просто візуальні мітки сітки, їхні позиції **не збігаються точно** з порогами `alignmentLevel` (напр. лінія на 50 не збігається з текстовим порогом "Medium", який починається з 40).

**Рушій графіка - ECharts** (`echarts`, з 2026-07-25; до того - ручний SVG). Підключені лише потрібні модулі (`echarts/core` + `CanvasRenderer`/`LineChart`/`GridComponent`/`TooltipComponent`/`DataZoomComponent`/`MarkLineComponent`, `use([...])`) заради розміру бандла. `useEChart(container, option)` (`app/hooks/useEChart.ts`, resize через `ResizeObserver`) - `chartOption` у `useMemo`, що будує `xAxis`/`yAxis`/`series`/`tooltip`/`dataZoom` з `points`.

**Ось X** - `type: 'category'` з `boundaryGap: false`, дані - `weekLabel(date)` (ISO-тиждень, `w12`) для кожної точки; категорійна вісь сама розподіляє точки рівномірно за порядком (а не пропорційно реальному часу), тому близькі в часі раунди не накладаються, а перша/остання точка лежать точно на краях графіка. Лінія - `smooth: true` (вбудоване згладжування ECharts, без ручної Catmull-Rom).

**dataZoom-таймлайн знизу** - слайдер (`type: 'slider'`) під графіком з міні-превʼю форми лінії (`dataBackground`) + `type: 'inside'` для zoom/pan колесом миші чи pinch; дозволяє наблизити довільний відрізок часового вікна, обраного кнопками `30D/90D/6M/1Y`, не змінюючи сам фільтр.

**Reference lines** (100/75/50/25%) - окрема невидима серія `__refLines` (`data: []`, `silent: true`,
`tooltip.show: false`) з `markLine`, завжди в `series` незалежно від перемикачів ролей, щоб орієнтири не
зникали разом із лініями.

**Tooltip** - `trigger: 'item'`, **`triggerOn: 'click'`** (клік на крапку показує і "пришпилює" tooltip;
ховається лише повторним кліком чи по порожньому місцю графіка - на відміну від строгого hover, це дає
час дотягнутись курсором до кнопки "Деталі", особливо на крайніх точках), `enterable: true` (можна
навести на сам tooltip не закривши його). Контент - `formatter()` повертає HTML: лейбл серії + значення
(`%`), дата, кнопка-закриття `×` (`data-close-tooltip`) і клікабельний рядок `trends.viewDetails`
(`data-view-details`, `data-index`). Лейбл серії - тег сирої ролі з `series.name`, колір - з
`COHORT_COLORS`.

**Round snapshot** - клік на `data-view-details` у tooltip ловиться делегованим `document`-listener-ом
(ECharts рендерить tooltip у `document.body`), звідти `points[dataIndex].round` → `selectedRound` →
`RoundSnapshotModal.tsx`. Модалка рендериться всередині поточної, щоб Tab не виходив зі знімка; показує
імена й голоси зі snapshot `round_history.votes`, поруч - `RoleBadge` з поточних shields. Роль береться
з того самого `shieldsMap`, тому діє застереження про зміну ролей після голосування.

**Когорта в round snapshot** - `data-view-details` несе `data-cohort` з тегом ролі лінії
(`params.seriesName`), який передається як `cohort` у `RoundSnapshotModal`. Модалка фільтрує
`round.votes` через `voteCohortFor()` і показує лише голоси цієї сирої ролі; у заголовку - її бейдж
кольору з `COHORT_COLORS`. Якщо після фільтра голосів немає - `trends.noVotesInCohort`.

### 11.4 Історія раундів (`round_history`)

**Схема** (`supabase/migrations/001_initial_schema.sql` + `010_round_history_deck.sql`):
```sql
round_history (
  id uuid PK, room_id text, started_at timestamptz, revealed_at timestamptz,
  votes jsonb, created_at timestamptz,
  active_cards text[], deck_preset text
)
```

**Запис** - `roomStore.reveal()` (`app/stores/room.ts`):
1. No-op якщо кімнати/стану нема або `phase` вже `'revealed'` (захист від подвійного запису)
2. Збирає `votes = {player_id, name, vote}[]` лише з гравців із непустим голосом
3. Виставляє `room_state.phase='revealed'` умовним update (`phase <> 'revealed'`, `select('room_id')`); якщо таймер був на паузі - заморожує `paused_elapsed_ms` (див. §11.6)
4. **Рядок `round_history` пишеться, тільки коли цей update змінив рядок і `votes.length >= 2`** - одноголосні/безголосі reveal-и в історію не потрапляють, а з двох одночасних reveal-ів пише лише той, що виграв update; той, що змінив 0 рядків, перечитує `room_state`, а помилку update логує
5. `active_cards`/`deck_preset` беруться зі стану кімнати на момент reveal - тому картка в історії лишається правильною, навіть якщо колоду згодом змінили

`?` і `☕` рахуються як повноцінні голоси для запису, але виключаються з `alignmentScore`/`averageOf` (нечислові). `name` у snapshot дублюється, щоб історія лишалась читабельною після rename/kick/leave гравця.

**`HistoryModal.tsx`** читає весь `fetchHistory()`, групує по рік/квартал, фільтрує по колоді; для
кожного раунду показує `summarizeRound()` (`app/utils/roundStats.ts`): `average` (зважене середнє
числових голосів, `.toFixed(1)`), `alignment` (`alignmentScore`), `counts` (кількість голосів по кожному
значенню), `voterCount`. Для poll-колод (`voting`/`vote_question`) `average`/`alignment` - завжди
`null`. Середнє й узгодженість беруть пул оцінювачів (§11.3); counts і voterCount охоплюють усі голоси.
Якщо голоси з когортою належать двом і більше ролям, показується рядок на роль у порядку DEV, BE, FE,
SRE, QA, GQA, AQA, PO, SM; кастомні голоси - останнім рядком без бейджа. Якщо роль одна або голосували
лише кастомні ролі, показується один рядок усіх голосів. Групування бере сиру поточну роль незалежно від
чіпів кімнати.

### 11.5 Export (видалено)

Ручний CSV-експорт з `HistoryModal` (кнопка на колоду, обмежена `scrum`/`fibonacci`) видалено - його роль тепер виконує публічний JSON API `netlify/functions/room-json.mts` (`GET /api/<room>.json` і `GET /api/teams.json`), яким живиться `agilecharts`. Деталі - AGENTS.md, розділ "Зовнішні інтеграції".

### 11.6 Механіка таймера і відліку розкриття

Це дві незалежні фічі, обидві звані "таймер" у побуті:

**А. Таймер раунду (`Timer.tsx`)** - рахує, скільки триває поточний раунд голосування.

- `room_state`: `round_started_at`, `paused_at` (nullable), `paused_elapsed_ms` (`supabase/migrations/006_room_state_timer.sql`)
- `elapsedMs = max(0, pivot - round_started_at - paused_elapsed_ms)`, де `pivot` = момент `reveal` (заморожений `Date.now()` в момент переходу `phase → 'revealed'`), або `paused_at` якщо на паузі, або живий `now` (тік раз/сек)
- **Контролі** (`reset`/`pause`/`resume`/`±30s`) - тільки `showControls = canControl && phase==='voting'`, `canControl={isModerator}` у `[slug].tsx`
  - `reset` - повний рестарт (`round_started_at=now()`, скидає паузу)
  - `pause`/`resume` - `resume` додає тривалість паузи, що щойно закінчилась, до `paused_elapsed_ms`
  - `±30s` (`adjustTimer`) - зсуває `round_started_at`; для "+30s" зсув затиснутий (`min(cap, ...)`), щоб не пересунути старт у майбутнє
- **Ліміт 1 година** (`ROUND_TIMER_CAP_MS` у `app/utils/timerAlarm.ts`) - показаний час не росте понад 1 год, під час `voting` текст стає «Таймер зупинено після 1h 0m 0s», сигнал далі не спрацьовує. За `round_history` (травень-жовтень 2026) 92% раундів коротші за 45 хв, а довші за годину - здебільшого кімнати, залишені на ніч чи дні після рефайнменту. Коли команда повертається, тобто `onlineCount` зростає й перевищує 1, `[slug].tsx` при `isRoundTimerStale()` викликає `resetTimer(round_started_at)` і відлік починається з нуля; один учасник у кімнаті бачить зупинений таймер, а інші зміни `room_state` (Pause, ±30s, налаштування сигналу) скидання не запускають. Запис іде лише за незмінного `round_started_at` і `phase = 'voting'` (compare-and-set), тож кілька клієнтів одночасно, ручний Reset/±30s і reveal між перевіркою й записом не перезаписуються. Пауза в ліміт не рахується
- Якщо `reveal()` стається під час паузи - `paused_elapsed_ms` домотується до моменту reveal, і показана тривалість коректно заморожується; `Timer.tsx` у фазі `revealed` бере `min(revealedAt, paused_at)`, тож тривалість не стрибає на час простою
- **Сигнал раунду (будильник)** - шестерня зліва в хедері віджета (лише для модератора, `canControl`) розгортає inline-налаштування: «Сигнал через N хв» (3-20, дефолт 5; Enter фіксує значення й знімає фокус) і дзвіночок mute (звук за замовчуванням увімкнений). Налаштування спільні для кімнати - `room_state.alarm_minutes` / `alarm_muted` (міграція `018`, `null` = 5 хв і звук увімкнено), пише `roomStore.setAlarm()`; хелпери й синтез дзвінка - `app/utils/timerAlarm.ts`. Сигнал бачать і чують усі учасники
  - Коли під час `voting` `elapsedMs` перетинає N, 2N чи 3N хвилин, увесь віджет блимає (`timer-alarm-blink`) і грає синтезований Web Audio дзвінок, не залежний від `sp-volume`: 1, 2 і 3 «дзеньки» відповідно, стільки ж блимань (`ALARM_MAX_BEEPS`). Від 4N сигналу немає. Таймер не зупиняється: він фіксує, скільки тривало обговорення задачі, тож сигнал лише нагадує про час
  - Ручна пауза зсуває наступний сигнал на свою тривалість; reveal і новий раунд працюють як звичайно, `round_history` пишеться так само
  - Спрацьовує лише на перетині порогу: після reload зі вже пройденим порогом сигналу немає; на паузі й після reveal не спрацьовує

**Б. Відлік перед розкриттям (hold-to-start, `CardsArea.tsx` + `app/hooks/useCountdown.ts`)** - опційний "хайп"-відлік із звуком перед тим, як модератор розкриє оцінки.

- 3 режими (іконки в `.mui-icon-group`): **без звуку** (мовчазний фолбек 10с), **зі звуком** (`countdown-dry.mp3`, тривалість = довжина файлу), **з атмосферою** (спершу `please-vote.mp3`, після його завершення - `countdown-wet.mp3`)
- **Активація - утримання 1.4с** (`pointerdown`/`keydown Enter-Space`), не коротке натискання (концепцію "коротким натисканням обрати режим за замовчуванням" прибрано в цій сесії). Скасовується на `pointerup`/`pointerleave`/`blur`, прив'язане до конкретного режиму, щоб втрата фокусу від сусідньої кнопки не скасовувала чуже утримання
- Тонкий SVG-ореол навколо кнопки заповнюється синхронно з утриманням (`stroke-dashoffset`-transition = `HOLD_MS`)
- По завершенню утримання: `onStartCountdown(mode)` → `broadcastCountdownStart` шле `{initiatorId, mode}` у `countdown:<roomId>` broadcast (`self:true`) → **усі** клієнти (включно з ініціатором) запускають свій локальний `useCountdown().startCountdown(mode, ...)`, синхронізовано звуковим файлом/фолбек-таймером
- Лише колбек ініціатора викликає `roomStore.reveal()`, коли відлік природно завершується
- Звук `decision-sound` грає при кожному reveal з консенсусом (перехід `voting → revealed`), незалежно від режиму countdown; у режимі "з атмосферою" по завершенню грає `ambience.mp3`, якщо консенсусу немає. Гучність усіх звуків керується слайдером у шапці (`sp-volume`)
- Поки відлік триває, рамка `.mui-icon-group` не зникає - кнопки всередині заміняються центрованим лічильником; `revealPending`-прапорець ховає кнопки ще трохи довше, поки `phase` фактично не перейде в `'revealed'` (закриває гонку між локальним таймером і realtime round-trip)
- Увесь блок - тільки для модератора (§11.1)

### 11.7 Goal Clarity Score (`goal_clarity` пресет)

Окремий пресет для health-check питання "Наскільки чітко я розумію Sprint Goals?", а не для оцінки story points.

**Картки** - фіксована шкала `1,2,3,4,5` (`cards === defaultActive`, без `?`/`☕`/toggle - як `boolean`).

**Фіксоване питання** - `DeckPreset.defaultQuestion` (нове опційне поле в `app/utils/cardDecks.ts`, на відміну від moderator-typed `poll_question` у `voting`/`vote_question`). `setDeckPreset()` пише `poll_question: preset.defaultQuestion ?? null` - той самий `room_state.poll_question`/UI-шлях показу питання (`CardsArea.tsx`/`ResultsArea.tsx`), що й у poll-колод, але автоматично заповнений і не редагується голосуванням (лишається, доки моделятор не зміне пресет). `CardsArea.tsx` показує заголовок питання за самим фактом `pollQuestion` (`!!pollQuestion`), не лише для `pollMode`/`voteQuestionMode`.

**Не poll-колода** - `isPollPreset()` (`roundStats.ts`) навмисно НЕ включає `goal_clarity`: голосування/reveal/celebration/consensus/alignment-badge (`AlignmentCard`) працюють як для звичайного числового пресету. `isNumericPreset()` - включає, тож раунди потрапляють у `HistoryModal`/`AlignmentTrendsModal`/`room-json.mts` API нарівні зі scrum/fibonacci/hours (той самий `alignmentScore` - 0-100 spread-consensus, шкало-агностичний).

**Score circle після reveal** (`ResultsArea.tsx`, prop `goalClarityScore`) - замість PieChart/per-card average (пиріг зі "1,2,3,4,5" не інформативний для Likert-шкали) - кольорове коло з "сирим" середнім (`averageOf(votes)`, той самий `(сума голосів)/(кількість)`, напр. 6 учасників `3,4,5,4,5,4` → `25/6 = 4.2`):
- `> 3.5` - зелений `#43a047`
- `2.5 ≤ x ≤ 3.5` - жовтий `#fbc02d`
- `< 2.5` - червоний `#e64a19`

Пороги `3.5` / `2.5` - продуктове рішення власника, а не похідна з даних; у коді вони живуть як
`GOAL_CLARITY_THRESHOLDS` (`app/utils/cardDecks.ts`) поруч із пресетом, і зсув межі означає зміну саме там.

При результаті `≤ 3.5` - підказка `results.goalClarityHint` ("переформулювати Sprint Goal або критерії DoD"). Той самий кольоровий triplet, що й `alignmentLevel`/`levelColor` у `AlignmentTrendsModal.tsx`.

### 11.8 Слот-машина (`SlotMachine.tsx`)

Лівий віджет кімнати перемикається кнопкою в хедері блоку (Timer ↔ SlotMachine), вибір - у `sp-side-widget` (`timer | slot`).

**Механіка** - 3 барабани, зважена випадковість (`utils/slotMachine.ts`; символи - tabler icon-id у `SLOT_SYMBOL_WEIGHTS`, рендеряться через `<AppIcon>`), 3 спіни на гравця за раунд, у `PO`/`SM` - 5 (`spinsPerRound`, скидаються за `round_started_at`). Джекпот = 3 однакові символи.

**Гейтинг спіну** - `canSpinSlot` (`[slug].tsx`, рахується в рендері з `roleTagForShields`): для `PO`/`SM` завжди `true`; для решти ролей - лише коли `phase==='voting'`, гравець уже проголосував і є хоча б один, хто ще не проголосував. Слот - заняття "поки чекаєш інших", не альтернатива голосуванню. `SlotMachine.tsx` приймає `canSpin` поруч зі `spinsLeft` і показує `slot.voteFirst` (1.5с, без власної анімації), коли `spinsLeft > 0`, але `canSpin === false`.

**Jam-анімація** - кнопка спіну лишається клікабельною при `canSpin === false` (`disabled` реагує тільки на `spinning`/`spinsLeft<=0`): клік запускає `triggerJam()` замість спіну - `.slot-window.is-jammed` на 400мс, `@keyframes slot-jam` сіпає `.slot-strip` на кілька px (стагер `animation-delay` по барабанах), імітуючи заклинювання важеля.

**Трансляція стану** - хто крутить і хто виграв, видно всім через broadcast-канал `countdown:<roomId>` (не через `players`-таблицю):
- `SlotMachine.tsx` кличе `onSpin`/`onSpinEnd` навколо анімації прокрутки (`REEL_DURATIONS_MS[2]+150` ≈ 2.45с)
- `[slug].tsx` шле `slot-spin-start`/`slot-spin-end` з `{playerId}` і тримає `spinningPlayerIds: Set<string>` (safety-таймер 2.8с на випадок втраченого `spin-end`)
- `slot-win` з `{playerId}` на 1.6с виставляє `slotWinnerId`

**Індикація в `PlayerRow.tsx`** (props `isSpinningSlot`/`isSlotWinner`) - єдиний видимий ефект джекпоту, без банера чи локального підсвічування самого слота. Кубик (`font-size: 1.125rem`, трохи менший за іконку модератора поруч) сидить у рядку з іменем за тим самим `AppTooltip`-патерном, що й `app:moderator` - колонка статусу голосу лишається незайманою. Кубик не обертається: поки триває спін, кожні 120мс перемикається грань (`tabler:dice-1`…`dice-6`, `DICE_FACES`/`diceFaceIndex`), імітуючи котіння в чашці; далі повертається дефолтна `dice-5`. При виграші ім'я і кубик разом блимають `.win-blink` (`@keyframes win-blink`, `animation-iteration-count: 3`).

### 11.9 Кола результатів і когорти (`resultCohorts.ts`)

Після reveal `ResultsArea.tsx` малює окреме коло (PieChart + середнє) на кожну видиму когорту з
голосами. Порядок `ROLE_COHORTS`: DEV, BE, FE, SRE, QA, GQA, AQA, PO, SM. `cohortForShields()` бере сиру
роль; QA, GQA й AQA мають окремі кола. Гравці без ролі й ті, хто вийшов, рахуються як DEV.

- **Кола:** `PieChart.tsx` використовує ECharts pie з `SVGRenderer` і явним `{ renderer: "svg" }`,
  завантажується через `lazy()` у `ResultsArea`. Усі кола однакової ширини до 240 px й однаково
  звужуються; один голос дає суцільне коло з підписом карти, кілька - сектори з підписами й тією самою
  палітрою. `<ROLE>: <середнє>` видно одразу поза графіком. Під час завантаження чанка або його збою
  лишається порожнє місце розміру кола без екранної помилки; ECharts не входить в entry-чанк.
- **Налаштування:** модератор у `ConfigureCardDeckModal` перемикає чіпи DEV/BE/FE/SRE у рядку
  «Показувати результати» (той самий Save, що й колода). QA/GQA/AQA/PO/SM - завжди увімкнені заблоковані
  чіпи (`is-locked`) з підказкою, що ці ролі завжди показуються окремими колами. Для `voting`,
  `vote_question`, `goal_clarity` чіпи не показуються; ці колоди зберігають бульбашки або бал ясності.
- **DEV як загальне коло** (`resultCohortFor()`): якщо DEV увімкнено, увімкнені BE/FE/SRE мають окремі
  кола, а вимкнені зливаються в DEV. Якщо DEV вимкнено, його голоси й голоси вимкнених BE/FE/SRE
  приховані. QA/GQA/AQA/PO/SM завжди мають власні кола.
- **Збереження:** `room_state.result_cohorts text[]` (міграція `017`) і check-констрейнт на
  `DEV/BE/FE/SRE/QA` незмінні. `null` = DEV/BE/FE/SRE, `[]` = жодного з них. `normalizeCohorts()` читає й
  ігнорує старе `QA`, повертає впорядковану підмножину чотирьох чіпів; нове збереження пише лише її. До
  накату `017` вибір не зберігається (помилка в консоль), діє дефолт.
- **Кастомні ролі:** поза колами й рольовими трендами, навіть якщо кастомна назва збігається зі
  стандартною. Якщо голосували лише кастомні ролі, показується одне загальне коло з усіх голосів. Якщо всі
  голоси когорт приховані чіпами, кіл і салюту немає.
- **Підсвітка в списку гравців:** прихований голос DEV або вимкненої BE/FE/SRE робить `RoleBadge` у
  `PlayerRow` червоним (`is-excluded`), tooltip додає «голос не показується в результатах»
  (`hiddenVotePlayerIds` у `[slug].tsx`).
- **Історія, тренди, головна й нові поля API:** беруть сиру роль незалежно від чіпів (§11.3-11.4);
  legacy-контракт API для agilecharts - `netlify/AGENTS.md`.
- **Консенсус:** `shouldCelebrate(votes, groups)` запускає салют і decision-sound, якщо хоча б одне
  видиме коло має ≥ 2 голоси й одну оцінку. Це стосується PO/SM; приховані голоси не рахуються.
- **Узгодженість на екрані результатів** (`AlignmentCard`) рахується по видимих колах.
- **Попередній раунд** (`lastRound` snapshot) зберігає підписані групи на момент reveal.

### 11.10 Фон кімнати (`RoomBackgroundModal.tsx`)

Авторизований модератор задає фонове зображення кімнати; його бачать усі учасники, оновлення приходить через Realtime-канал `rooms:<roomId>`.

- **Модалка:** пункт «Фон кімнати» в меню хедера. Вибір JPG/PNG/WebP до 10 МБ → рамка 16:9, у якій картинку можна тягнути (pointer events), масштабувати повзунком 1-3× або колесом, з клавіатури - стрілки та `+`/`-`. Картинка завжди покриває рамку (`clampFraming`). Повзунок «Непрозорість» (10-100%, дефолт 65%) показує результат одразу в прев'ю і зберігається окремо, без перезаливки картинки (`setBackgroundOpacity`). «Прибрати фон» знімає поточний фон
- **Кадрування:** `framingSourceRect()` (`app/utils/backgroundImage.ts`) перераховує видиму частину рамки в пікселі оригіналу; `encodeBackground()` ріже її з оригінального `ImageBitmap` у WebP (якість 0.8) розміром до 1920×1080 без апскейлу. Декодування й WebP-кодування спільні з аватарками (`imageEncoding.ts`)
- **Збереження:** Storage bucket `room-backgrounds`, фіксований об'єкт `<room_id>/background.webp` (upsert, без сиріт), далі `rooms.background_url` + `background_updated_at` (кеш-інвалідація `?v=`). Зняття фону спершу пише `background_url: null`, файл видаляється best-effort. Міграція `016`; без неї аплоад падає (`Bucket not found`), а кімнати відкриваються як звичайно (`resolveRoom` читає `select('*')`)
- **Рендер:** inline `background-image` на корені сторінки кімнати - тінт `backgroundTint(opacity)` = `color-mix(var(--bg-app) (1 - opacity))` поверх картинки, `cover`, `fixed`. `backgroundDisplayUrl()` пропускає лише шлях за regex `^[A-Za-z0-9-]+/background\.webp$`, бо значення йде в CSS `url()`, а `rooms.id` може вставити будь-хто
- **Доступ:** фон міняє, замінює й знімає будь-який авторизований модератор (`isModerator && user`); власника фону немає (міграція `020`). На сервері Storage-політики пускають запис, оновлення й видалення об'єкта будь-якому залогіненому користувачу, а тригер `rooms_guard_background` не дає анонімам змінити `background_url`, `background_opacity`, `background_updated_at` чи `background_owner_id`. Модераторство сервер не перевіряє: `players.is_moderator` пише будь-хто, як і для решти модераторських дій. Колонка `background_owner_id` лишилась лише для сумісності зі старими клієнтами
