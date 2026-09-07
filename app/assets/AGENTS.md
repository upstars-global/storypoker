# Assets - Tailwind v4 config і теми

Весь Tailwind-конфіг і MUI-класи живуть у `app/assets/css/main.css` (CSS-first: `@theme`, `@utility`,
`@custom-variant dark`). Без PostCSS/autoprefixer - vendor-prefixing робить вбудований Lightning CSS.

## Токени

- text utilities з `@theme --color-*`:
  `text-{primary,body,muted,disabled,inverse,danger,success,appbar-{subtle,muted,emphasis}}`
- bg utilities через `@utility`: `bg-{app,appbar,paper,elevated,overlay,skeleton}`
- дефолтний `border` зберігає колір `var(--border)` через `@layer base` override (v4 default - `currentColor`);
  `border-input` - явний `@utility`
- `shadow-{1..4,8}` - значення живуть у `@theme`; `text-mui-{h2,body,table,caption}` - `--text-mui-*` +
  `--line-height`/`--letter-spacing` modifiers
- button modifiers (compose з `.mui-btn`): `.mui-btn-md` (180×46, `--radius-btn` 23px,
  `--btn-md-bg`/`--btn-md-bg-hover` за палітрою), `.mui-btn-sm`, `.mui-btn-text`, `.mui-btn-secondary`

## Палітри

`sp-palette` - `classic | cyberdeck | matcha`; кожна має light/dark (cyberdeck - неоновий термінал, Geist Mono,
гострі кути, неонові рамки/тіні, єдиний дозволений градієнт в appbar; matcha - м'яка округла, Nunito, великі
радіуси). Теми задають `--font-app/--font-display/--radius-*/--btn-text/--btn-transform/--paper-border/--card-border/
--shadow-*` через `html[data-palette=…][data-theme=…]`. Inline script у `index.html` застосовує обидва атрибути до
завантаження JS; вибір - меню в AppHeader (`PALETTES` з `useTheme.ts`).
