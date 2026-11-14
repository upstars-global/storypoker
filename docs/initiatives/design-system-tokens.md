# Design system - remaining tokens

1. Status: Partial
2. Priority: P3
3. Initiated: 2026-06 (Tailwind v4 migration)
4. Last reviewed: 2026-07-17
5. Related: [`DESIGN.md`](../../DESIGN.md)

## Why

Tailwind v4 CSS-first (`app/assets/css/main.css`) with `@theme` / `@utility` /
`@custom-variant` is already in place, color / bg / text / border / shadow / typography
tokens have been consolidated, and most inline `style=` has been migrated. A few
exceptions remain.

## Scope

1. Player accent palette: `#00796b`, `#0288d1`, etc. (~8 hex values in `PlayerRow`)
   lack tokens; introduce a `--accent-*` group. `--btn-md-bg: #607d8b` is already tokenized.
2. Contextual CSS vars without utility mapping (`--icon-player-color`, `--hover-bg`) are
   intentionally inline as contextual overrides; revisit the decision.
3. Move the three recurring arbitrary values (`max-w-[1400px]`, `z-[9999]`, `h-[51px]`)
   to `@theme`; leave one-off layout values as they are.

## Completion criteria

1. Player colors come from `--accent-*`.
2. The three recurring arbitrary values are replaced with tokens.

## Next step

The accent palette has the greatest effect on consistency.
