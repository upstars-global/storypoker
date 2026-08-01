# Декомпозиція `[slug].vue`

- Status: Planned
- Priority: P1
- Ініційовано: 2026-06-24 (аудит)
- Last reviewed: 2026-07-17

## Навіщо

`app/pages/[slug].vue` - ~600 рядків: route resolution, session restore, п'ять
realtime-каналів, presence, snapshots, countdown, профілі і всі UI-actions в
одному компоненті.

## Очікуваний результат

Сторінка кімнати - тонкий layout поверх composables з окремими зонами
відповідальності; зміна `route.params.slug` обробляється коректно.

## Обсяг

- Виділити `useRoomSession`, `useRoomRealtime`, `useRoundSnapshot`,
  `useRoomActions`, `useCountdownBroadcast`.
- Реагувати на зміну `route.params.slug` без повного перезавантаження.

## Критерії завершення

- `[slug].vue` не тримає прямих підписок і бізнес-логіки.
- Перехід між кімнатами через роутер перепідключає канали коректно.

## Наступний крок

Почати з `useRoomRealtime` - він найбільш ізольований.
