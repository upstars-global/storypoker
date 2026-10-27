# Pre-squash review fixes

**Spec:** none

**Goal:** Fix PR #57 review R2 findings in scripts/pre-squash.sh and scripts/visual-compare.sh: keep the e2e report, clean the AGENTS.md-carrying copies on any exit, fail fast on container setup, explain a missing origin/main.

**Execution:** inline

## Execution record

Branch: 2610262356-dev-session
Verify: PASS full tree be0ab174add8ebd27f53ae41e252074b8e212c55 2026-10-27 03:11
Received R3: R3-F1 ACCEPT, R3-F2 ACCEPT Re-review: not needed
Ruling: R2-F2 stays rejected - pre-squash supports colima only, where the host removed root-written files in every run - a native Linux Docker user gets a leftover copy to delete by hand
Round review 3: R3-F1 Ctrl-C waits for the container; R3-F2 HUP skips the EXIT trap
Verify: PASS full tree 04a8ce1fdd6736586dfea217b9e9d6cd89f544b4 2026-10-27 03:46
Received R4: R4-F1 REJECT Re-review: not needed
Ruling: R4-F1 rejected - docker CLI 29.9.2 exits on a process-group SIGINT during an image pull although started as a background job; no container and no copy stay behind, reproduced on the real trap lines
Round review 4: R4-F1 Ctrl-C during the image pull may orphan the docker CLI
Verify: PASS full tree 04a8ce1fdd6736586dfea217b9e9d6cd89f544b4 2026-10-27 03:56
