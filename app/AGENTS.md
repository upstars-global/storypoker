# App - React SPA

Канонічні правила scope `app/` живуть у цьому файлі. `app/CLAUDE.md` імпортує його.
Alias `~` і `@` → `app/` (`vite.config.ts` + `vitest.config.ts`).

## Scope map

| Scope | Що всередині | Інструкції |
| --- | --- | --- |
| `app/assets/` | Tailwind v4 CSS-first config, міст токенів shadcn, MUI-класи, 3 палітри | `app/assets/AGENTS.md` |
| `app/components/` | AppModal/AppTooltip/AppMenu, shadcn `ui/`, іконки, ECharts | `app/components/AGENTS.md` |
| `app/pages/` | маршрути, Realtime-підписки, reconciliation | `app/pages/AGENTS.md` |
| `app/stores/` | Zustand: auth/room/players/presence/profiles | `app/stores/AGENTS.md` |
| `app/utils/` | колоди карт, shields, формули узгодженості | `app/utils/AGENTS.md` |

Без окремих файлів: `app/hooks/` (`use*`-хуки), `app/lib/` (`supabase-instance`,
`database.types`), `app/configs/` (`featureFlags`), `app/i18n/locales/`.

## Інваріанти

- Маршрути - явні `<Routes>`/`<Route>` у `app/router.tsx` (react-router 8, declarative mode), без file-based routing;
  імпорти з `'react-router'` (`react-router-dom` у залежностях немає)
- Stores беруть клієнт через `getSupabase()` (`app/lib/supabase-instance.ts`); `app/main.tsx` кличе `initSupabase()`;
  тести інжектять mock через `setSupabase(mock)`
- UI-тексти проходять через i18n (`i18next` + `react-i18next`, `useTranslation()`), якщо компонент уже локалізований.
  `app/i18n.tsx` ініціалізує синхронно й ставить `html lang`; `main.tsx` імпортує `~/i18n` до рендера.
  Інтерполяція - одинарні дужки `{name}` (`interpolation.prefix/suffix`), як у старих локалях;
  дефолтні для i18next `{{name}}` тут не підставляються
- Lint - `oxlint --type-aware` (`.oxlintrc.json`): `typescript/no-floating-promises` і `react/rules-of-hooks` -
  помилки, тож промис без `await` пиши як `void fn()`; `react/exhaustive-deps` - warning
- Harness типізується з `types: ["node"]`, тож у спільному коді таймери мають бути `ReturnType<typeof setTimeout>`,
  а не `number` - інакше третій проєкт `typecheck` падає
