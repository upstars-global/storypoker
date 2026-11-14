# .github/AGENTS.md

PR auto-review (`workflows/auto-reviewer.yaml`, named `Auto review`). General CI (`ci.yml`) is documented in the root
`AGENTS.md`.

The file is a thin caller of the shared reusable workflow
`sentimony/github-workflows/.github/workflows/auto-reviewer-shared.yaml@v0.0.7`; there is no local copy of the logic
(owner decision, issue #80). The gate, agent, permissions, ledger, footer, and thread resolver live upstream;
their contract is in README and `AUTO_REVIEWER_SHARED_TRANSPORT.md` in `sentimony/github-workflows` at the selected
tag. The caller sets no `concurrency`, `runs-on`, or `steps`; `permissions` is the ceiling from README.

To update the pin, select a new tag `vX.Y.Z` (tags are immutable), read `CHANGELOG.md` between the tags, replace
the ref in `uses:`, and check inputs and secrets against README at that tag. The upstream caller check
(`scripts/check_auto_reviewer_shared_contract.py`, requires Ruby 3) lives only in the upstream repository: extract
`git archive <tag>` into an empty directory and run it with `--caller <this file>` and `--required-ci-job` for each job.
`actionlint .github/workflows/*.y*ml` is required.

Story Poker adapter: `reviewer: so-upstars`, PAT `SO_UPSTARS_PR_TOKEN` passed as `AUTO_REVIEWER_TOKEN`,
`CLAUDE_CODE_OAUTH_TOKEN` passed unchanged. The `Auto Reviewer` status is advisory, not required; its name is set upstream.
CI source: `ci.yml`, event `pull_request`; green CI means all five jobs `Lint`, `Typecheck`, `Unit tests`,
`Build`, and `Public pages load` on the full head SHA. E2E and Visual remain in the local `test:pre-squash`.

Behavior defined upstream:

1. The default limit is 10 reviews by `so-upstars` per PR; repository variable `CLAUDE_REVIEW_MAX_ROUNDS`
   is unset (do not restore the old value 5). One `auto-review-rounds-N` label overrides the limit.
2. `review-changed-head: true`: a new head after a clean review is reviewed only if the PR's own diff
   (`base...head`) changed; a clean merge of `main` into the branch does not trigger a review, changes to PR files do.
   Without a clean review, a repeat requires new or unresolved Critical/Important findings.
3. A review request for `so-upstars` and `workflow_dispatch` bypass the counter. Manual invocation:
   `gh workflow run auto-reviewer.yaml -R upstars-global/storypoker -f pr=<n>` (`--ref <branch>` for a branch copy).
4. Model `claude-sonnet-5-5`, effort `medium`; variables `CLAUDE_REVIEW_MODEL`, `CLAUDE_REVIEW_EFFORT`;
   `REVIEW_SKILLS_REF` pins the full SHA of the `cr-request` skill.
5. Draft, fork, bot-authored, and `so-upstars`-authored PRs are skipped, as is `skip-auto-review`. GitHub does not allow
   requesting a review from the PR author: a live `review_requested` check needs a PR from another account.

`workflow_run` executes the copy from main, PR events the PR branch copy, and dispatch the selected ref;
`workflow_dispatch` appears when the file is on the default branch (before that, use `--ref`). Secrets
`SO_UPSTARS_PR_TOKEN` and `CLAUDE_CODE_OAUTH_TOKEN` are valid; do not expand PAT permissions automatically. A usage limit
on the `CLAUDE_CODE_OAUTH_TOKEN` account with a reset message requires waiting, then removing and re-adding the review request.

Names in `docs/plans/` use two styles: skills `plan-craft` and `verify` write `YYYYMMDD-HHMM-<topic>.md`, older
plans use `YYYY-MM-DD-<slug>.md`. This is an accepted trade-off, not a review defect: older plans are not renamed,
and new ones are not forced into the older style.
