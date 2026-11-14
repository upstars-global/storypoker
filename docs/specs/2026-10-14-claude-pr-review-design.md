# Automatic PR review by Claude on behalf of `so-upstars`

**Date:** 2026-10-14
**Status:** approved (plan - `docs/plans/2026-10-14-claude-pr-review.md`)
**Source:** owner request in the 2026-10-14 session

## Context

PR review currently starts manually from a local session: an agent runs the `review-request` skill and posts a comment
through `gh` using the account with `GH_ACC=so-upstars` in `.env/.env`. This approach has two drawbacks:

1. **It depends on the laptop.** There is no review until someone requests it in a session.
2. **The active `gh` account is shared.** Other sessions on the same machine switch the active account, so a comment
   was once posted as `io-upstars` and had to be deleted and posted again.

## Goal

Every non-draft PR in `upstars-global/storypoker` with a green `CI` on its current head automatically receives one
English-language comment with the `review-request` skill result, authored by `so-upstars`.

## Decision

A GitHub Actions workflow `.github/workflows/claude-review.yml` using the official `anthropics/claude-code-action@v1`.

1. **Triggers:** `workflow_run` for the `CI` workflow with `completed` (green CI after a push or PR opening), and
   `pull_request` with `ready_for_review` (a draft became ready and its CI is already green).
2. **Job `gate`** (read-only `GITHUB_TOKEN` only) lets through only an open non-draft PR from a branch in the same
   repo, whose author is not a bot, whose latest `CI` (`ci.yml`, event `pull_request`) on the current `head.sha` is
   `success`, and which has no comment from `so-upstars` with the marker `<!-- claude-review -->`. Failed or cancelled
   CI, CI on a `push` to `main`, and a stale run for an old head are skipped.
3. **One review per PR:** the marker is on the first line of the comment. Subsequent pushes with green CI do not
   repeat the review; to get a new one, delete the comment and rerun `CI`.
4. **Identity:** a fine-grained PAT for the `so-upstars` account in the `SO_UPSTARS_PR_TOKEN` secret goes into both
   the action's `github_token` and `GH_TOKEN` for `gh pr comment`. PAT access is limited to this repository: Pull
   requests RW, Contents R (Metadata R is added automatically). The `Check reviewer identity` step checks that
   `gh api user` == `so-upstars` before Claude starts. `gh-switch` is unnecessary in CI and is not installed.
5. **Model access:** the `CLAUDE_CODE_OAUTH_TOKEN` secret (issued by `claude setup-token`).
6. **Skill:** skills are not committed; `postinstall` installs them. The workflow installs only `review-request` with
   the same `skl-x@0.4.8` as `scripts/skills.sh`, and fails if `.claude/skills/review-request/SKILL.md` does not appear.
   Without the skill Claude publishes nothing; the comment ends with `Reviewed with: review-request skill`, and the
   `Verify review comment` step fails the job if no such comment from `so-upstars` exists.
7. **Review boundary:** `base.sha...head.sha` from the PR at gate time (from the merge base); checkout of `head.sha`;
   checkout with `fetch-depth: 0` so both commits are local.
8. **Agent tools:** repository reads, git reads, `gh pr view/diff/comment`, Skill, and subagents only. No repository
   file edits (only a temporary comment body in `/tmp`), pushes, or other GitHub writes.
9. **Concurrency:** one group per head branch with `cancel-in-progress`, shared by both triggers.

## Security

1. `workflow_run` executes the workflow file from `main` and has access to secrets, so the gate filters out fork PRs
   and bot PRs before checkout. PR code is not executed (there is no `npm install`), but Claude Code reads
   `AGENTS.md`/`CLAUDE.md` and `.claude/` from the checkout; the risk is the same as for any PR from a collaborator
   with write access.
2. `claude-code-action` also checks the `workflow_run` actor's write access.
3. A comment created by the PAT triggers neither `pull_request` nor `CI`, so the workflow does not trigger itself.
4. The diff content is data, not instructions (`review-request`, §Security Model); tools are limited by
   `--allowedTools`, so prompt injection in the diff cannot write outside `gh pr comment`.

## Out of scope

1. Repeated review on every push, inline comments, automatic fixes (`review-resolution`).
2. A GitHub App with a separate `[bot]` account: `so-upstars` was chosen deliberately.
3. Required check: the job is not part of `main` protection.

## Owner's manual steps

1. Create a fine-grained PAT for `so-upstars` (resource owner `upstars-global`) with the permissions above, wait for
   organization administrator approval, and add it as `SO_UPSTARS_PR_TOKEN`.
2. Run `claude setup-token` and add the result as `CLAUDE_CODE_OAUTH_TOKEN`.

Without the secrets, the `review` job fails at the action step; this does not affect required checks. `workflow_run`
triggers only from a workflow file in `main`, so the trigger is inactive until the merge.

## Acceptance criteria

1. A non-draft PR from a branch in this repo receives one comment from `so-upstars` with the marker and the four
   `review-request` verdicts after green `CI`.
2. Red or cancelled `CI` produces no review; after a fix and green `CI`, a review appears.
3. A draft PR receives no review; switching it to ready with green `CI` produces one.
4. A subsequent push with green `CI` does not add a second comment.
5. The comment ends with `Reviewed with: review-request skill`; without it the `review` job is red.
6. For a fork or bot PR, `gate` completes with `review=false` and the `review` job is `skipped`.
