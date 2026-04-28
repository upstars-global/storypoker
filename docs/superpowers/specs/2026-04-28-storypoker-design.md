# Story Poker — Design Spec v1

## Overview

Story Poker — веб-застосунок для планінг покеру (оцінювання User Stories) з реалтайм синхронізацією між учасниками. Jamstack, без власного бекенду — Supabase як база даних і реалтайм транспорт.

## Tech Stack

- **Framework:** Nuxt 4 (Vue 3, Composition API `<script setup>`)
- **Styling:** Tailwind CSS 4
- **Realtime/DB:** Supabase (Postgres + Realtime subscriptions + Presence)
- **Auth:** Supabase Auth (email + пароль)
- **Avatars:** DiceBear Dylan (`@dicebear/core`, `@dicebear/collection`)
- **UI:** @nuxt/icon, v-wave, Google Fonts Montserrat 400/600

## Data Model

### `rooms`
```sql
id          text PRIMARY KEY   -- 8-char random ID, напр. "Ob4W3XMI"
created_at  timestamptz DEFAULT now()
```

### `room_state`
```sql
room_id      text PRIMARY KEY REFERENCES rooms(id)
phase        text DEFAULT 'voting'   -- 'voting' | 'revealed'
active_cards text[]  -- масив активних карт, напр. ['0.5','1','2','3','5','8','13','21','?','Pass','☕']
round_started_at timestamptz DEFAULT now()
```

### `players`
```sql
id           uuid PRIMARY KEY DEFAULT gen_random_uuid()
room_id      text REFERENCES rooms(id)
name         text NOT NULL
is_moderator boolean DEFAULT false
vote         text NULL    -- null = не голосував
is_online    boolean DEFAULT true
user_id      uuid NULL REFERENCES auth.users(id)  -- NULL для анонімних
created_at   timestamptz DEFAULT now()
```

Realtime підписки на таблиці `players` та `room_state` — всі зміни миттєво видно всім у кімнаті.

## localStorage

Ключ: `storypoker_session_<roomId>`  
Значення: `{ playerId: string, playerName: string }`

При вході на `/room/[slug]` — перевіряє localStorage. Якщо є збережений `playerId` для цієї кімнати, одразу підключається без форми імені.

## Pages

### `pages/index.vue` — Головна

- Заголовок: "Create a planning poker room"
- Поле імені з placeholder "Please enter your name"
- Кнопка "Create Room"
- Валідація: якщо поле порожнє — червона рамка інпуту, кімната не створюється
- При успіху: генерує 8-char ID → INSERT у `rooms` + `room_state` + `players` → зберігає в localStorage → redirect на `/room/[id]`

### `pages/room/[slug].vue` — Кімната

**При завантаженні:**
1. Перевіряє localStorage для цього `roomId`
2. Є збережений `playerId` → одразу підключається (оновлює `is_online = true`)
3. Немає → показує join-оверлей

**Join-оверлей:**
- Поле імені (мін. 1 символ)
- Кнопка "Join Room"
- INSERT нового гравця, зберігає в localStorage

**Лейаут:**
```
[Header]
[Players panel | Cards / Results area]
[Moderator Insights panel]  ← під Players, тільки для модераторів
```

## Components

### Header
- Ліворуч: "Story Point Poker" (логотип/назва)
- Праворуч: кількість гравців онлайн + іконка юзера
  - Якщо не авторизований: dropdown → Sign In / Sign Up / Configure Card Deck (якщо модератор)
  - Якщо авторизований: аватар Dylan + ім'я → dropdown → Configure Card Deck (якщо модератор) / Sign Out

### Players Panel

Список всіх гравців кімнати:
- **Онлайн гравець:** аватар Dylan (кольоровий, seed = ім'я), ім'я, іконка модератора (геймпад), статус
- **Офлайн гравець:** аватар сірий, ім'я сіре, іконка "no wifi"

Статуси в колонці справа:
- `voting` фаза: порожньо = не голосував, ✓ = проголосував (значення приховане)
- `revealed` фаза: показує числове значення голосу

**Меню `⋮` (свій рядок — всі гравці):**
- Перейменувати
- Стати модератором / Перестати бути модератором (toggle)
- Вийти з кімнати

**Меню `⋮` (чужий рядок — тільки авторизований модератор):**
- Kick Player → видаляє гравця з кімнати (DELETE з `players`)

### Cards Area (фаза `voting`)

Сітка карт: `0.5, 1, 2, 3, 5, 8, 13, 21, ?, Pass, ☕`  
(відображаються тільки активні карти з `room_state.active_cards`)

- Вибрана карта підсвічується синім
- Клік → UPDATE `players.vote`
- Кнопка "Reveal Estimates" (тільки модератор) → UPDATE `room_state.phase = 'revealed'`

### Results Area (фаза `revealed`)

- Кругова діаграма — сектори пропорційні кількості голосів за кожне значення, різні кольори
- У списку гравців видно числові значення голосів
- Кнопка "Start New Estimation Round" (тільки модератор) → скидає всі votes до NULL, phase → 'voting', оновлює `round_started_at`

### Moderator Insights Panel

Видимий тільки гравцям з `is_moderator = true`.  
Відображає: "This round started N minutes ago" (відносний час від `round_started_at`).

### Configure Card Deck Modal

Доступний тільки модераторам через меню хедера.

- Dropdown: тільки "Fibonacci scale" (перша ітерація)
- Повний пул карт шкали: `0, 0.5, 1, 2, 3, 5, 8, 13, 21, ?, Pass, ☕`
- Чекбокс біля кожної карти — увімкнути/вимкнути
- За замовчуванням активні: `0.5, 1, 2, 3, 5, 8, 13, 21, ?, Pass, ☕`
- Кнопка "Save Card Deck" → UPDATE `room_state.active_cards` → синхронізується до всіх

### Sign In / Sign Up Modal

- Поля: email + пароль
- Кнопка Sign In / Sign Up
- Supabase Auth (`supabase.auth.signInWithPassword` / `signUp`)
- Після входу: `players.user_id` оновлюється для поточного гравця

## Roles & Permissions

| Дія | Анонім | Анонім-модератор | Авториз. | Авториз.-модератор |
|---|:---:|:---:|:---:|:---:|
| Голосувати | ✓ | ✓ | ✓ | ✓ |
| Перейменувати себе | ✓ | ✓ | ✓ | ✓ |
| Стати модератором | ✓ | — | ✓ | — |
| Reveal Estimates | — | ✓ | — | ✓ |
| Start New Round | — | ✓ | — | ✓ |
| Configure Card Deck | — | ✓ | — | ✓ |
| Kick Player | — | — | — | ✓ |

## Realtime Flow

1. Гравець входить → підписується на `players` WHERE `room_id = X` та `room_state` WHERE `room_id = X`
2. Будь-яка зміна (голос, фаза, новий гравець) → Supabase надсилає UPDATE всім підписникам
3. При закритті браузера → `beforeunload` → UPDATE `is_online = false`
4. При поверненні → UPDATE `is_online = true`, відновлює старий `playerId` з localStorage

## Out of Scope (v2)

- Re-estimate кнопка
- Аналітика (Team Alignment Trends)
- OAuth (Microsoft, Google)
- Кілька шкал карт
