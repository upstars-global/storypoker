# Claude PR Review Implementation Plan

**Goal:** Every non-draft PR with a passing `CI` receives an automatic comment with the result of `review-request` from `so-upstars`.

**Architecture:** A separate `.github/workflows/claude-review.yml` workflow uses `anthropics/claude-code-action@v1`;
the skill is installed in the job through `skl-x@0.4.8`; the identity is the `so-upstars` PAT in `github_token` and `GH_TOKEN`.

**Spec:** `docs/specs/2026-10-14-claude-pr-review-design.md`

**Tech Stack:** GitHub Actions, `claude-code-action@v1`, `skl-x@0.4.8`, `gh`. No new npm dependencies.

## Global Constraints

1. Finish with `npm run test:ci`.
2. At the time of this plan, commits, PRs, comments and the workflow prompt are in English; `docs/` and `AGENTS.md` are in Ukrainian.
3. Use `git add` only for files in the **Files** block; leave unrelated uncommitted changes untouched.
4. Do not print or commit secrets.

---

### Task 1: Workflow

**Files:**

1. Create: `.github/workflows/claude-review.yml`

**Steps:**

1. [x] **Step 1.1:** Triggers `workflow_run` (`CI`, `completed`) and `pull_request` (`ready_for_review`), with `concurrency` on the head branch.
2. [x] **Step 1.2:** Job `gate`: an open non-draft PR from this repository, the author is not a `Bot`, the latest `ci.yml` on `head.sha` is `success`, and there is no comment from `so-upstars` with the marker `<!-- claude-review -->`. Output: PR number, base and head.
3. [x] **Step 1.3:** `actions/checkout@v4` on `head.sha` with `fetch-depth: 0`, `setup-node@v4` (24), and installation of `review-request`.
4. [x] **Step 1.4:** `claude-code-action@v1` with `claude_code_oauth_token`, `github_token`, a prompt bounded by `base.sha...head.sha`, and `--allowedTools` limited to reading and `gh pr view/diff/comment`.
5. [x] **Step 1.5:** YAML parses; the gate script passes `bash -n` and a dry run on real PRs (#36 - `review=true`, #35 - closed, empty `pull_requests` and fork - skipped).
6. [x] **Step 1.6:** Skill check: `test -f .claude/skills/review-request/SKILL.md` after installation; the prompt says to publish nothing without the skill and to end the body with `Reviewed with: review-request skill`; the `Verify review comment` step searches for this line in comments from `so-upstars`.
7. [x] **Step 1.7:** The `Check reviewer identity` step before the action checks that the secret is set and `gh api user` == `so-upstars`.

### Task 2: Documentation

**Files:**

1. Create: `docs/specs/2026-10-14-claude-pr-review-design.md`
2. Create: `docs/plans/2026-10-14-claude-pr-review.md`
3. Modify: `AGENTS.md` (the CI paragraph)

**Steps:**

1. [x] **Step 2.1:** Spec with the decision, security, manual steps and acceptance criteria.
2. [x] **Step 2.2:** Two lines in `AGENTS.md` about the new non-required workflow and its secrets.

### Task 3: Verification and PR

1. [x] **Step 3.1:** `npm run test:ci` passes.
2. [x] **Step 3.2:** Commit, push the `claude-pr-review` branch, PR from `so-upstars`.
3. [ ] **Step 3.3 (owner):** Add the `SO_UPSTARS_PR_TOKEN` and `CLAUDE_CODE_OAUTH_TOKEN` secrets.
4. [ ] **Step 3.4:** After the merge and secrets are in place, open a test non-draft PR and check the acceptance criteria in the spec. Before the merge, `workflow_run` is inactive, so this PR will not receive a review itself.
