# Assets - Tailwind v4 config and themes

The entire Tailwind config and MUI classes live in `app/assets/css/main.css` (CSS-first: `@theme`, `@utility`,
`@custom-variant dark`). There is no PostCSS/autoprefixer - built-in Lightning CSS handles vendor prefixing.

## Tokens

1. Text utilities from `@theme --color-*`:
   `text-{primary,body,muted,disabled,inverse,danger,success,appbar-{subtle,muted,emphasis}}`.
2. Background utilities via `@utility`: `bg-{app,appbar,paper,elevated,skeleton}`.
3. The default `border` retains `var(--border)` through an `@layer base` override (the v4 default is `currentColor`);
   `border-input` is an explicit `@utility`.
4. `shadow-{1..4,8}` values live in `@theme`; `text-mui-{h2,body,table,caption}` uses `--text-mui-*` +
   `--line-height`/`--letter-spacing` modifiers.
5. The remaining button classes are `.mui-btn` and `.mui-btn-md` (180×46, `--radius-btn` 23px, `--btn-md-bg`/
   `--btn-md-bg-hover` according to the palette); shadcn `Button` variants provide the rest (`ui/button.tsx`: `variant`
   `default|text|secondary`, `size` `default|sm|md`).
6. Text fields use native `<input className="mui-input">` in `.mui-field` with a floating `.mui-field-label`;
   `ui/input.tsx` is not connected: its utilities override the floating label.

## shadcn token bridge

shadcn uses `components.json` (style `base-nova` on `@base-ui/react`); `main.css` imports `shadcn/tailwind.css` and
`tw-animate-css`. Palettes are the source of truth, and shadcn tokens derive from them: the `:root` block sets `--background`,
`--popover`, `--muted`, `--accent`, `--destructive`, `--input`, `--ring`, `--radius`, and so on through palette variables;
`@theme inline` maps them to `--color-*`. `--primary` and `--border` are palette variables themselves. The
`text-primary`/`text-muted` utilities from `@theme` are text colors (`--color-primary: var(--text-primary)`), so
`bg-primary`/`bg-muted` would produce text colors. In `ui/` code, write `bg-(--primary)`, `bg-(--muted)`, `text-(--primary)`,
never `bg-primary`. New palette variables may be added if existing ones do not change values.

## Palettes

`sp-theme` (`light | dark`) and `sp-palette` (`classic | cyberdeck | matcha`) are independent axes; each palette has
both themes (cyberdeck is a neon terminal with Geist Mono, sharp corners, neon borders/shadows, and the only allowed
gradient in the appbar; matcha is soft and rounded, with Nunito and large radii). Themes set
`--font-app/--font-display/--radius-*/--btn-text/--btn-transform/--paper-border/--card-border/--shadow-*` via
`html[data-palette=…][data-theme=…]`. An inline script in `index.html` applies both attributes before
JS loads; selection is in the AppHeader menu (`PALETTES` from `app/hooks/useTheme.ts`).
