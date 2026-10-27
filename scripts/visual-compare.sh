#!/bin/sh
# Renders the visual screens of a base revision (origin/main by default) and of the working tree,
# then compares them. No baseline PNGs live in the repo: the base render is the reference.
set -e

repo="$(cd "$(dirname "$0")/.." && pwd)"
base_ref="${1:-origin/main}"
[ $# -gt 0 ] && shift
base_src="$repo/test-results/visual-base-src"
base_dist="$repo/test-results/visual-base-dist"
shots="$repo/test-results/visual-baselines"

cd "$repo"
git rev-parse --verify --quiet "$base_ref^{commit}" >/dev/null || { echo "unknown revision: $base_ref" >&2; exit 1; }
# Playwright reuses a server already on the visual port outside CI, so both passes would shoot it.
# It probes localhost, which may resolve to either loopback address, so both are checked.
node -e "const net = require('net'); let left = 2; for (const host of ['127.0.0.1', '::1']) net.connect(4174, host).on('connect', () => process.exit(1)).on('error', () => { if (--left === 0) process.exit(0) })" \
  || { echo "port 4174 is busy; stop that server first" >&2; exit 1; }
rm -rf "${base_src:?}" "${base_dist:?}" "${shots:?}"
# The copy carries AGENTS.md files of the base revision, which agents would pick up as instructions.
trap 'rm -rf "${base_src:?}"' EXIT
trap 'exit 130' INT TERM
trap 'exit 129' HUP
mkdir -p "$base_src"
git archive "$base_ref" | tar -x -C "$base_src"

eval "$(node --input-type=module -e "
const m = await import('$repo/tests/visual/support/fakeSupabase.ts')
console.log('url=' + m.VISUAL_SUPABASE_URL + ' key=' + m.VISUAL_SUPABASE_KEY)
")"
(
  cd "$base_src"
  CI=1 pnpm install --frozen-lockfile --ignore-scripts
  VITE_SUPABASE_URL="$url" VITE_SUPABASE_KEY="$key" pnpm exec vite build --outDir "$base_dist" --emptyOutDir
)
rm -rf "${base_src:?}"

echo "rendering $base_ref as the reference"
STORYPOKER_VISUAL_DIST="$base_dist" pnpm exec playwright test --project=visual --update-snapshots=all "$@" \
  || echo "some screens failed on $base_ref; they have no reference and fail below"

echo "comparing the working tree with $base_ref"
pnpm exec playwright test --project=visual "$@"
