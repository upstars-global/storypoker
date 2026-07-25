# DESIGN.md - Story Point Poker Room

Аналіз дизайн-системи сторінки `examples/room.html` (захоплено з `https://app.storypoint.poker/nG8AOnjC`).

---

## 1. Стек і архітектура UI

- **Framework:** React + **Material UI 5** (Emotion CSS-in-JS, `MuiPaper-root`, `MuiAppBar-*`, `MuiCard-root`, `MuiMenu-paper` тощо)
- **Дизайн-мова:** Material Design 2 (a не M3) - класичні `elevation 0..24`, прямокутні карточки з рад. 4–7px, тіні «Material shadow stack»
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
  - Avatar (round, 40 × 40, DiceBear bottts)
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
- ⚠️ **Material Design 2** замість M3 - виглядає трохи застаріло (плоскі тіні, прямі углы). Сучасніший вигляд дав би перехід на MD3 (динамічна палітра, surface tint, ширші радіуси `12–16px`)
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

Ролі визначаються в `app/pages/[slug].vue:90-91`:
```js
const isModerator = computed(() => currentPlayer.value?.is_moderator ?? false)
const isAuthorizedModerator = computed(() => isModerator.value && !!user.value)
```

**Модератор (`is_moderator`, авторизація не потрібна)** - увесь нижній блок кнопок у `CardsArea.vue` (рядок 274, `v-if="isModerator"`) плюс кілька контролів поза ним:

| Дія | Компонент / handler |
|---|---|
| Розкрити оцінки (reveal) | `CardsArea.vue` reveal-button → `roomStore.reveal()` |
| Скинути голоси (reset) | `CardsArea.vue` reset-button → `roomStore.resetVotes()` |
| Показати попередній раунд (undo) | `CardsArea.vue` undo-button → `showLastRound = !showLastRound` |
| Запустити відлік розкриття | `CardsArea.vue` hold-to-start (силент/зі звуком/з атмосферою) → `broadcastCountdownStart` - деталі §11.6 |
| Почати новий раунд | `ResultsArea.vue`, `:show-new-round="isModerator"` → `roomStore.startNewRound()` |
| Налаштувати опитування (`voting`/`vote_question`) | `CardsArea.vue`, `v-else-if="... && isModerator"` → `setPollQuestion`/`startVoteQuestion` |
| Налаштувати колоду карт | `AppHeader.vue` меню → `ConfigureCardDeckModal` |
| Виключити гравця (kick) | `PlayerRow.vue`, `v-else-if="currentUserIsModerator"` → `playersStore.kick` |
| Керування таймером (reset/pause/resume/±30s) | `Timer.vue`, `canControl = isModerator` (саме `isModerator`, **не** `isAuthorizedModerator`) |

**Авторизований модератор (`isModerator && user`)** - додатково над списком вище:

| Дія | Компонент / handler |
|---|---|
| Перейменувати кімнату / встановити slug | `AppHeader.vue`, вкладене `v-if="user"` усередині `v-if="isModerator"` → `roomStore.setRoomName(name, slug)` |
| Перейменувати іншого гравця + його shields | `PlayerRow.vue`, `v-if="currentUserIsAuthorizedModerator"` (вкладено в `currentUserIsModerator`-блок) → `PlayerEditModal` |

### 11.2 Функціонал гравця

Доступно будь-якому учаснику кімнати, незалежно від `is_moderator`:

- Голосувати за активну картку (`CardsArea.vue`, картки не гейтяться роллю - лише `canVote`)
- Перейменувати себе / встановити власні shields (`PlayerRow.vue`, `v-if="isOwn"` → `PlayerEditModal`)
- Вийти з кімнати (`PlayerRow.vue`, `v-if="isOwn"` → soft-delete `left_at`)
- **Перемкнути власний прапорець модератора** (`PlayerRow.vue:273-297`, гейт тільки `isOwn`, без перевірки `currentUserIsModerator`) - самопризначення доступне будь-кому, не тільки поточному модератору; тогл ЧУЖОГО прапорця модератора в UI відсутній взагалі
- Переглянути історію раундів / графік узгодженості (`AppHeader.vue`, гейт лише `v-if="roomName"` - тобто кімната має назву, роль не перевіряється)
- Перемкнути тему/палітру/мову, бічний віджет Timer ↔ SlotMachine
- Грати в слот-машину (3 спіни за раунд, без ролевого обмеження)

### 11.3 Графік узгодженості та тренди (`AlignmentTrendsModal.vue`)

**Джерело даних:** один запит `roomStore.fetchHistory()` при `onMounted` - увесь `round_history` кімнати (без пагінації/дат-фільтра на рівні БД). Раунди з нечисловою колодою (`voting`/`vote_question`, перевірка `isNumericPreset` + fallback "чи є хоч один числовий голос") відфільтровуються одразу.

**Гранулярність - один раунд = одна точка графіка.** Жодного агрегування по днях/тижнях немає: кожен запис `round_history` мапиться 1:1 у `ChartPoint {date, devAlignment, qaAlignment, deckPreset}` через `splitRoundAlignment(round, shieldsMap)`.

> ⚠️ `shieldsMap` будується з **поточних** shields гравців (`visiblePlayers` на момент відкриття модалки), не з тих, що були на момент голосування. Якщо гравець змінив QA/DEV роль пізніше - стара точка на графіку перерахується під нову роль.

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

DEV/QA рахуються окремо (`splitRoundAlignment` ділить голоси по `isQaPlayer(shields)`), кожен - той самий `alignmentScore` над своєю підмножиною.

**Агрегати поверх відфільтрованих точок:**
- Поточний бал / середній бал - останнє непусте значення / середнє арифметичне
- Тренд - тільки якщо ≥4 точок: `pct = (середнє нової половини − середнє старої половини) / стара половина × 100`; `up` якщо `pct > 1`, `down` якщо `< -1`, інакше `stable`

**Бейджі рівня (`alignmentLevel`/`levelColor`):** `Perfect ≥90` (зелений), `High ≥75` (зелений), `Medium ≥40` (жовтий), `Low <40` (червоний).

> ⚠️ Горизонтальні пунктирні лінії-орієнтири на самому графіку (`REF_LINES`: 100/75/50/25, підписані як `100%`/`75%`/`50%`/`25%`) - це просто візуальні мітки сітки, їхні позиції **не збігаються точно** з порогами `alignmentLevel` (напр. лінія на 50 не збігається з текстовим порогом "Medium", який починається з 40).

**Рушій графіка - ECharts** (`echarts` + `vue-echarts`, з 2026-07-25; до того - ручний SVG). Підключені лише потрібні модулі (`echarts/core` + `CanvasRenderer`/`LineChart`/`GridComponent`/`TooltipComponent`/`DataZoomComponent`/`MarkLineComponent`, `use([...])`) заради розміру бандла. `<VChart :option="chartOption" autoresize>` - `chartOption` computed, що будує `xAxis`/`yAxis`/`series`/`tooltip`/`dataZoom` з `points`.

**Ось X** - `type: 'category'` з `boundaryGap: false`, дані - `weekLabel(date)` (ISO-тиждень, `w12`) для кожної точки; категорійна вісь сама розподіляє точки рівномірно за порядком (а не пропорційно реальному часу), тому близькі в часі раунди не накладаються, а перша/остання точка лежать точно на краях графіка. Лінія - `smooth: true` (вбудоване згладжування ECharts, без ручної Catmull-Rom).

**dataZoom-таймлайн знизу** - слайдер (`type: 'slider'`) під графіком з міні-превʼю форми лінії (`dataBackground`) + `type: 'inside'` для zoom/pan колесом миші чи pinch; дозволяє наблизити довільний відрізок часового вікна, обраного кнопками `30D/90D/6M/1Y`, не змінюючи сам фільтр.

**Reference lines** (100/75/50/25%) - окрема невидима серія `__refLines` (`data: []`, `silent: true`, `tooltip.show: false`) з `markLine`, завжди в `series` незалежно від toggle DEV/QA, щоб орієнтири не зникали разом із лінією.

**Tooltip** - `trigger: 'item'`, **`triggerOn: 'click'`** (клік на крапку показує і "пришпилює" tooltip; ховається лише повторним кліком чи по порожньому місцю графіка - на відміну від строгого hover, це дає час дотягнутись курсором до кнопки "Деталі", особливо на крайніх точках), `enterable: true` (можна навести на сам tooltip не закривши його). Контент - `formatter()` повертає HTML: лейбл серії + значення (`%`), дата, кнопка-закриття `×` (`data-close-tooltip`) і клікабельний рядок `trends.viewDetails` (`data-view-details`, `data-index`). Лейбл серії - `series.name`: `QA` лишається `QA`, DEV-когорта (не-QA гравці) підписана `DEV/FE/BE`, щоб не читалось як "тільки роль DEV" (колір ліній не змінювався: жовта `#ffa726` - QA, бірюзова `#26a69a` - DEV/FE/BE).

**Round snapshot** - клік на `data-view-details` у tooltip ловиться делегованим `document`-listener'ом (ECharts рендерить tooltip у `document.body`, не всередині компонента), звідти `points.value[dataIndex].round` → `selectedRound` → `RoundSnapshotModal.vue` (вкладена `<dialog>` поверх поточної модалки) зі списком `{ім'я, голос}` усіх гравців того раунду (`round_history.votes`, повний знімок, не лише агреговані `counts`). Поруч з іменем - `RoleBadge` з тегом ролі (`roleTagForShields(shieldsMap.get(player_id))`, той самий `shieldsMap` з **поточних** shields, що й для DEV/QA split вище - те саме застереження про неактуальність ролі на момент голосування).

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
3. Завжди виставляє `room_state.phase='revealed'`; якщо таймер був на паузі - заморожує `paused_elapsed_ms` (див. §11.6)
4. **Рядок `round_history` пишеться, тільки коли `votes.length >= 2`** - одноголосні/безголосі reveal-и в історію не потрапляють
5. `active_cards`/`deck_preset` беруться зі стану кімнати на момент reveal - тому картка в історії лишається правильною, навіть якщо колоду згодом змінили

`?` і `☕` рахуються як повноцінні голоси для запису, але виключаються з `alignmentScore`/`averageOf` (нечислові). `name` у snapshot дублюється, щоб історія лишалась читабельною після rename/kick/leave гравця.

**`HistoryModal.vue`** читає весь `fetchHistory()`, групує по рік/квартал, фільтрує по колоді; для кожного раунду показує `summarizeRound()` (`app/utils/roundStats.ts`): `average` (зважене середнє числових голосів, `.toFixed(1)`), `alignment` (`alignmentScore`), `counts` (кількість голосів по кожному значенню), `voterCount`. Для poll-колод (`voting`/`vote_question`) `average`/`alignment` - завжди `null`.

### 11.5 Export (видалено)

Ручний CSV-експорт з `HistoryModal.vue` (кнопка на колоду, обмежена `scrum`/`fibonacci`) видалено - його роль тепер виконує публічний JSON API `netlify/functions/room-json.mts` (`GET /api/<room>.json` і `GET /api/teams.json`), яким живиться `agilecharts`. Деталі - AGENTS.md, розділ "Зовнішні інтеграції".

### 11.6 Механіка таймера і відліку розкриття

Це дві незалежні фічі, обидві звані "таймер" у побуті:

**А. Таймер раунду (`Timer.vue`)** - рахує, скільки триває поточний раунд голосування.

- `room_state`: `round_started_at`, `paused_at` (nullable), `paused_elapsed_ms` (`supabase/migrations/006_room_state_timer.sql`)
- `elapsedMs = max(0, pivot − round_started_at − paused_elapsed_ms)`, де `pivot` = момент `reveal` (заморожений `Date.now()` в момент переходу `phase → 'revealed'`), або `paused_at` якщо на паузі, або живий `now` (тік раз/сек)
- **Контролі** (`reset`/`pause`/`resume`/`±30s`) - тільки `showControls = canControl && phase==='voting'`, `canControl = isModerator` (рядок 581 `[slug].vue`)
  - `reset` - повний рестарт (`round_started_at=now()`, скидає паузу)
  - `pause`/`resume` - `resume` додає тривалість паузи, що щойно закінчилась, до `paused_elapsed_ms`
  - `±30s` (`adjustTimer`) - зсуває `round_started_at`; для "+30s" зсув затиснутий (`min(cap, ...)`), щоб не пересунути старт у майбутнє
- Якщо `reveal()` стається під час паузи - `paused_elapsed_ms` домотується до моменту reveal, і показана тривалість коректно заморожується

**Б. Відлік перед розкриттям (hold-to-start, `CardsArea.vue` + `useCountdown.ts`)** - опційний "хайп"-відлік із звуком перед тим, як модератор розкриє оцінки.

- 3 режими (іконки в `.mui-icon-group`): **без звуку** (мовчазний фолбек 10с), **зі звуком** (`countdown-dry.mp3`, тривалість = довжина файлу), **з атмосферою** (спершу `please-vote.mp3`, після його завершення - `countdown-wet.mp3`)
- **Активація - утримання 1.4с** (`pointerdown`/`keydown Enter-Space`), не коротке натискання (концепцію "коротким натисканням обрати режим за замовчуванням" прибрано в цій сесії). Скасовується на `pointerup`/`pointerleave`/`blur`, прив'язане до конкретного режиму, щоб втрата фокусу від сусідньої кнопки не скасовувала чуже утримання
- Тонкий SVG-ореол навколо кнопки заповнюється синхронно з утриманням (`stroke-dashoffset`-transition = `HOLD_MS`)
- По завершенню утримання: `emit('startCountdown', mode)` → `broadcastCountdownStart` шле `{initiatorId, mode}` у `countdown:<roomId>` broadcast (`self:true`) → **усі** клієнти (включно з ініціатором) запускають свій локальний `useCountdown().startCountdown(mode, ...)`, синхронізовано звуковим файлом/фолбек-таймером
- Лише колбек ініціатора викликає `roomStore.reveal()`, коли відлік природно завершується
- У режимі "з атмосферою" по завершенню грає `decision-sound`, якщо `isConsensus.value` (усі голоси співпадають, або DEV/QA групи одноголосні при QA-розщепленні), інакше - `ambience.mp3`. У режимах "без звуку"/"зі звуком" завершального звуку нема
- Поки відлік триває, рамка `.mui-icon-group` не зникає - кнопки всередині заміняються центрованим лічильником; `revealPending`-прапорець ховає кнопки ще трохи довше, поки `phase` фактично не перейде в `'revealed'` (закриває гонку між локальним таймером і realtime round-trip)
- Увесь блок - тільки для модератора (§11.1)
