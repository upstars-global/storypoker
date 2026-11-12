# Scripts - lifecycle hooks і генератор іконок

Shell-скрипти - POSIX `sh` з `set -e`; TS-скрипти запускаються напряму через `node` (type stripping), без `tsx`.
pnpm-скрипти `postinstall` (`[ -n "$CI" ]`) і `predev` (`|| true`) теж розраховані на POSIX shell: під Windows
`cmd` `predev` блокує `pnpm run dev`, тож там потрібен Git Bash як `script-shell`.

| Скрипт | Запуск | Що робить |
| --- | --- | --- |
| `setup.sh` | `preinstall`, `pnpm run setup` | створює `.agents/skills`, `.claude/skills`, `.env/` з порожніми `.env` і `.env.local`; пише або доповнює через `jq` `.claude/settings.json` (`attribution` вимкнена, хук `SessionStart` на `session-start.sh` додається один раз); наприкінці викликає `migrate-test-artifacts.sh` |
| `migrate-test-artifacts.sh` | із `setup.sh` | переносить legacy `coverage/`, `playwright-report/` з кореня в `test-results/`; тимчасовий, прибрати разом із рядками в `.gitignore` |
| `skills.sh` | `postinstall` (крім CI), `predev` (збій не зупиняє `dev`), `pnpm run skills` | спершу `skl-x update` і `skl-x rm .` (знімає всі skills проєкту), далі ставить skills через `skl-x add` для Codex і Claude Code; мережевий |
| `session-start.sh` | хук Claude Code `SessionStart` (`startup`) | тихо запускає `pnpm run skills` і повертає `reloadSkills`, щоб нова сесія бачила свіжі skills; stdout хука йде в контекст моделі, тож друкує лише JSON |
| `supabase-local.sh` | `pnpm run supabase:local` | піднімає локальний Supabase (Docker у colima) з workdir `~/.cache/storypoker-supabase` (symlink на `supabase/`), пише `.env/.env.test`, якщо його нема або він вказує на інший URL (перший замінений файл лишається в `.env.test.bak`), і перестворює e2e-користувача |
| `visual-compare.sh` | `pnpm run test:visual [<ref> [<playwright args>]]`, `pre-squash.sh` | знімає проєкт `visual` на `<ref>` (дефолт `origin/main`) як еталон у `test-results/visual-baselines/` і порівнює з робочим деревом; аргументи після `<ref>` ідуть в обидва прогони Playwright; збірка `<ref>` - `git archive` у `test-results/visual-base-src`, яку скрипт видаляє одразу після `vite build` |
| `pre-squash.sh` | `pnpm run test:pre-squash [<ref>]`, перед squash PR | `supabase:local` на хості, копія дерева (з `.git`, без `node_modules`/`test-results`/`dist`) у `test-results/pre-squash-src`, у контейнері Playwright (тег = `@playwright/test`, `--network host`, `CI=1` з `--env-file .env/.env.test`, pnpm store у volume `storypoker-pnpm-store`) - e2e `chromium` + `webkit` і `visual-compare.sh <ref>` (дефолт merge-base з `origin/main`); звіти - `test-results/pre-squash/{e2e,visual}`, копію видаляє, бо її `AGENTS.md` агенти підхопили б |
| `clean.sh` | `pnpm run clean` | видаляє skills, `node_modules/`, `pnpm-lock.yaml`, `dist/`, `.nuxt/` - повне перевстановлення з нуля |
| `generate-icons.ts` | `icons:generate`, `icons:check` (у `test:ci`) | сканує `app/` (`.ts`/`.tsx` парсить `icons/scan.ts` через нестабільний API TS 7 `typescript/unstable/{sync,fs,ast}` - звідси точний пін `typescript`), збирає підмножину Iconify-сетів у `app/generated/`; `--check` падає, якщо згенероване розійшлось із кодом. Модулі - `icons/` |
| `audit-icon-build.ts` | `icons:audit-build` (у `test:ci`, CI-job `build`) | перевіряє `dist`: жодних повних Iconify-сетів чи генератора в бандлі, бюджет gzip 25 KiB, baseline - `docs/audits/icon-bundle-baseline.json` |

## `skills.sh` - свідомі рішення
- Кожне джерело скілів - одна команда зі списком `-s`, порядок skills - канонічний, зберігай його
  при змінах.
- Вимкнений skill позначено `\ <name>` у списку, а не видалено й не закоментовано: аргумент стає
  `" <name>"` з пробілом попереду й нічого не знаходить. Це не баг - не «виправляй» такі рядки.
  Закоментований рядок продовження обірвав би команду.
- Вимикаючи skill, прибери його назву з `AGENTS.md` (Workflow sequences) і вкладених `AGENTS.md`:
  агент не має кликати skill, якого немає в `.claude/skills/`. Це звіряє `tests/unit/agentsSkills.spec.ts`.
- Версія `skl-x` запінена (`skl-x@0.4.12`) у `clean.sh` і `.github/workflows/ci.yml` - оновлюй
  обидва разом. `skills.sh` і `skills.local.sh` беруть останній `skl-x`: `sln` у local-скрипті
  знімає опубліковану копію сам лише з 0.4.9.
  Свіжість skills пін не обмежує: їх тягне `skl-x add` з GitHub.
- Gitignored `scripts/skills.local.sh`, якщо є, запускається після sentimony-джерел,
  перед встановленням Supabase, Netlify та shadcn. Наступні `skl-x add` можуть
  перезаписати локальні підміни цих скілів.
