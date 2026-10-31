# .github/AGENTS.md

Авторевʼю PR (`workflows/claude-review.yml`). Загальний CI (`ci.yml`) описаний у корінному `AGENTS.md`.

Workflow використовує спільний пакет ревʼю чотирьох репозиторіїв з адаптером акаунта
`so-upstars`, секрету `SO_UPSTARS_PR_TOKEN` і CI Story Poker. Модель за замовчуванням -
`claude-sonnet-5-5`, effort `medium`; repo variable `CLAUDE_REVIEW_MODEL` перевизначає модель.
`REVIEW_SKILLS_REF` може закріпити повний SHA; без нього береться останній реліз `cr-request`.

Автоматичні повтори вимагають нового head і нових або невирішених попередніх Critical чи Important
в останньому маркованому огляді.
Поріг за замовчуванням - 5 оглядів `so-upstars` на PR, включно з ручними. Одна валідна мітка
`auto-review-rounds-N` перевизначає поріг; неоднозначні й невалідні мітки зупиняють гейт.
Запит ревʼю `so-upstars` і `workflow_dispatch` обходять лічильник, зберігаючи решту перевірок.
`skip-auto-review`, draft, fork, PR від ботів і самого `so-upstars` пропускаються. GitHub не дає
запросити ревʼю в автора PR: live-перевірка `review_requested` потребує PR іншого акаунта.

Зелений CI означає завершений `pull_request` run на повному head SHA, де успішні всі пʼять app jobs:
`Lint`, `Typecheck`, `Unit tests`, `Build`, `Public pages load`, а також `Review workflow fixtures`.
Відсутній job теж означає failure.
E2E й Visual лишаються локальним `test:pre-squash`. `Claude review` - дорадчий статус.

Read-only агент не має shell і `gh`, не читає `.git/`, отримує лише workspace та підготовлений
скіл (`blockReadsOutsideWorkingDirectories`), без write PAT. Prepare прибирає локальну Claude
конфігурацію на всіх глибинах, включно з base-копіями, й готує `.auto-review/`: diff, base,
tree, PR metadata, огляди, коментарі та відповіді довірених учасників. Цей шлях зарезервований:
PR, що його трекає, зупиняє job. Агент пише лише `review.md` і `review-actions.json`; для кожного
дозволені точні `Edit` і `Write`, бо `Edit` сам не створює нового файла.

Publish перевіряє head, структуру, вердикти, лічильники, footer і токеноподібні рядки; зміст прози
читає людина. Це прийнятий компроміс, а не дефект для ревʼю: статус дорадчий. Footer приймає
поточний порядок signature/Next step і старий signature-last для override скіла; прибирає причину
після ` · `, зберігаючи chain і findings. Це прийнятий компроміс, а не дефект для ревʼю.
PAT отримують лише довірені кроки публікації, які звіряють власника `so-upstars`; гарантія
стосується копії workflow з main, бо PR-копію може змінити кожен, хто пушить гілку.

`SO_UPSTARS_PR_TOKEN` і `CLAUDE_CODE_OAUTH_TOKEN` - чинні секрети. Review і reply потребують
Pull requests RW; прийняті відкладення з issue також потребують Issues RW та схвалення org.
Права PAT автоматично не розширювати; metadata GET не доводить права запису. Org approval
бачить адміністратор; працездатність підтверджують фактичні дії й API readback.

Ledger у тілі review зберігає структуровані знахідки, disposition і прогрес дій. Повторний запуск
відновлює записані дії; complete незалежно читає їхні докази. Лише API-only job `resolve_threads`
отримує короткоживучий GITHUB_TOKEN з `contents: write` і `pull-requests: write`: без checkout,
PAT, артефактів або parser-а виводу моделі. Thread ID береться з GitHub metadata. Треди закриває
`github-actions[bot]`; огляди, issue, reply, ledger і merged summary пише `so-upstars`. Це прийнятий
компроміс, а не дефект для ревʼю: довгоживучий Contents-write PAT міг би пушити в main.
Підсумок після merge читає історію GitHub без checkout і запуску моделі.

`workflow_run` виконує копію з main, PR-події - копію з гілки PR, dispatch - із вибраного ref.
Після створення PR зі зміною workflow дочекайся завершення CI й його `workflow_run`, потім
запитуй `so-upstars` для перевірки PR-копії. Ранній запит може передати виконання старій main-копії.
Звіряй source CI run і повний head PR у gate log: head самого `workflow_run` може бути main.
Concurrency розділяє head SHA й скасовує застарілі ревʼю одного PR. Dispatch одночасно з подією
того самого head може залишити error без огляду; Re-request review відновлює виконання. Це
прийнятий компроміс, а не дефект для ревʼю: помилковий огляд не публікується.

Usage limit акаунта `CLAUDE_CODE_OAUTH_TOKEN` з повідомленням про reset потребує очікування,
потім remove/re-add запиту ревʼю. Це зовнішня квота; workflow через неї не змінювати.
Пін action на SHA з коментарем `# vN` звіряй через `git ls-remote --tags`; reviewer мережі не має,
тому результат додавай до опису PR.

CI запускає фікстури фактичних workflow-кроків: гейти, ліміти, footer, ledger, resolver, recovery
і merged summary. Локально: `python3 -m unittest discover -s scripts -p 'test_claude_review.py'`.
Прямий запуск файла й unittest discovery збирають усі тестові класи.

Невирішені попередні Critical/Important у canonical ledger також підтримують автоматичний повтор;
REJECT і повністю підтверджене прийняте відкладення більше не блокують його. Прийняте відкладення
звіряється зі знімком перед моделлю: зміна пропозиції після цього знімка зупиняє дію. Після помилки
публікації фіналізатор завершує лише власний pending status; новіший run він не перезаписує.

Спільний пакет контролює `scripts/check_review_parity.py` з явним адаптером у
`scripts/review-parity.json`; локально запускай `python3 scripts/check_review_parity.py --self-test`
і `python3 -m unittest discover -s scripts -p 'test_review_parity.py'`. Змінюючи спільну логіку,
тести або fixtures, узгодь усі чотири копії; адаптер допускає лише перелічені проєктні відмінності.
