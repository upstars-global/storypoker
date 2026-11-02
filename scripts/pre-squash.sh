#!/bin/sh
# The suites CI does not run: e2e (chromium, webkit) against a local Supabase and the visual compare.
# Both run in the Playwright image, because WebKit on macOS is a frozen build and macOS renders differ from Linux.
set -e

repo="$(cd "$(dirname "$0")/.." && pwd)"
cd "$repo"
base_ref="${1:-$(git merge-base origin/main HEAD 2>/dev/null || true)}"
[ -n "$base_ref" ] || { echo "no merge-base with origin/main; fetch it or pass <ref>" >&2; exit 1; }
version="$(node -p "require('@playwright/test/package.json').version")"
image="mcr.microsoft.com/playwright:v$version-noble"
src="$repo/test-results/pre-squash-src"
out="$repo/test-results/pre-squash"

docker info >/dev/null 2>&1 || { echo "Docker is not running; start it with: colima start --cpu 4 --memory 6" >&2; exit 1; }
git rev-parse --verify --quiet "$base_ref^{commit}" >/dev/null || { echo "unknown revision: $base_ref" >&2; exit 1; }
# A git worktree has a .git file pointing into the main clone, which the container does not mount.
[ -d "$repo/.git" ] || { echo "run pre-squash from the main checkout, not a git worktree" >&2; exit 1; }

pnpm run supabase:local

# colima mounts only the home directory, so the copy lives under the repo, not in /tmp.
# It keeps .git, which visual-compare.sh needs for git archive of the base revision.
rm -rf "${src:?}" "${out:?}"
# The copy carries AGENTS.md files of this revision, which agents would pick up as instructions.
trap 'rm -rf "${src:?}"' EXIT
# Without a tty the docker CLI does not stop the container on Ctrl-C, and sh runs a trap only after its
# foreground command returns, so the container runs in the background and the trap removes it.
# A process-group SIGINT also stops the backgrounded docker CLI (checked on docker CLI 29.9.2), so the trap
# does not kill "$!".
name="storypoker-pre-squash-$$"
trap 'docker rm -f "$name" >/dev/null 2>&1; exit 130' INT TERM
trap 'docker rm -f "$name" >/dev/null 2>&1; exit 129' HUP
mkdir -p "$src" "$out"
tar -C "$repo" --exclude=./node_modules --exclude=./test-results --exclude=./dist -cf - . | tar -C "$src" -xf -

# CI=1 gives the worker count and retry of the former CI job; under CI the config skips .env/.env.test,
# so the file goes in through --env-file.
status=0
docker run --rm --name "$name" --network host --ipc host -e CI=1 --env-file "$repo/.env/.env.test" \
  -v "$src:/work" -v "$out:/out" -v storypoker-pnpm-store:/pnpm-store -w /work \
  -e BASE_REF="$base_ref" "$image" bash -c '
    git config --global --add safe.directory /work
    corepack enable >/dev/null || exit 1
    pnpm config set store-dir /pnpm-store >/dev/null
    pnpm install --frozen-lockfile --ignore-scripts || exit 1
    status=0
    pnpm exec playwright test --project chromium --project webkit || status=1
    mkdir -p /out/e2e
    cp -R test-results/playwright test-results/playwright-report /out/e2e 2>/dev/null || true
    sh scripts/visual-compare.sh "$BASE_REF" --workers=4 || status=1
    mkdir -p /out/visual
    cp -R test-results/playwright test-results/playwright-report /out/visual 2>/dev/null || true
    exit $status
  ' &
wait $! || status=$?

[ "$status" -eq 0 ] && echo "pre-squash: e2e and visual passed against $base_ref" \
  || echo "pre-squash: failed; reports are in test-results/pre-squash" >&2
exit "$status"
