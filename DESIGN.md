# DESIGN.md — Story Point Poker Room

Аналіз дизайн-системи сторінки `examples/room.html` (захоплено з `https://app.storypoint.poker/nG8AOnjC`).

---

## 1. Стек і архітектура UI

- **Framework:** React + **Material UI 5** (Emotion CSS-in-JS, `MuiPaper-root`, `MuiAppBar-*`, `MuiCard-root`, `MuiMenu-paper` тощо)
- **Дизайн-мова:** Material Design 2 (a не M3) — класичні `elevation 0..24`, прямокутні карточки з рад. 4–7px, тіні «Material shadow stack»
- **Тема:** автоматична через `prefers-color-scheme` (немає UI-перемикача — повністю системна)
- **Іконки:** Material Symbols (виключно SVG, через `@mui/icons-material`)
- **Аватари:** [DiceBear `bottts` 7.x](https://api.dicebear.com/7.x/bottts) — згенеровані за `seed = playerName`
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

#### Light theme — surfaces & text
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

#### Dark theme — surfaces & text
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

Базовий розмір — `16px`, шкала Material:

| Роль | Розмір | Вага | Приклад |
|---|---|---|---|
| `h1` | `2.9991rem` (~48px) | 700 | — |
| `h2` | `2.7849rem` (~44px) | 700 | — |
| `h3` | `2.5707rem` (~41px) | 700 | — |
| `h4` | `2rem` | 700 | — |
| `h5` | `1.5rem` | 700 | значення на картках голосування |
| `h6` | `1.25rem` | 600 | заголовок «Players», «Story Point Poker» |
| `subtitle1` | `1.125rem` | 500 | — |
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
- Контейнер з логотипом (h6, weight 600) ліворуч, праворуч — текст username + IconButton з PersonIcon

### 4.2 Players Card
- `MuiPaper-elevation3`, рад. `5px`
- Header: `#455a64` фон, білий h6 «Players», center, padding `8px 16px`
- Список — `<List>` з рядками: avatar + name + status icons + 3-dot menu (тільки для current user)
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
- Спеціальні значення: `?` (unknown estimate), `☕` (coffee break) — як емоджі (1.5rem)

### 4.4 Player row (in Players list)
- `<ListItem>` з:
  - Avatar (round, 40 × 40, DiceBear bottts)
  - Primary text (name) — `body1` 400; **bold 500** для current user
  - Trailing — статус-іконки (16px, opacity 0.54) + 3-dot IconButton (тільки своя)

### 4.5 Avatar Menu (top-right)
- `MuiPopover` + `MuiMenu-paper`, `elevation 8`
- Опції: `Sign In`, `Sign Up` (для гостя)
- Іконки 24px зліва від тексту

### 4.6 Player context menu (3-dot)
- Те саме `MuiMenu-paper`, опції: **Is Moderator** / **Is Observer** (з Switch), **Rename Player**, **Leave Room**
- Switch — стандартний MUI з primary тремоном

---

## 5. Іконографіка

Усі іконки — **Material Symbols / Icons** (SVG, viewBox 24×24):

| Іконка | aria-label | Призначення |
|---|---|---|
| `SportsEsports` | — | Геймпад біля гравця-«bot» (io) |
| `WifiOff` | `inactive` | Гравець офлайн |
| `Schedule` (clock) | `player deciding` | Гравець ще обирає |
| `MilitaryTech` / shield | `moderator` | Модератор кімнати |
| `MoreVert` | — | 3-dot меню гравця |
| `AccountCircle` | `account of current user` | Avatar IconButton в AppBar |

**Жодних емоджі замість іконок** — структурні елементи виключно SVG. Емоджі (`☕`) використовуються лише як **семантичне значення** на vote card.

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

Захоплена розмітка — **desktop layout** (1440 × 900). На мобільних, ймовірно:
- AppBar залишається sticky
- Players sidebar схлопується в expandable панель або bottom sheet
- Vote cards перебудовуються в 3 колонки

> ⚠️ Захоплена тільки одна точка зору; mobile-варіант не верифіковано.

---

## 8. Анти-патерни / зауваги

- ❌ **Немає UI-перемикача теми** — користувач залежить від системних налаштувань. UX-кейс «хочу темну тему вдень» не покритий
- ❌ **Status icons без tooltip** на player row — `aria-label` є, але hover-tooltip не показує сенс іконки користувачу-без-screen-reader
- ❌ **Контраст vote card в light:** значення `rgb(97,97,97)` на фоні `#f5f5f5` — контраст ~5.7:1 (OK для AA, але не AAA)
- ⚠️ **Material Design 2** замість M3 — виглядає трохи застаріло (плоскі тіні, прямі углы). Сучасніший вигляд дав би перехід на MD3 (динамічна палітра, surface tint, ширші радіуси `12–16px`)
- ⚠️ **DiceBear аватари** генеруються через зовнішнє API на кожен render — варто кешувати або генерувати на клієнті (`@dicebear/core`)

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
- Перейти на MD3 / shadcn/ui — отримати кращу типографіку, surface tint, dynamic theming
- Додати свій theme-toggle (зберігати в `localStorage`)
- Додати tooltip на статус-іконки гравця
- Анімований transition між темами (`transition: background 200ms ease, color 200ms ease`)
- Фіксовані values голосування винести в config (зараз — Fibonacci `1, 2, 3, 5, 8, 13, 20, ?, ☕`)
