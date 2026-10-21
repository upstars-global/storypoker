#!/usr/bin/env sh
set -e

npx -y --prefer-online skl-x -v
# npx -y skills -v
npx -y --prefer-online skl-x rm . -y -m sm

# A "\ name" line disables that skill on purpose: skl-x gets " name" and skips it

# SENTIMONY SKILLS https://github.com/sentimony/skills
npx -y --prefer-online skl-x add sentimony/skills -s \
  scope-triage \
  scope-check \
  plan-crafting \
  inline-plan-dev \
  \ subagent-plan-dev \
  git-worktree-isolation \
  \ parallel-agents \
  tdd \
  cross-review \
  review-request \
  review-resolution \
  debugging \
  web-debug \
  \ webapp-debugger \
  verification-gate \
  branch-finish \
  \ commit-all \
  \ gh-switch \
  frontend-crafting \
  vitest \
  typescript \
  echarts \
  prose-crafting \
  dashfix \
  negafix \
  maintaining-agent-context \
  secret-hygiene \
  \ skill-crafting \
  -a codex claude-code -y -m sm

# SENTIMONY AGENTIC WORKFLOW https://github.com/sentimony/agentic-workflow
npx -y --prefer-online skl-x add sentimony/agentic-workflow -s \
  cr-request \
  cr-received \
  session-learnings \
  -a codex claude-code -y -m sm

# # VERCEL-LABS AGENT-BROWSER https://github.com/vercel-labs/agent-browser
# npx -y --prefer-online skl-x add vercel-labs/agent-browser -s \
#   agent-browser \
#   -a codex claude-code -y -m sm

# SUPABASE AGENT-SKILLS https://github.com/supabase/agent-skills
npx -y --prefer-online skl-x add supabase/agent-skills -s \
  supabase \
  supabase-postgres-best-practices \
  -a codex claude-code -y -m sm

# LOCAL SKILLS
skills_local="$(dirname "$0")/skills.local.sh"
if [ -f "$skills_local" ]; then
  sh "$skills_local"
fi

# npx -y --prefer-online skl-x -v
# npx -y --prefer-online skl-x ls -g
# npx -y --prefer-online skl-x ls
# npx -y --prefer-online skl-x cst
# npx -y --prefer-online skl-x usg -p 2d
