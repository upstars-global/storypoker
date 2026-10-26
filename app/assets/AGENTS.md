# Assets - Tailwind v4 config і теми

Весь Tailwind-конфіг і MUI-класи живуть у `app/assets/css/main.css` (CSS-first: `@theme`, `@utility`,
`@custom-variant dark`). Без PostCSS/autoprefixer - vendor-prefixing робить вбудований Lightning CSS.

## Токени

- text utilities з `@theme --color-*`:
  `text-{primary,body,muted,disabled,inverse,danger,success,appbar-{subtle,muted,emphasis}}`
- bg utilities через `@utility`: `bg-{app,appbar,paper,elevated,skeleton}`
- дефолтний `border` зберігає колір `var(--border)` через `@layer base` override (v4 default - `currentColor`);
  `border-input` - явний `@utility`
- `shadow-{1..4,8}` - значення живуть у `@theme`; `text-mui-{h2,body,table,caption}` - `--text-mui-*` +
  `--line-height`/`--letter-spacing` modifiers
- з кнопкових класів лишилися `.mui-btn` і `.mui-btn-md` (180×46, `--radius-btn` 23px, `--btn-md-bg`/
  `--btn-md-bg-hover` за палітрою); решту дають варіанти shadcn `Button` (`ui/button.tsx`: `variant`
  `default|text|secondary`, `size` `default|sm|md`)
- текстові поля - нативний `<input className="mui-input">` у `.mui-field` з плаваючою `.mui-field-label`;
  `ui/input.tsx` не підключений: його утиліти перебивають плаваючий лейбл

## Міст токенів shadcn

shadcn - `components.json` (style `base-nova` на `@base-ui/react`); `main.css` імпортує `shadcn/tailwind.css` і
`tw-animate-css`. Палітри - джерело правди, токени shadcn виводяться з них: блок `:root` задає `--background`,
`--popover`, `--muted`, `--accent`, `--destructive`, `--input`, `--ring`, `--radius` тощо через змінні палітри,
`@theme inline` мапить їх у `--color-*`. `--primary` і `--border` - самі змінні палітри. Утиліти
`text-primary`/`text-muted` з `@theme` - кольори тексту (`--color-primary: var(--text-primary)`), тож
`bg-primary`/`bg-muted` дали б колір тексту. У `ui/`-коді пиши `bg-(--primary)`, `bg-(--muted)`, `text-(--primary)`,
ніколи `bg-primary`. Нові змінні палітр додавати можна, якщо наявні не змінюють значень.

## Палітри

`sp-theme` (`light | dark`) і `sp-palette` (`classic | cyberdeck | matcha`) - незалежні осі; кожна палітра має
обидві теми (cyberdeck - неоновий термінал, Geist Mono, гострі кути, неонові рамки/тіні, єдиний дозволений
градієнт в appbar; matcha - м'яка округла, Nunito, великі радіуси). Теми задають
`--font-app/--font-display/--radius-*/--btn-text/--btn-transform/--paper-border/--card-border/--shadow-*` через
`html[data-palette=…][data-theme=…]`. Inline script у `index.html` застосовує обидва атрибути до
завантаження JS; вибір - меню в AppHeader (`PALETTES` з `app/hooks/useTheme.ts`).
