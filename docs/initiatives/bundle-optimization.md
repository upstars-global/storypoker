# Bundle optimization

1. Status: Planned
2. Priority: P2
3. Initiated: 2026-05-16 (post-migration)
4. Last reviewed: 2026-07-17

## Why

The bundle is monolithic (~757 KB / 233 KB gzip). `app/router.ts` statically imports all
seven pages, and DiceBear collections are included in the initial bundle even though they
are needed only in the room and settings.

## Expected outcome

The initial bundle contains only what is needed for the first render; the rest loads on
demand.

## Scope

1. Move auth pages and `/ffc` to `() => import(...)`.
2. Move DiceBear to a dynamic import.
3. Split the monolithic chunk and remove unused dependencies.

## Completion criteria

1. Initial JS is noticeably smaller than the current 233 KB gzip.
2. DiceBear is absent from the initial chunk.

## Next step

Measure the baseline with `rollup-plugin-visualizer` before making changes.
