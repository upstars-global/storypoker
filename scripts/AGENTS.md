# Scripts - lifecycle hooks and icon generator

Shell scripts use POSIX `sh` with `set -e`; TS scripts run directly through `node` (type stripping), without `tsx`.
The pnpm scripts `postinstall` (`[ -n "$CI" ]`) and `predev` (`|| true`) also expect a POSIX shell: on Windows
`cmd`, `predev` blocks `pnpm run dev`, so Git Bash is needed as `script-shell`.

| Script | Invocation | Purpose |
| --- | --- | --- |
| `test_claude_review.py`, `fixtures/claude-review/` | `python3 -m unittest discover -s scripts -p 'test_claude_review.py'` | Offline checks of the actual auto-review steps; Python/GitHub fixtures, Ruby YAML parser |
| `setup.sh` | `preinstall`, `pnpm run setup` | Creates `.agents/skills`, `.claude/skills`, `.env/` with empty `.env` and `.env.local`; writes or extends `.claude/settings.json` through `jq` (`attribution` disabled, `SessionStart` hook for `session-start.sh` added once); finally calls `migrate-test-artifacts.sh` |
| `migrate-test-artifacts.sh` | From `setup.sh` | Moves legacy `coverage/`, `playwright-report/` from the root to `test-results/`; temporary, remove together with the lines in `.gitignore` |
| `skills.sh` | `postinstall` (except CI), `predev` (failure does not stop `dev`), `pnpm run skills` | First runs `skl-x update` and `skl-x rm .` (removes all project skills), then installs skills via `skl-x add` for Codex and Claude Code; uses the network |
| `session-start.sh` | Claude Code `SessionStart` hook (`startup`) | Quietly runs `pnpm run skills` and returns `reloadSkills` so a new session sees fresh skills; hook stdout enters the model context, so it prints only JSON |
| `supabase-local.sh` | `pnpm run supabase:local` | Starts local Supabase (Docker in colima) with workdir `~/.cache/storypoker-supabase` (symlink to `supabase/`), writes `.env/.env.test` if missing or pointing to a different URL (the first replaced file remains in `.env.test.bak`), and recreates the e2e user |
| `visual-compare.sh` | `pnpm run test:visual [<ref> [<playwright args>]]`, `pre-squash.sh` | Captures the `visual` project at `<ref>` (default `origin/main`) as a baseline in `test-results/visual-baselines/` and compares it with the working tree; arguments after `<ref>` go to both Playwright runs; the `<ref>` build uses `git archive` in `test-results/visual-base-src`, which the script removes immediately after `vite build` |
| `pre-squash.sh` | `pnpm run test:pre-squash [<ref>]`, before PR squash | Runs `supabase:local` on the host, copies the tree (with `.git`, without `node_modules`/`test-results`/`dist`) to `test-results/pre-squash-src`, then runs e2e `chromium` + `webkit` and `visual-compare.sh <ref>` (default merge-base with `origin/main`) in a Playwright container (tag = `@playwright/test`, `--network host`, `CI=1` with `--env-file .env/.env.test`, pnpm store in volume `storypoker-pnpm-store`); reports are in `test-results/pre-squash/{e2e,visual}`; removes the copy because agents would load its `AGENTS.md` |
| `clean.sh` | `pnpm run clean` | Removes skills, `node_modules/`, `pnpm-lock.yaml`, `dist/`, `.nuxt/` - a complete reinstall from scratch |
| `generate-icons.ts` | `icons:generate`, `icons:check` (in `test:ci`) | Scans `app/` (`icons/scan.ts` parses `.ts`/`.tsx` through unstable TS 7 API `typescript/unstable/{sync,fs,ast}` - hence the exact `typescript` pin), assembles a subset of Iconify sets in `app/generated/`; `--check` fails if generated output differs from the code. Modules are in `icons/` |
| `audit-icon-build.ts` | `icons:audit-build` (in `test:ci`, CI job `build`) | Checks `dist`: no full Iconify sets or generator in the bundle, gzip budget 25 KiB, baseline `docs/audits/icon-bundle-baseline.json` |

## `skills.sh` - deliberate decisions
- Each skill source is one command with an `-s` list; skill order is canonical, preserve it when editing.
- A disabled skill is marked `\ <name>` in the list instead of being removed or commented out: the argument becomes
  `" <name>"` with a leading space and finds nothing. This is intentional - do not "fix" these lines.
  A commented continuation line would break the command.
- When disabling a skill, remove its name from `AGENTS.md` (Workflow sequences) and nested `AGENTS.md` files:
  an agent must not call a skill absent from `.claude/skills/`. `tests/unit/agentsSkills.spec.ts` checks this.
- `skl-x` is pinned (`skl-x@0.4.12`) in `clean.sh` and `.github/workflows/ci.yml` - update
  both together. `skills.sh` and `skills.local.sh` use the latest `skl-x`: `sln` in the local script
  removes the published copy itself only from 0.4.9 onward.
  The pin does not limit skill freshness: `skl-x add` pulls skills from GitHub.
- Gitignored `scripts/skills.local.sh`, if present, runs after the sentimony sources,
  before installing Supabase, Netlify and shadcn. Subsequent `skl-x add` calls may
  overwrite local substitutions for these skills.
