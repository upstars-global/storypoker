# Auth & Account

- Status: Partial
- Priority: P1
- Ініційовано: 2026-05 (Iter 2)
- Last reviewed: 2026-07-17

## Навіщо

Базова авторизація є, але акаунт лишається неповним: не можна змінити email чи
display name, а критичні дії гейтяться лише на клієнті.

## Очікуваний результат

Повноцінний акаунт: керування власними даними і серверне підтвердження прав
модератора.

## Обсяг

Зроблено:

- Sign Up з підтвердженням email, Sign In + persistent session, скидання пароля.
- Прив'язка гри до акаунту (`playersStore.linkUser` → `players.user_id`).
- Профілі: `user_profiles` (`avatar_style` / `avatar_seed`) + `UserSettingsModal`.

Лишилось:

- OAuth provider (Google / GitHub) - опційно.
- Зміна email і display name на акаунті (зараз - лише пароль).
- Захист критичних дій (Reveal, Configure Card Deck) тільки для авторизованих
  модераторів.

## Залежності

- Серверний гейтинг залежить від [RLS та авторизації мутацій](rls-security.md).

## Критерії завершення

- Користувач змінює email і display name з UI.
- Reveal і Configure Card Deck неможливі без відповідних прав на боці БД.

## Наступний крок

Зміна email і display name - вона не блокована RLS-роботою.
