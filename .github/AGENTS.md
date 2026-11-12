# .github/AGENTS.md

Авторевʼю PR (`workflows/auto-reviewer.yaml`, назва `Auto review`). Загальний CI (`ci.yml`) описаний у корінному `AGENTS.md`.

Файл - тонкий виклик спільного reusable workflow
`sentimony/github-workflows/.github/workflows/auto-reviewer-shared.yaml@v0.0.6`; локальної копії логіки
немає (рішення власника, issue #80). Гейт, агент, права, ledger, footer і resolver тредів живуть у
upstream; їх контракт - README та `AUTO_REVIEWER_SHARED_TRANSPORT.md` у `sentimony/github-workflows` на
потрібному тегу. Виклик не задає `concurrency`, `runs-on` і `steps`, а `permissions` - стеля з README.

Оновлення піну: вибери новий тег `vX.Y.Z` (теги незмінні), прочитай `CHANGELOG.md` між тегами, заміни
ref у `uses:` і звір вхідні параметри та секрети з README на цьому тегу. Upstream-перевірка виклику
(`scripts/check_auto_reviewer_shared_contract.py`, потребує Ruby 3) лежить лише в upstream-репо: розпакуй
`git archive <тег>` у порожню теку й запусти її з `--caller <цей файл>` та `--required-ci-job` на кожен job.
`actionlint .github/workflows/*.y*ml` - обов'язково.

Адаптер Story Poker: `reviewer: so-upstars`, PAT `SO_UPSTARS_PR_TOKEN` передається як `AUTO_REVIEWER_TOKEN`,
`CLAUDE_CODE_OAUTH_TOKEN` - як є. Статус `Auto Reviewer` - дорадчий, не required, ім'я задає upstream.
CI-джерело: `ci.yml`, подія `pull_request`; зелений CI - усі п'ять jobs `Lint`, `Typecheck`, `Unit tests`,
`Build`, `Public pages load` на повному head SHA. E2E й Visual лишаються в локальному `test:pre-squash`.

Поведінка, яку задає upstream:

1. Ліміт оглядів `so-upstars` на PR - 10 за замовчуванням; змінна репо `CLAUDE_REVIEW_MAX_ROUNDS`
   (не задана, старе значення 5 не повертати). Одна мітка `auto-review-rounds-N` перевизначає ліміт.
2. `review-changed-head: true`: новий head після чистого огляду перевіряється, лише якщо diff самого PR
   (`base...head`) змінився; чисте злиття `main` у гілку огляд не запускає, зміна файлів PR - запускає.
   Без чистого огляду повтор потребує нових або невирішених Critical/Important.
3. Запит ревʼю `so-upstars` і `workflow_dispatch` обходять лічильник. Ручний запуск:
   `gh workflow run auto-reviewer.yaml -R upstars-global/storypoker -f pr=<n>` (`--ref <гілка>` для копії з гілки).
4. Модель `claude-sonnet-5-5`, effort `medium`; змінні `CLAUDE_REVIEW_MODEL`, `CLAUDE_REVIEW_EFFORT`;
   `REVIEW_SKILLS_REF` закріплює повний SHA скіла `cr-request`.
5. Draft, fork і PR від ботів та самого `so-upstars` пропускаються; `skip-auto-review` теж. GitHub не дає
   запросити ревʼю в автора PR: live-перевірка `review_requested` потребує PR іншого акаунта.

`workflow_run` виконує копію з main, PR-події - з гілки PR, dispatch - із вибраного ref; `workflow_dispatch`
з'являється, коли файл є на default-гілці (до того - `--ref`). Секрети `SO_UPSTARS_PR_TOKEN` і
`CLAUDE_CODE_OAUTH_TOKEN` - чинні; права PAT автоматично не розширювати. Usage limit акаунта
`CLAUDE_CODE_OAUTH_TOKEN` з повідомленням про reset потребує очікування, потім remove/re-add запиту ревʼю.

Назви в `docs/plans/` у двох стилях: скіли `plan-craft` і `verify` пишуть `YYYYMMDD-HHMM-<topic>.md`, старші
плани - `YYYY-MM-DD-<slug>.md`. Це прийнятий компроміс, а не дефект для рев'ю: старі плани не перейменовуються,
нові не підганяються під старий стиль.
