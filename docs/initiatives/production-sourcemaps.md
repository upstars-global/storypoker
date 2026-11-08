# Production sourcemaps

1. Status: Planned
2. Priority: P2
3. Initiated: 2026-05-16 (post-migration)
4. Last reviewed: 2026-07-17

## Why

`vite.config.ts` keeps `build: { sourcemap: true }` for production: this exposes
source code and adds ~3.6 MB to `dist/`.

## Expected outcome

Sourcemaps are available for diagnostics but are not published with production.

## Scope

1. Keep sourcemaps for staging only, or upload them to an error tracker and do not
   deploy them in `dist/`.

## Completion criteria

1. The production build's `dist/` contains no `.map` files.

## Next step

Decide whether an error tracker is needed; the choice of solution depends on it.
