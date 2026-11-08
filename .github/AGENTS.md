# .github/AGENTS.md

PR auto-review (`workflows/pr-auto-review.yml`). General CI (`ci.yml`) is described in the root `AGENTS.md`.

The workflow is self-contained (there is no shared package with other repositories) and uses the
`so-upstars` account, the `SO_UPSTARS_PR_TOKEN` secret, and Story Poker CI. Repository variables
(Settings -> Variables) set the model and effort; changing them does not require a PR. The
`Resolve review model and effort` step validates the values and fails with `::error` before
starting the agent:

1. `CLAUDE_REVIEW_MODEL` - model ID, defaults to `claude-sonnet-5-5`; format `[a-z0-9][a-z0-9._:/-]*`
   with an optional `[1m]` suffix, up to 100 characters.
2. `CLAUDE_REVIEW_EFFORT` - `low`, `medium`, or `high`, defaults to `medium`.

`REVIEW_SKILLS_REF` can pin a full SHA; otherwise the latest `cr-request` release is used.

Automatic retries require a new head and new or unresolved previous Critical or Important findings
in the last marked review. The default limit is 5 `so-upstars` reviews per PR, including manual
reviews. One valid `auto-review-rounds-N` label overrides the limit; ambiguous or invalid labels
stop the gate. A `so-upstars` review request and `workflow_dispatch` bypass the counter while
keeping the other checks. `skip-auto-review`, drafts, forks, and PRs from bots and `so-upstars`
are skipped. GitHub does not allow requesting a review from the PR author: a live
`review_requested` check requires a PR from another account.

Green CI means a completed `pull_request` run on the full head SHA with all five app jobs successful:
`Lint`, `Typecheck`, `Unit tests`, `Build`, `Public pages load`, as well as `Review workflow fixtures`.
A missing job also means failure. E2E and Visual remain in local `test:pre-squash`. `Claude review`
is an advisory status.

The read-only agent has no shell or `gh`, does not read `.git/`, and receives only the workspace
and the prepared skill (`blockReadsOutsideWorkingDirectories`), without a write PAT. Prepare
removes local Claude configuration at every depth, including base copies, and prepares
`.auto-review/`: diff, base, tree, PR metadata, reviews, comments, and participant replies. The
agent treats thread text as untrusted. This path is reserved: a PR tracking it stops the job. The
agent writes only `review.md`, `review-actions.json`, and `comments.json`; exact `Edit` and `Write`
permissions are allowed for each because `Edit` alone cannot create a new file.

Publish validates the head, structure, verdicts, counters, footer, and token-like strings; a human
reads the prose. This is an accepted trade-off, not a review defect: the status is advisory. The
footer accepts the current signature/Next step order and the older signature-last order for a skill
override; it removes the reason after ` · ` while retaining the chain and findings. This is an
accepted trade-off, not a review defect. Only trusted publication steps receive the PAT and verify
its owner is `so-upstars`; this guarantee applies to the workflow copy from main, since anyone who
pushes the branch can change the PR copy.

`SO_UPSTARS_PR_TOKEN` and `CLAUDE_CODE_OAUTH_TOKEN` are active secrets. Review and reply require
Pull requests RW; accepted deferrals with an issue also require Issues RW and org approval. Do not
automatically expand PAT permissions; metadata GET does not prove write access. An administrator
can see org approval; actual actions and API readback confirm functionality.

The ledger in the review body stores structured findings, dispositions, and action progress. A
rerun resumes recorded actions; complete independently reads their evidence. Only the API-only
`resolve_threads` job receives a short-lived GITHUB_TOKEN with `contents: write` and
`pull-requests: write`: no checkout, PAT, artifacts, or model output parser. Thread IDs come from
GitHub metadata. `github-actions[bot]` resolves threads; `so-upstars` writes reviews, issues,
replies, the ledger, and the merged summary. This is an accepted trade-off, not a review defect:
a long-lived Contents-write PAT could push to main. The post-merge summary reads GitHub history
without checkout or a model run.

`workflow_run` executes the copy from main, PR events use the copy from the PR branch, and dispatch
uses the selected ref. After creating a PR that changes the workflow, wait for CI and its
`workflow_run` to complete, then request `so-upstars` to test the PR copy. An early request can
hand execution to the old main copy. Check the source CI run and full PR head in the gate log: the
`workflow_run` head itself may be main. Concurrency separates head SHAs and cancels stale reviews
of the same PR. Dispatch concurrent with an event for the same head can leave an error without a
review; Re-request review restores execution. This is an accepted trade-off, not a review defect:
an incorrect review is not published.

A usage limit for the `CLAUDE_CODE_OAUTH_TOKEN` account with a reset message requires waiting,
then removing and re-adding the review request. This is an external quota; do not change the
workflow because of it. Verify an action SHA pin with a `# vN` comment using `git ls-remote --tags`;
the reviewer has no network access, so include the result in the PR description.

CI runs fixtures for the actual workflow steps: gates, limits, footer, ledger, resolver, recovery,
and merged summary. Locally: `python3 -m unittest discover -s scripts -p 'test_claude_review.py'`.
Both direct file execution and unittest discovery collect all test classes.

Unresolved previous Critical/Important findings in the canonical ledger also support an automatic
retry; REJECT and a fully verified accepted deferral no longer block it. An accepted deferral is
checked against the snapshot taken before the model: a change to the proposal after that snapshot
stops the action. After a publication error, the finalizer completes only its own pending status;
it does not overwrite a newer run.

Names in `docs/plans/` use two styles: the `plan-craft` and `verify` skills write
`YYYYMMDD-HHMM-<topic>.md`, while older plans use `YYYY-MM-DD-<slug>.md`. This is an accepted
trade-off, not a review defect: old plans are not renamed, and new ones do not follow the old style.
