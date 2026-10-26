# .github/AGENTS.md

Авторев'ю PR (`workflows/claude-review.yml`). Загальний CI (`ci.yml`) описаний у корінному `AGENTS.md`.

`.github/workflows/claude-review.yml` - не required: на не-draft PR після зеленого `CI` (а також на
ready_for_review, запит рев'ю і `workflow_dispatch` з `pr_number`) Claude проходить `cr-request` і лишає PR review
від `so-upstars` (секрети `SO_UPSTARS_PR_TOKEN`, `CLAUDE_CODE_OAUTH_TOKEN`; модель - repo variable `CLAUDE_REVIEW_MODEL`).
Автоматичний прогін рев'юїть head, коли на PR ще немає рев'ю бота з маркером `<!-- claude-review`, або коли в
`### Summary` останнього такого рев'ю Critical чи Important > 0, воно було на іншому head і таких рев'ю менше 3;
запит рев'ю в `so-upstars` і `workflow_dispatch` обходять цей ліміт, але зелений CI потрібен усім: запит чекає
на нього, а dispatch на незеленому CI лише ставить статус `error`. Зелений тут - required jobs (`REQUIRED_JOBS`
у гейті): результат `Visual` і `E2E` рев'ю не блокує, але гейт чекає кінця всього прогону `CI`, тож E2E (до 25 хв)
затримує рев'ю - прийнятий компроміс, а не дефект для рев'ю. Мітка `skip-auto-review`
вимикає будь-яке рев'ю PR (і на запит, і dispatch), PR від ботів і від `so-upstars` воркфлоу не рев'юїть.
Скіл `cr-request` береться з `sentimony/agentic-workflow` на SHA з repo variable `REVIEW_SKILLS_REF` (дефолт у
воркфлоу - повний SHA тегу `v0.0.6`, `1e151554…`) і копіюється в `~/.claude/skills`. Дія відновлює `.claude` з
`main` лише на подіях `pull_request`, а не на `workflow_run`/`workflow_dispatch`, тож крок `Prepare review target`
сам прибирає з checkout усі `.claude/` і `CLAUDE.local.md` (вкладені теж), `.mcp.json` і `.claude.json`; base-копії
`.claude/` теж (вкладена тека теж вантажиться), обидві сторони змін є в `diff.patch` - це прийнятий компроміс, а не
дефект для рев'ю.
Агент не має shell (`--disallowedTools "Bash"`: read-only команди, як `printenv`, читають env)
і `gh`, читає лише workspace і `~/.claude/skills` (`blockReadsOutsideWorkingDirectories`), `.git/` йому закритий
(`Read(./.git/**)`: в `.git/config` лежить токен дії), а пише лише тіло у файл. Лог, дифф, base-копії, tree і
`pr.json` (опис; рев'ю й коментарі лише OWNER/MEMBER/COLLABORATOR) йому готує `Prepare review target` в
`auto-review-target/`; PR, що трекає цю теку чи `auto-review-out/`, валить job. Job `publish` перевіряє тіло й
свіжість head, а PAT має тільки крок `post` (звіряє, що токен належить `so-upstars`) - гарантія лише для копії з
`main`, прогони `pull_request` беруть воркфлоу з гілки PR. `publish` перевіряє структуру тіла (маркер, підпис
з тривалістю кроку агента, яку дописує крок `Add review duration`, і `Next step` останнім рядком; або підпис
останнім - порядок до 0.0.6, для override `REVIEW_SKILLS_REF`; вердикти й лічильники з `### Summary`, розмір,
токеноподібні рядки), а не його зміст: це прийнятий компроміс, а не дефект для рев'ю - статус дорадчий, рев'ю
читає людина. Виняток для ` · ` «двох закриваючих рядків» у промпті - спільне формулювання чотирьох
review-воркфлоу, хоч агент пише ` · ` лише в `Next step`: прийнятий компроміс, а не дефект для рев'ю;
хід і підсумок - commit status `Claude review` на head PR. Повторне рев'ю - Request / Re-request review у
`so-upstars` (за незеленого CI чекає на зелений). Правки воркфлоу для `workflow_run` діють лише після злиття
(копія з `main`), для `pull_request`-подій - одразу з гілки PR, для `workflow_dispatch` - з ref, на якому його
запущено. Job `review` має групу `concurrency` за номером PR: новіший прогін після гейту (і dispatch чи запит на
тому ж head) скасовує поточне рев'ю, старий head дістає `error`. Постить лише власник статусу (чий URL у
статусі), тож dispatch і авторев'ю одного head, як і новий гейт між перевіркою власника й фінальним статусом
старого прогону, можуть лишити `error` без рев'ю - прийнятий компроміс, а не дефект для рев'ю: хибного рев'ю
немає, Re-request review лікує.
Схвалення PAT в org бачить лише адмін (`so-upstars` - member, API дає `404`); працездатність перевіряй за
прогоном `Claude review` і PR review `so-upstars` з `<!-- claude-review sha=`. GitHub не дає запросити рев'ю в
автора PR, а PR від `so-upstars` воркфлоу пропускає: шлях `review_requested` перевіряй на PR іншого акаунта.
У `--allowedTools` агента `Write(./auto-review-out/review.md)` стоїть поруч з `Edit(...)`: `Edit` не створює файл,
і без `Write` прогін іноді проходить, не записавши рев'ю. Пін action на SHA з коментарем `# vN` звіряй без API:
`git ls-remote --tags https://github.com/<owner>/<action>.git </dev/null | grep <sha>` має дати `refs/tags/vN`;
агент рев'ю мережі не має, тож результат впиши в опис PR.
