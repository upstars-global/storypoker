# Reveal round history race

**Spec:** none

**Goal:** `reveal()` пише `round_history` лише з того reveal, чий умовний update (`phase <> 'revealed'`) змінив рядок `room_state` (PR #53).

**Execution:** inline

## Execution record

Branch: 2610262020-dev-session
Verify: PASS full tree d8618cee7012629d4d6a821bdc0b36953608bf44 2026-10-26 22:05
