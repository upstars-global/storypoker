# Completed initiatives

1. Status: Implemented
2. Last reviewed: 2026-07-17

A concise historical index. Detailed decisions and steps remain in the corresponding
specifications and plans in [`superpowers/`](superpowers/).

## Iter 1 - Foundation + Realtime

Rooms, hidden voting, simultaneous reveal, Supabase Realtime + Presence.

## Iter 3 - Insights & History

1. **Alignment Trends** - `AlignmentTrendsModal` with round history (alignment
   score, average, series toggle, tooltips, axis titles).
2. An **Alignment** column in Recent Rooms on the home page (`roundAlignment` +
   `avgAlignment`).
3. CSV export of round results. Removed later; `netlify/functions/room-json.mts`
   addresses the need.
4. `round_history` stores `active_cards` / `deck_preset` for the captured round
   (migration `010`).

## Vue + Vite migration

Vue 3.5 + Vite 8 (Rolldown) SPA -
[spec](superpowers/specs/2026-05-16-vue-vite-migration-design.md),
[plan](superpowers/plans/2026-05-16-vue-vite-migration.md).

## Tailwind v4 migration

Native `@tailwindcss/vite`, CSS-first `@theme` in `main.css`,
`tailwind.config.ts` removed. Remaining work is in
[design system tokens](initiatives/design-system-tokens.md).

## Icons - Iconify

`@iconify-json/ic` offline + `app:` custom collection; `<AppIcon>` +
`mapIconName()` with feature-flag remapping to lucide / rounded.

## Themes / palettes

classic / cyberdeck / matcha (light + dark), `data-palette` + `data-theme`,
inline pre-JS in `index.html`.

## Side widget

Timer ↔ SlotMachine switch (`sp-side-widget`), jackpot broadcast +
`SlotWinBanner`.

## Tooltip strategy

Interactive controls → `AppTooltip`; decorative status icons → native `title`.

## Result cohorts

Separate result circles for DEV / BE / FE / SRE / QA roles (QA = QA + GQA + AQA),
selected using the “Show results” chips in deck settings
(`room_state.result_cohorts`, migration `017`); an enabled DEV includes disabled
BE / FE / SRE, and without DEV, votes from disabled roles are hidden with a red
badge. PO / SM / custom roles are excluded from circles and trends; no role means
DEV. The SRE role was restored in RolePicker. Scrum and Fibonacci have no `0` or
cards above 21. Details: `DESIGN.md` §11.9.

## Round alarm

An alarm in the timer widget: the moderator sets a room interval of 3-20 minutes
(default 5) and mutes the bell (`room_state.alarm_*`, migration `018`); everyone
sees and hears the signal. At N, 2N and 3N minutes the widget flashes and rings
1, 2 and 3 times, respectively; thereafter the alarm is silent while the timer
continues. After 1 hour the timer stops, and when a second participant returns to
the room it starts counting from zero. Details: `DESIGN.md` §11.6.

## Room background

An authorized moderator sets the room background: JPG/PNG/WebP upload, cropping
(drag / zoom in a 16:9 frame), and client-side WebP compression to ≤ 1920×1080,
Storage bucket `room-backgrounds` + `rooms.background_url` (migration `016`),
and synchronization via Realtime. Details: `DESIGN.md` §11.10.

## App update

Open tabs automatically move to the new version after deployment. The service
worker in `prompt` mode checks for updates every 15 minutes and when returning to
the tab. The new version is applied immediately if the tab is hidden; in a
visible tab it is applied when the tab becomes hidden or after 2 minutes of user
inactivity, to avoid interrupting a reveal or countdown. If neither happens
within 30 minutes, a “A new version is available” toast appears with an update button
(`app/pwa.ts`, `useAppUpdate`). During a countdown, the update waits for it to
finish. The first release still has `skipWaiting: true` so tabs with the old
`autoUpdate` bundle reload; the next release removes it, and the new version
waits in `waiting` until the tab is ready.

## Descoped

1. **Reka UI** - replaced with custom `AppModal` / `AppTooltip` + `useClickOutside`
   to reduce the dependency surface.
