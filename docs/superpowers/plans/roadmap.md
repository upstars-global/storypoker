# Story Poker — Roadmap

## Iteration 1 — Foundation + Realtime Refactor ✅ DONE

**Branch:** `feat/pinia-presence` (готова до merge у `main`)
**Spec:** `docs/superpowers/specs/2026-05-04-pinia-presence-design.md`
**Plan:** `docs/superpowers/plans/2026-05-04-pinia-presence.md`

- Pinia stores: `auth`, `room`, `players`, `presence`; видалено старі composables
- Supabase Presence для online-статусу (replaced `is_online` column)
- Optimistic `castVote` з rollback і реконсиляцією через realtime
- Differential realtime updates (`applyChange(payload)` замість full refetch)
- Reconciliation refetch після `reconnecting → online`
- `ConnectionBanner` (mobile-friendly: visibility=hidden → untrack/unsubscribe)
- DB міграції 002 (drop is_online), 003 (Pass→прибрано, 0.5→1/2, 21→20)
- UI: redesign модалки Configure Card Deck (3-кол + preset dropdown), збільшені карти 180×270, restructured header menu, Recent Rooms таблиця на головній, Light theme toggle, перейменовано `Story Point Poker → Story Poker`
- Vitest suite (29 passed) для усіх stores
- Дрібні: завантаження env з `/.env/.env` + `/.env/.env.local` через `dotenv.config()` у `nuxt.config.ts`, `lastVisitedAt` у session, центровані pie chart і карти

## Iteration 2 — Auth & Account

- Доопрацювання реєстрації (Sign Up) — підтвердження email, обробка помилок, UI flow
- Доопрацювання входу (Sign In) — забута пароль, OAuth provider (опціонально), persistent session
- Прив'язка існуючої гри до акаунту після авторизації
- Профіль користувача (зміна імені/email/пароля)
- Захист критичних дій (Reveal/Configure Card Deck) тільки для авторизованих модераторів

## Iteration 3 — Insights & History

- **Alignment Trends** — стат-сторінка/модалка з історією раундів кімнати (alignment score, average points, найчастіша карта)
- **Alignment Trend** колонка у Recent Rooms таблиці на головній (зараз без колонки)
- Експорт результатів раунду (CSV/копія в clipboard)
- Постійна схема `rounds` у БД (зараз стан перезаписується при кожному новому раунді — треба зберігати історію)

> Recent Rooms (саму таблицю на головній) реалізовано в Iter 1, без колонки трендів — вона їде сюди.

## Iteration 4 — Estimation Scale

- Вибір scale-у оцінювання як окремий flow:
  - При створенні кімнати — picker (Scrum / Fibonacci / T-shirt / Custom)
  - Можливість змінити scale у активній кімнаті без втрати поточних голосів
  - Збереження кастомних scales на акаунт користувача (для повторного використання)
- Винести Configure Card Deck з модалки в окрему вкладку/розділ кімнати
