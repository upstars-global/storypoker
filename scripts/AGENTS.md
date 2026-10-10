# Scripts - npm lifecycle hooks і генератор іконок

Shell-скрипти - POSIX `sh` з `set -e`; TS-скрипти запускаються напряму через `node` (type stripping), без `tsx`.

| Скрипт | Запуск | Що робить |
| --- | --- | --- |
| `setup.sh` | `preinstall`, `npm run setup` | створює `.agents/skills`, `.claude/skills`, `.env/` з порожніми `.env` і `.env.local`; пише або доповнює через `jq` `.claude/settings.json` (`attribution` вимкнена); наприкінці викликає `migrate-test-artifacts.sh` |
| `migrate-test-artifacts.sh` | із `setup.sh` | переносить legacy `coverage/`, `playwright-report/` з кореня в `test-results/`; тимчасовий, прибрати разом із рядками в `.gitignore` |
| `skills.sh` | `postinstall`, `npm run skills` | чистить встановлені skills (`skl-x rm`) і ставить заново через `skl-x i` для Codex і Claude Code; мережевий |
| `clean.sh` | `npm run clean` | видаляє skills, `node_modules/`, `package-lock.json`, `dist/`, `.nuxt/` - повне перевстановлення з нуля |
| `generate-icons.ts` | `icons:generate`, `icons:check` (у `test:ci`) | сканує `app/`, збирає підмножину Iconify-сетів у `app/generated/`; `--check` падає, якщо згенероване розійшлось із кодом. Модулі - `icons/` |
| `audit-icon-build.ts` | `icons:audit-build` (CI-job `build`) | перевіряє `dist`: жодних повних Iconify-сетів чи генератора в бандлі, бюджет gzip 25 KiB, baseline - `docs/audits/icon-bundle-baseline.json` |

## `skills.sh` - свідомі рішення
- Формат файла - спільний для всіх клонів (секції, коментарі, форми команд); вимкнений skill - закоментований
  рядок `# run ...`, а не видалений. Порядок skills - канонічний, зберігай його при змінах.
- У закоментованому списку `-s` (форма "using one command") вимкнений skill позначено `\ <name>`: аргумент
  стає `" <name>"` з пробілом попереду й нічого не знаходить. Це не баг - не «виправляй» такі рядки.
- Gitignored `scripts/skills.local.sh`, якщо є, запускається з `skills.sh` і підміняє опубліковані копії
  симлінками на локальні клони.
