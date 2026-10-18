# Scripts - npm lifecycle hooks і генератор іконок

Shell-скрипти - POSIX `sh` з `set -e`; TS-скрипти запускаються напряму через `node` (type stripping), без `tsx`.
npm-скрипти `postinstall` (`[ -n "$CI" ]`) і `predev` (`|| true`) теж розраховані на POSIX shell: під Windows
`cmd` `predev` блокує `npm run dev`, тож там потрібен Git Bash як `script-shell`.

| Скрипт | Запуск | Що робить |
| --- | --- | --- |
| `setup.sh` | `preinstall`, `npm run setup` | створює `.agents/skills`, `.claude/skills`, `.env/` з порожніми `.env` і `.env.local`; пише або доповнює через `jq` `.claude/settings.json` (`attribution` вимкнена, хук `SessionStart` на `session-start.sh` додається один раз); наприкінці викликає `migrate-test-artifacts.sh` |
| `migrate-test-artifacts.sh` | із `setup.sh` | переносить legacy `coverage/`, `playwright-report/` з кореня в `test-results/`; тимчасовий, прибрати разом із рядками в `.gitignore` |
| `skills.sh` | `postinstall` (крім CI), `predev` (збій не зупиняє `dev`), `npm run skills` | спершу `skl-x rm .` знімає всі skills проєкту, далі ставить skills через `skl-x add` для Codex і Claude Code; мережевий |
| `session-start.sh` | хук Claude Code `SessionStart` (`startup`) | тихо запускає `npm run skills` і повертає `reloadSkills`, щоб нова сесія бачила свіжі skills; stdout хука йде в контекст моделі, тож друкує лише JSON |
| `clean.sh` | `npm run clean` | видаляє skills, `node_modules/`, `package-lock.json`, `dist/`, `.nuxt/` - повне перевстановлення з нуля |
| `generate-icons.ts` | `icons:generate`, `icons:check` (у `test:ci`) | сканує `app/`, збирає підмножину Iconify-сетів у `app/generated/`; `--check` падає, якщо згенероване розійшлось із кодом. Модулі - `icons/` |
| `audit-icon-build.ts` | `icons:audit-build` (CI-job `build`) | перевіряє `dist`: жодних повних Iconify-сетів чи генератора в бандлі, бюджет gzip 25 KiB, baseline - `docs/audits/icon-bundle-baseline.json` |

## `skills.sh` - свідомі рішення
- Кожне джерело скілів - одна команда зі списком `-s`, порядок skills - канонічний, зберігай його
  при змінах.
- Вимкнений skill позначено `\ <name>` у списку, а не видалено й не закоментовано: аргумент стає
  `" <name>"` з пробілом попереду й нічого не знаходить. Це не баг - не «виправляй» такі рядки.
  Закоментований рядок продовження обірвав би команду.
- Версія `skl-x` запінена (`skl-x@0.4.8`) у `clean.sh` і `.github/workflows/ci.yml` - оновлюй обидва
  разом. `skills.sh` і `skills.local.sh` беруть останній `skl-x`: `sln` у local-скрипті
  знімає опубліковану копію сам лише з 0.4.9.
  Свіжість skills пін не обмежує: їх тягне `skl-x add` з GitHub.
- Gitignored `scripts/skills.local.sh`, якщо є, запускається з `skills.sh` і підміняє опубліковані копії
  симлінками на локальні клони.
