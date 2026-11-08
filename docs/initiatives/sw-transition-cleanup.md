# Remove the transitional service worker reload

1. Status: Planned
2. Priority: P1
3. Initiated: 2026-10-24 (PR #37)
4. Last reviewed: 2026-10-24

## Why

The release from PR #37 moves the PWA from `autoUpdate` to `prompt`. The old bundle
cannot reload itself, so `vite.config.ts` temporarily retains `skipWaiting: true` and
`importScripts: ['sw-reload-clients.js']`: the new worker reloads all open tabs on
activation. While the script remains, every deployment immediately reloads tabs,
bypassing the `useAppUpdate` rules (hidden tab, idle time, countdown, reveal).

## Expected outcome

The new version is applied only according to the `useAppUpdate` rules; the worker
remains in `waiting`.

## Scope

1. Remove `skipWaiting: true` and `importScripts` from `vite.config.ts`.
2. Delete `public/sw-reload-clients.js` and `tests/unit/swReloadClients.spec.ts`.
3. Remove the `sw-reload-clients.js` exception in `scripts/audit-icon-build.ts`.
4. Update the PWA line in `AGENTS.md`.

## Completion criteria

1. `dist/sw.js` contains neither `skipWaiting` nor `importScripts`.
2. On stage, a tab in the middle of a countdown does not reload until it finishes.

## Next step

The next release after PR #37 is merged and deployed to production.
