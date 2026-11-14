# Agent context limits and session learnings

**Spec:** none

**Goal:** гілка переносить session learnings у `tests/AGENTS.md` і `supabase/AGENTS.md` та виправляє в `AGENTS.md`, `scripts/AGENTS.md` і `.codex/config.toml` опис завантаження інструкцій і бюджет Codex 64 KiB.

**Execution:** inline

## Execution record

Branch: 2610262241-dev-session
Verify: PASS full tree abbb70694d4bf614ee47faad6154afc44705aec5 2026-10-26 23:20
Received R1: R1-F1 OUTDATED, R1-F2 REJECT, R1-F3 REJECT, R1-F4 ACCEPT Re-review: needed (merge of main gives a new head)
Ruling: R1-F2 rejected - the verify skill names standalone plan-journals docs/plans/YYYYMMDD-HHMM-<topic>.md - two name styles coexist in docs/plans
Ruling: R1-F3 rejected - the record has the verify skill's standalone plan-journal shape (Branch and Verify lines, no fence, no Base) - the verified tree is traced through the Branch line, not a commit
Round review 1: R1-F1 budget text vs 64 KiB config; R1-F4 newline inside the quoted pg_ctl -o argument
Verify: PASS full tree 6cb0f4d1d678f36d7764ce3354265e2bbe4a4c53 2026-10-27 04:37
Received R2: R2-F1 ACCEPT (PR description only, tree unchanged); Re-review: not needed
Round review 2: R2-F1 CI-check rule change missing from the PR description
