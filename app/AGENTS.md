# App - React SPA

The canonical rules for the `app/` scope live in this file. `app/CLAUDE.md` imports it.
Aliases `~` and `@` point to `app/` (`vite.config.ts` + `vitest.config.ts`).

## Scope map

| Scope | Contents | Instructions |
| --- | --- | --- |
| `app/assets/` | Tailwind v4 CSS-first config, shadcn token bridge, MUI classes, 3 palettes | `app/assets/AGENTS.md` |
| `app/components/` | AppModal/AppTooltip/AppMenu, shadcn `ui/`, icons, ECharts | `app/components/AGENTS.md` |
| `app/pages/` | routes, Realtime subscriptions, reconciliation | `app/pages/AGENTS.md` |
| `app/stores/` | Zustand: auth/room/players/presence/profiles | `app/stores/AGENTS.md` |
| `app/utils/` | card decks, shields, alignment formulas | `app/utils/AGENTS.md` |

No separate files: `app/hooks/` (`use*` hooks), `app/lib/` (`supabase-instance`,
`database.types`), `app/configs/` (`featureFlags`), `app/i18n/locales/`.

## Invariants

1. Routes are explicit `<Routes>`/`<Route>` in `app/router.tsx` (react-router 8, declarative mode), with no file-based routing;
   imports come from `'react-router'` (`react-router-dom` is not a dependency).
2. Stores obtain the client through `getSupabase()` (`app/lib/supabase-instance.ts`); `app/main.tsx` calls `initSupabase()`;
   tests inject a mock through `setSupabase(mock)`.
3. UI text goes through i18n (`i18next` + `react-i18next`, `useTranslation()`) if the component is already localized.
   `app/i18n.tsx` initializes synchronously and sets `html lang`; `main.tsx` imports `~/i18n` before rendering.
   Initialization uses a valid saved `sp-lang`, otherwise the first supported browser language (`navigator.languages`,
   or `navigator.language` when the list is missing or empty), otherwise `en`; automatic selection is not persisted.
   Interpolation uses single braces `{name}` (`interpolation.prefix/suffix`), as in the old locales;
   the i18next defaults `{{name}}` are not substituted here.
4. Lint uses `oxlint --type-aware` (`.oxlintrc.json`): `typescript/no-floating-promises` and `react/rules-of-hooks` are
   errors, so write a promise without `await` as `void fn()`; `react/exhaustive-deps` is a warning.
5. The harness is typed with `types: ["node"]`, so timers in shared code must use `ReturnType<typeof setTimeout>`,
   rather than `number` - otherwise the third `typecheck` project fails.
