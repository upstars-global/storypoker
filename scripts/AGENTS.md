# Scripts - npm lifecycle hooks і генератор іконок

Shell-скрипти - POSIX `sh` з `set -e`; TS-скрипти запускаються напряму через `node` (type stripping), без `tsx`.

| Скрипт | Запуск | Що робить |
| --- | --- | --- |
| `setup.sh` | `preinstall`, `npm run setup` | створює `.agents/skills`, `.claude/skills`, `.env/` з порожніми `.env` і `.env.local`; пише або доповнює через `jq` `.claude/settings.json` (`attribution` вимкнена); наприкінці викликає `migrate-test-artifacts.sh` |
| `migrate-test-artifacts.sh` | із `setup.sh` | переносить legacy `coverage/`, `playwright-report/` з кореня в `test-results/`; тимчасовий, прибрати разом із рядками в `.gitignore` |
| `skills.sh` | `postinstall`, `npm run skills` | ставить skills через `npx skills add` для Codex і Claude Code і друкує список через `npx skillio`; мережевий |
| `skills.local.sh` | вручну, gitignored | знімає встановлені skills (`skillio rm`), запускає `skills.sh --no-list` і друкує список через `skl`; прапорець `--no-list` у `skills.sh` не прибирай |
| `clean.sh` | `npm run clean` | видаляє skills, `node_modules/`, `package-lock.json`, `dist/`, `.nuxt/` - повне перевстановлення з нуля |
| `generate-icons.ts` | `icons:generate`, `icons:check` (у `test:ci`) | сканує `app/`, збирає підмножину Iconify-сетів у `app/generated/`; `--check` падає, якщо згенероване розійшлось із кодом. Модулі - `icons/` |
| `audit-icon-build.ts` | `icons:audit-build` (CI-job `build`) | перевіряє `dist`: жодних повних Iconify-сетів чи генератора в бандлі, бюджет gzip 25 KiB, baseline - `docs/audits/icon-bundle-baseline.json` |

## `skills.sh` - свідомі рішення
- Блок `SENTIMONY SKILLS` (коментарі й порядок `-s`) - спільний еталон для всіх проєктів, такий самий, як у
  `scripts/skills.sh` skills-aiassist. Список повний: скіли, не потрібні тут, вимикай через `\ `, а не видаляй
  і не переставляй; `scope-check` і `webapp-debugger` завжди вимкнені.
- **Вимкнений skill - `\ <name>`** (backslash + пробіл перед назвою), напр. `\ skill-crafting`. Аргумент стає
  `" skill-crafting"` з пробілом попереду, `skills add` його не знаходить і пропускає, а позиція в списку лишається.
  Це не баг - не «виправляй» і не видаляй такі рядки.
- Закоментувати рядок `#` усередині багаторядкової команди не можна: коментар обриває продовження `\`, і решта
  аргументів (включно з `-a codex claude-code -y`) не виконується.
- Цілий блок, як `MATTPOCOCK SKILLS`, вимикається `#` на кожному рядку, від `npx` до `-a ... -y` включно.
