#!/usr/bin/env sh
set -e

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROJECT_ROOT=$(dirname "$SCRIPT_DIR")

cd "$PROJECT_ROOT"

echo "npx -y skl-x@0.4.12 -v" && npx -y skl-x@0.4.12 -v
echo "npx -y skl-x@0.4.12 rm . -y -m sm" && npx -y skl-x@0.4.12 rm . -y -m sm

echo "rm -rf node_modules/" && rm -rf node_modules/
echo "rm -rf pnpm-lock.yaml" && rm -rf pnpm-lock.yaml
echo "rm -rf dist/" && rm -rf dist/
echo "rm -rf .nuxt/" && rm -rf .nuxt/

echo "npx -y skl-x@0.4.12 ls" && npx -y skl-x@0.4.12 ls
