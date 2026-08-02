# Завершені ініціативи

- Status: Implemented
- Last reviewed: 2026-07-17

Стислий історичний індекс. Детальні рішення й кроки лишаються у відповідних
специфікаціях і планах у [`superpowers/`](superpowers/).

## Iter 1 - Foundation + Realtime

Кімнати, приховане голосування, одночасне розкриття, Supabase Realtime +
Presence.

## Iter 3 - Insights & History

- **Alignment Trends** - `AlignmentTrendsModal` з історією раундів (alignment
  score, average, series toggle, tooltips, axis titles).
- **Alignment**-колонка у Recent Rooms на головній (`roundAlignment` +
  `avgAlignment`).
- Експорт результатів раунду у CSV. Згодом видалений - потребу закриває
  `netlify/functions/room-json.mts`.
- `round_history` зберігає `active_cards` / `deck_preset` знятого раунду
  (міграція `010`).

## Vue + Vite migration

Vue 3.5 + Vite 8 (Rolldown) SPA -
[spec](superpowers/specs/2026-05-16-vue-vite-migration-design.md),
[plan](superpowers/plans/2026-05-16-vue-vite-migration.md).

## Tailwind v4 migration

Нативний `@tailwindcss/vite`, CSS-first `@theme` у `main.css`,
`tailwind.config.ts` прибрано. Залишки - у
[design system tokens](initiatives/design-system-tokens.md).

## Icons - Iconify

`@iconify-json/ic` offline + `app:` custom collection; `<AppIcon>` +
`mapIconName()` з feature-flag ремапом на lucide / rounded.

## Themes / palettes

classic / cyberdeck / matcha (light + dark), `data-palette` + `data-theme`,
inline pre-JS у `index.html`.

## Side widget

Timer ↔ SlotMachine перемикач (`sp-side-widget`), джекпот-broadcast +
`SlotWinBanner`.

## Tooltip-стратегія

Interactive контроли → `AppTooltip`; декоративні status-іконки → native `title`.

## Знято з обсягу

- **Reka UI** - замінено власними `AppModal` / `AppTooltip` + `useClickOutside`
  заради меншого dep-surface.
