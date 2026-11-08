# vue-i18n precompile

1. Status: Planned
2. Priority: P3
3. Initiated: 2026-05-16 (post-migration)
4. Last reviewed: 2026-07-17
5. Related: [spec](../superpowers/specs/2026-05-16-vue-vite-migration-design.md)

## Why

Locales are compiled at runtime. This is slower, increases the bundle size and produces
the dev warning `[intlify] Runtime compilation is being used`.

## Expected outcome

Messages are precompiled at build time using `@intlify/unplugin-vue-i18n`.

## Scope

1. Add the plugin and precompile `app/i18n/locales/{uk,en}.json`.
2. Remove the runtime compilation dependency from the bundle.

## Completion criteria

1. The dev warning disappears and localization works for uk and en.

## Next step

Check plugin compatibility with Vite 8 / Rolldown.
