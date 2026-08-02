# Атомарність раунду

- Status: Planned
- Priority: P0
- Ініційовано: 2026-06-24 (аудит)
- Last reviewed: 2026-07-17

## Навіщо

`reveal()`, `startNewRound()` і create-room у `app/stores/room.ts` - окремі
не-транзакційні запити. Два модератори можуть записати два snapshots одного
раунду; create може лишити `rooms` без `room_state`.

## Очікуваний результат

Життєвий цикл раунду й створення кімнати виконуються однією транзакцією з
optimistic concurrency, а інваріанти тримає сама БД.

## Обсяг

- Postgres RPC `create_room()`, `reveal_round(expected_started_at)`,
  `start_new_round()` з транзакціями.
- DB-constraints на `phase`, `deck_preset`, довжини полів, `room_id NOT NULL`.

## Критерії завершення

- Повторний `reveal` того самого раунду не створює другий запис у `round_history`.
- Створення кімнати або повністю успішне, або не лишає осиротілих рядків.

## Наступний крок

Описати сигнатури RPC і поведінку при конфлікті `expected_started_at`.
