# Reveal round history race

**Spec:** none

**Goal:** `reveal()` writes `round_history` only for the reveal whose conditional update (`phase <> 'revealed'`) changed the `room_state` row (PR #53).

**Execution:** inline

## Execution record

Branch: 2610262020-dev-session
Verify: PASS full tree d8618cee7012629d4d6a821bdc0b36953608bf44 2026-10-26 22:05
