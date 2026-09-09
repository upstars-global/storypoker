# App - Vue SPA

Канонічні правила scope `app/` живуть у цьому файлі. `app/CLAUDE.md` імпортує його.
Alias `~` і `@` → `app/` (`vite.config.ts` + `vitest.config.ts`).

## Scope map

| Scope | Що всередині | Інструкції |
| --- | --- | --- |
| `app/assets/` | Tailwind v4 CSS-first config, MUI-класи, 3 палітри | `app/assets/AGENTS.md` |
| `app/components/` | AppModal/AppTooltip контракти, іконки, ECharts | `app/components/AGENTS.md` |
| `app/pages/` | маршрути, Realtime-підписки, reconciliation | `app/pages/AGENTS.md` |
| `app/stores/` | Pinia: auth/room/players/presence/profiles | `app/stores/AGENTS.md` |
| `app/utils/` | колоди карт, shields, формули узгодженості | `app/utils/AGENTS.md` |

Без окремих файлів: `app/composables/`, `app/lib/` (`supabase-instance`, `database.types`),
`app/configs/` (`featureFlags`), `app/i18n/locales/`.

## Інваріанти

- Маршрути - явні у `app/router.ts`, без file-based routing (`vue-router@5`)
- Pinia 4 без auto-imports - явні `from 'pinia'`
- Stores беруть клієнт через `getSupabase()` (`app/lib/supabase-instance.ts`); `app/main.ts` кличе `initSupabase()`;
  тести інжектять mock через `setSupabase(mock)`
- UI-тексти проходять через i18n (`vue-i18n@11`, `legacy: false`), якщо компонент уже локалізований
- Harness типізується з `types: ["node"]`, тож у спільному коді таймери мають бути `ReturnType<typeof setTimeout>`,
  а не `number` - інакше третій проєкт `typecheck` падає
