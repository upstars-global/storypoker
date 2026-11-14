# Story Poker audits

This folder holds completed audits as dated historical snapshots. Add a new audit in a separate
`YYYY-MM-DD-<topic>-audit.md` file; do not rewrite previous findings because of later code changes.

A factual error found after an audit is completed may be corrected with an explicit dated note.
A reassessment of the current state is a new audit.

Remediation status is tracked in [`docs/roadmap.md`](../roadmap.md).

## Index

1. [2026-09-07 - frontend audit](2026-09-07-frontend-design-audit.md): `frontend-crafting` 1.2.1,
   static review of all 33 `.vue` files and `main.css` - 2 systemic and 9 isolated findings.
   Systemic findings: zero `prefers-reduced-motion` with three `@keyframes` (confetti, winner blink,
   reel jam), and `lang="uk"` hardcoded in `index.html` without following the language switcher.
   Isolated findings: room without `<main>` or `<h1>`, three icon-only buttons with `aria-describedby`
   instead of a name, a flag toggle in `/ffc` inaccessible from the keyboard, a missing skip link,
   `AppModal` without focus return to the trigger (9 modals), a `role="menu"` menu without arrow keys,
   silent vote rollback, a room without its own `<title>`, and hardcoded Goal Clarity thresholds.
   There were no runtime checks: contrast across six `palette × theme` combinations, touch targets,
   and horizontal overflow remain open for a `web-debug` audit.

2. [2026-09-09 - icon rendering A/B](2026-09-09-icon-rendering-ab.md): execution of the A/B plan,
   Tasks 0-4 on an isolated harness with a 15-player fixture, followed by migration. Pure mask passed
   the size, DOM, and network thresholds but failed the visual threshold: `app:town-hall` alone mixes
   `currentColor` with explicit colors and loses the flag in mask mode. The decision was **mixed**:
   CSS mask for monochrome icons, inline SVG for color exceptions. Implemented in production and
   measured on the real graph: -5 423 B gzip (JS+CSS), `@iconify/vue` removed from the bundle and
   `dependencies`, zero visual differences.

## Data

1. [`icon-bundle-baseline.json`](icon-bundle-baseline.json): gzip entry chunk + CSS at the last inline-SVG
   commit. `npm run icons:audit-build` calculates the delta against it with a 25 KB gzip budget. The baseline
   was recaptured during migration to masks: rendering moves bytes from JS to CSS, so a budget based only on
   the entry chunk would no longer see style growth.

   The measurement depends on the environment: without `VITE_SUPABASE_URL`/`VITE_SUPABASE_KEY`, Vite substitutes
   `undefined`, the condition folds into an unconditional `throw`, and `createClient` becomes unreachable and
   is tree-shaken along with `@supabase/auth-js`. The build is then ~55 KB lighter than production. Both the
   baseline and `icons:audit-build` are therefore measured with the same placeholders as the `Build` job:
   `VITE_SUPABASE_URL=https://placeholder.supabase.co` and `VITE_SUPABASE_KEY=placeholder`. The values affect
   byte counts and must not change independently of the baseline. The audit fails if it cannot find the Supabase
   auth client in the graph.

   This is a measurement, not an audit. The project has one entry chunk and it is not split, so non-icon growth
   also consumes this budget. When the budget is exhausted for reasons other than icons, recapture the baseline
   from current `main` with a clean `npm ci`:

   ```bash
   npm ci
   VITE_SUPABASE_URL=https://placeholder.supabase.co VITE_SUPABASE_KEY=placeholder npm run build
   npm run icons:audit-build   # entryChunk.jsCssGzipBytes in test-results/icon-rendering/bundle.json
   ```

   Record `entryChunk.jsCssGzipBytes` as the new `gzipBytes`, update `commit`, and explain why in the same
   commit. Do not silently raise the threshold in the script.

## Conventions

1. **Language:** English, as for the rest of the internal documentation (`AGENTS.md`, `DESIGN.md`, `docs/`). Exact historical quotations may remain in their original language.
2. **Audit header:** date, branch with SHA, skill and version with workflow, scope in files, evidence format
   (static analysis versus runtime), and a link to the previous audit on the same topic.
3. **Two separate layers:** visual and experience critique (Layer 1) is kept separate from technical findings
   (Layer 2).
4. **Every finding** includes location, issue, severity (P0-P3), user impact, standard, and remediation,
   including P3 findings.
5. **Systemic findings** (the same defect in three places or a common cause in a token or component) precede
   isolated findings.
6. **A clean baseline** with a named scope of inspection is evidence, not an empty section.
7. **An audit does not change code.** Remediation is described; fixes belong to a separate session.
