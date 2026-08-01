# Обробка помилок

- Status: Planned
- Priority: P1
- Ініційовано: 2026-06-24 (аудит)
- Last reviewed: 2026-07-17

## Навіщо

Порожні `catch {}` у `app/pages/[slug].vue` (×3) і store-методи без перевірки
`{ error }` тихо ковтають фейли rename, shields і vote - користувач бачить
успішний UI при невдалому записі.

## Очікуваний результат

Кожна мутація має явний результат: помилка видима користувачу, стан
відкочується, дія повторювана.

## Обсяг

- Typed helper для Supabase-result.
- Loading / error state у stores.
- Локалізований toast з retry.
- Rollback для всіх optimistic updates, не лише для vote.

## Критерії завершення

- Немає порожніх `catch {}` у `[slug].vue`.
- Фейл rename / shields / vote показує повідомлення і повертає попередній стан.

## Наступний крок

Ввести helper для Supabase-result і провести через нього `playersStore`.
