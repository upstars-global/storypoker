# Production sourcemaps

- Status: Planned
- Priority: P2
- Ініційовано: 2026-05-16 (post-migration)
- Last reviewed: 2026-07-17

## Навіщо

`vite.config.ts` тримає `build: { sourcemap: true }` для прода: це розкриває
вихідний код і додає ~3.6 MB у `dist/`.

## Очікуваний результат

Sourcemaps доступні для діагностики, але не публікуються з продом.

## Обсяг

- Лишити sourcemaps тільки для stage, або вантажити їх в error-tracker і не
  деплоїти у `dist/`.

## Критерії завершення

- `dist/` прод-збірки не містить `.map`-файлів.

## Наступний крок

Визначити, чи потрібен error-tracker, - від цього залежить варіант рішення.
