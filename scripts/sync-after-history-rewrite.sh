#!/usr/bin/env bash
# Run this once after the repo history on `main` was rewritten
# (the .claude/ settings files were removed from every commit).
#
# What it does:
#   1. Backs up your local .claude/ folder (it would be wiped by reset --hard).
#   2. Creates a safety branch pointing at your current main.
#   3. Stashes any uncommitted/untracked changes.
#   4. Fetches the new history and resets main to origin/main.
#   5. Restores .claude/ (now gitignored, stays out of future commits).
#   6. Pops the stash. Reports any local commits that need manual replay.
#
# Safe to re-run: it only acts if there is something to do.

set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

REMOTE="origin"
BRANCH="main"
TS="$(date +%Y%m%d-%H%M%S)"
BACKUP_BRANCH="backup/before-claude-cleanup-$TS"
CLAUDE_BACKUP="$(mktemp -d -t claude-backup-XXXXXX)"

CURRENT_BRANCH="$(git symbolic-ref --short HEAD)"
if [ "$CURRENT_BRANCH" != "$BRANCH" ]; then
  echo "Run this on '$BRANCH'. You are on '$CURRENT_BRANCH'."
  echo "Switch with: git switch $BRANCH"
  exit 1
fi

echo "==> Creating safety branch: $BACKUP_BRANCH"
git branch "$BACKUP_BRANCH"

if [ -d .claude ]; then
  echo "==> Backing up .claude/ to $CLAUDE_BACKUP"
  cp -R .claude "$CLAUDE_BACKUP/"
fi

STASH_CREATED=false
if [ -n "$(git status --porcelain)" ]; then
  echo "==> Stashing local changes (including untracked)"
  git stash push -u -m "auto-stash-before-cleanup-$TS"
  STASH_CREATED=true
else
  echo "==> Working tree clean, no stash needed"
fi

echo "==> Fetching $REMOTE"
git fetch "$REMOTE"

LOCAL_AHEAD_COUNT="$(git rev-list --count "$REMOTE/$BRANCH..HEAD" || echo 0)"

echo "==> Resetting $BRANCH to $REMOTE/$BRANCH"
git reset --hard "$REMOTE/$BRANCH"

if [ -d "$CLAUDE_BACKUP/.claude" ]; then
  echo "==> Restoring .claude/ from backup"
  mkdir -p .claude
  cp -R "$CLAUDE_BACKUP/.claude/." .claude/
fi

if $STASH_CREATED; then
  echo "==> Popping stash"
  if ! git stash pop; then
    echo
    echo "Stash pop hit conflicts. Resolve them, then run: git stash drop"
  fi
fi

echo
echo "Done. Local repo is in sync with the rewritten history."

if [ "$LOCAL_AHEAD_COUNT" -gt 0 ]; then
  echo
  echo "Heads up: you had $LOCAL_AHEAD_COUNT local commit(s) ahead of the old origin/$BRANCH."
  echo "They are preserved on branch '$BACKUP_BRANCH'. Replay them onto the new main, e.g.:"
  echo "  git log $BACKUP_BRANCH --not $REMOTE/$BRANCH --oneline"
  echo "  git cherry-pick <commit-hash>   # for each commit, oldest first"
fi

echo
echo "When you no longer need the safety net (a few days from now):"
echo "  git branch -D $BACKUP_BRANCH"
echo "  rm -rf $CLAUDE_BACKUP"
