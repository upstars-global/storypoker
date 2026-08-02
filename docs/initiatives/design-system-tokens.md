# Design system - токени, що лишились

- Status: Partial
- Priority: P3
- Ініційовано: 2026-06 (Tailwind v4 migration)
- Last reviewed: 2026-07-17
- Related: [`DESIGN.md`](../../DESIGN.md)

## Навіщо

Tailwind v4 CSS-first (`app/assets/css/main.css`) з `@theme` / `@utility` /
`@custom-variant` уже на місці, токени color / bg / text / border / shadow /
typography зведені, більшість inline `style=` мігровано. Лишились точкові
винятки.

## Обсяг

- Accent-палітра гравців - `#00796b`, `#0288d1` тощо (~8 hex у `PlayerRow`) без
  токенів; ввести групу `--accent-*`. `--btn-md-bg: #607d8b` уже токенізовано.
- Контекстні CSS vars без utility-мапінгу (`--icon-player-color`, `--hover-bg`) -
  свідомо inline як контекстні override, рішення переглянути.
- Повторювані arbitrary values (`max-w-[1400px]`, `z-[9999]`, `h-[51px]`) -
  винести три повторювані у `@theme`; one-off layout лишити.

## Критерії завершення

- Кольори гравців беруться з `--accent-*`.
- Три повторювані arbitrary values замінені на токени.

## Наступний крок

Accent-палітра - вона дає найбільший ефект на консистентність.
