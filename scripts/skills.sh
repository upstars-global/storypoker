#!/usr/bin/env sh
set -e

echo "npx -y skillio -v" && npx -y skillio -v
echo "npx -y skills -v" && npx -y skills -v
echo "npx -y skillio ls" && npx -y skillio ls
echo "npx -y skillio rm . -y" && npx -y skillio rm . -y

# # ANTHROPIC SKILLS
# npx skills add https://github.com/anthropics/skills -s \
#   frontend-design \
#   -a codex claude-code -y
#   # algorithmic-art \
#   # brand-guidelines \
#   # canvas-design \
#   # doc-coauthoring \
#   # skill-creator \
#   # webapp-testing \

# ANTHROPIC CLAUDE-PLUGINS-OFFICIAL
# npx skills add https://github.com/anthropics/claude-plugins-official -s \
#   claude-md-improver \
#   -a codex claude-code -y
#   # agent-development \
#   # claude-automation-recommender \
#   # command-development \
#   # hook-development \
#   # session-report \
#   # skill-development \

# OBRA SUPERPOWERS
npx skills add https://github.com/obra/superpowers -s \
  executing-plans \
  finishing-a-development-branch \
  test-driven-development \
  systematic-debugging \
  verification-before-completion \
  using-git-worktrees \
  requesting-code-review \
  subagent-driven-development \
  dispatching-parallel-agents \
  receiving-code-review \
  -a codex claude-code -y
  # brainstorming \
  # writing-plans \
  # writing-skills \

# SENTIMONY SKILLS
npx skills add https://github.com/sentimony/skills -s \
  scope-triage \
  plan-crafting \
  web-debug \
  vitest \
  typescript \
  echarts \
  dashfix \
  negafix \
  commit-all \
  maintaining-agent-context \
  frontend-crafting \
  -a codex claude-code -y

# # BORGHEI PROJECT-MANAGEMENT
# npx skills add https://github.com/borghei/claude-skills -s \
#   agile-coach \
#   scrum-master \
#   sprint-retrospective \
#   summarize-meeting \
#   -a codex claude-code -y
#   # pm-interview-prep \
#   # cycle-time-analyzer \
#   # senior-pm \
#   # pm-onboarding \
#   # metrics-dashboard \
#   # interview-synthesis \
#   # pm-1on1s \
#   # people-analytics \

# BLADER HUMANIZER
# npx skills add blader/humanizer -a codex claude-code -y

# OBRA THE-ELEMENTS-OF-STYLE
# npx skills add obra/the-elements-of-style -s writing-clearly-and-concisely -a codex claude-code -y

# LEONXLNX TASTE-SKILL
# npx skills add https://github.com/Leonxlnx/taste-skill -s design-taste-frontend -a codex claude-code -y

# PBAKAUS IMPECCABLE
# npx skills add https://github.com/pbakaus/impeccable -s impeccable -a codex claude-code -y

# VERCEL-LABS AGENT-SKILLS
# npx skills add https://github.com/vercel-labs/agent-skills -s web-design-guidelines -a codex claude-code -y

# MATTPOCOCK SKILLS
npx skills add https://github.com/mattpocock/skills -s \
  grill-me \
  grill-with-docs \
  grilling \
  domain-modeling \
  -a codex claude-code -y
  # writing-for-agents \

echo ""
echo "npx -y skillio ls" && npx -y skillio ls
