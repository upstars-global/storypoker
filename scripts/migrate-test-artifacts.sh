#!/usr/bin/env sh
set -e

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROJECT_ROOT=$(dirname "$SCRIPT_DIR")

# Legacy root-level artifact dirs (pre test-results/ consolidation).
# Drop this script and the matching .gitignore lines once every clone has run it.
migrate() {
  LEGACY="$PROJECT_ROOT/$1"
  TARGET="$PROJECT_ROOT/test-results/$1"

  [ -d "$LEGACY" ] || return 0

  mkdir -p "$PROJECT_ROOT/test-results"
  if [ -e "$TARGET" ]; then
    echo "rm -rf $1/ (test-results/$1 already exists)" && rm -rf "$LEGACY"
  else
    echo "mv $1/ test-results/$1" && mv "$LEGACY" "$TARGET"
  fi
}

migrate coverage
migrate playwright-report
