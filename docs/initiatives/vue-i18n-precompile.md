# vue-i18n precompile

- Status: Planned
- Priority: P3
- Ініційовано: 2026-05-16 (post-migration)
- Last reviewed: 2026-07-17
- Related: [spec](../superpowers/specs/2026-05-16-vue-vite-migration-design.md)

## Навіщо

Локалі компілюються в runtime. Це повільніше, збільшує bundle і дає dev-warning
`[intlify] Runtime compilation is being used`.

## Очікуваний результат

Повідомлення прекомпільовані на етапі build через
`@intlify/unplugin-vue-i18n`.

## Обсяг

- Підключити плагін, перевести `app/i18n/locales/{uk,en}.json` на precompile.
- Прибрати runtime-compilation залежність з бандла.

## Критерії завершення

- Dev-warning зникає, локалізація працює для uk і en.

## Наступний крок

Перевірити сумісність плагіна з Vite 8 / Rolldown.
