#!/usr/bin/env sh
set -e

# echo the command in cyan, then run it
run() { printf '\033[0;36m%s\033[0m\n' "$*"; "$@"; }

run npx -y skills -v

# MATTPOCOCK SKILLS
# npx skills add https://github.com/mattpocock/skills -s \
#   \ grill-me \
#   \ grill-with-docs \
#   \ grilling \
#   \ domain-modeling \
#   \ improve-codebase-architecture \
#   -a codex claude-code -y

# SENTIMONY SKILLS
# All at once
# npx skills add sentimony/skills -a codex claude-code -y
# Or each separately
# a "\ " prefix disables a skill on purpose: the leading space makes the name match nothing
run npx skills add https://github.com/sentimony/skills -s \
  scope-triage \
  \ scope-check \
  plan-crafting \
  inline-plan-dev \
  subagent-plan-dev \
  git-worktree-isolation \
  parallel-agents \
  tdd \
  cross-review \
  review-request \
  review-resolution \
  debugging \
  web-debug \
  \ webapp-debugger \
  verification-gate \
  branch-finish \
  commit-all \
  \ gh-switch \
  frontend-crafting \
  vitest \
  typescript \
  echarts \
  prose-crafting \
  dashfix \
  negafix \
  maintaining-agent-context \
  \ secret-hygiene \
  \ skill-crafting \
  -a codex claude-code -y

# skills.local.sh passes --no-list and prints its own listing after the local skills
if [ "$1" != --no-list ]; then
  run npx -y skillio -v
  run npx skillio ls -g
  run npx skillio list
  run npx skillio usage --period 2w
fi
