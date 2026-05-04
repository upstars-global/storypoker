# Pinia + Realtime Presence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate state management from composables to Pinia stores; replace BD `is_online` column with Supabase Presence; add optimistic vote and reconnect banner.

**Architecture:** Four Pinia stores (`auth`, `room`, `players`, `presence`) each with a single domain responsibility. Realtime events apply differentially to stores (no full refetch). Presence is computed from a Supabase Presence channel + Visibility/Network APIs. Supabase client is exposed via a singleton module so stores work both inside Nuxt and in pure-Vitest tests.

**Tech Stack:** Nuxt 4.4, Vue 3, Pinia (latest stable), `@pinia/nuxt`, Supabase JS, Vitest + happy-dom.

**Spec:** `docs/superpowers/specs/2026-05-04-pinia-presence-design.md`

---

## File Structure

**Create:**
- `app/lib/supabase-instance.ts` — singleton getter/setter for SupabaseClient
- `app/stores/types.ts` — `Player`, `RoomState`, `ConnectionStatus`
- `app/stores/auth.ts` — auth domain
- `app/stores/room.ts` — `room_state` + `applyChange` + reveal/start/saveDeck
- `app/stores/players.ts` — `players[]`, `pendingVotes`, optimistic `castVote`, `applyChange`
- `app/stores/presence.ts` — connection state machine + Supabase Presence + Visibility/Network handlers
- `app/stores/__tests__/players.spec.ts`
- `app/stores/__tests__/room.spec.ts`
- `app/stores/__tests__/presence.spec.ts`
- `app/components/ConnectionBanner.vue`
- `supabase/migrations/002_drop_is_online.sql`
- `vitest.config.ts`
- `tests/setup.ts` — vitest global setup (happy-dom hooks)

**Modify:**
- `nuxt.config.ts` — add `@pinia/nuxt` module
- `app/plugins/supabase.ts` — call `setSupabase(client)`
- `app/app.vue` — mount `<ConnectionBanner />`
- `app/pages/[slug].vue` — thin wrapper around stores
- `app/pages/index.vue` — use `roomStore.create()` instead of inline supabase
- `app/components/AppHeader.vue` — read from `authStore` directly
- `app/components/AuthModal.vue` — call `authStore.signIn/signUp`
- `package.json` — add deps + scripts
- `CLAUDE.md` — new "State Management" section

**Delete:**
- `app/composables/useRoom.ts`
- `app/composables/usePlayer.ts`
- `app/composables/useAuth.ts`

---

## Task 1: Setup Pinia, Vitest, and the supabase singleton

**Files:**
- Modify: `package.json`
- Modify: `nuxt.config.ts`
- Create: `vitest.config.ts`
- Create: `tests/setup.ts`
- Create: `app/lib/supabase-instance.ts`
- Modify: `app/plugins/supabase.ts`

- [ ] **Step 1: Install dependencies**

```bash
npm install pinia @pinia/nuxt
npm install -D vitest happy-dom
```

- [ ] **Step 2: Add test scripts to `package.json`**

Replace the `scripts` block:

```json
"scripts": {
  "build": "nuxt build",
  "dev": "nuxt dev",
  "generate": "nuxt generate",
  "preview": "nuxt preview",
  "postinstall": "nuxt prepare",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 3: Register Pinia in `nuxt.config.ts`**

Modify the `modules` array:

```ts
modules: ['@nuxtjs/tailwindcss', '@pinia/nuxt'],
```

- [ ] **Step 4: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.ts'],
    include: ['app/**/__tests__/**/*.spec.ts'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'app'),
    },
  },
})
```

- [ ] **Step 5: Create `tests/setup.ts`**

```ts
import { beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

beforeEach(() => {
  setActivePinia(createPinia())
})
```

- [ ] **Step 6: Create `app/lib/supabase-instance.ts`**

```ts
import type { SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

export function setSupabase(client: SupabaseClient): void {
  _client = client
}

export function getSupabase(): SupabaseClient {
  if (!_client) throw new Error('Supabase client not initialized. Call setSupabase() first.')
  return _client
}

export function resetSupabase(): void {
  _client = null
}
```

- [ ] **Step 7: Update `app/plugins/supabase.ts` to register the singleton**

```ts
import { createClient } from '@supabase/supabase-js'
import { setSupabase } from '~/lib/supabase-instance'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const supabase = createClient(
    config.public.supabaseUrl as string,
    config.public.supabaseKey as string
  )
  setSupabase(supabase)
  return {
    provide: { supabase }
  }
})
```

- [ ] **Step 8: Smoke-verify vitest runs**

```bash
mkdir -p app/stores/__tests__
cat > app/stores/__tests__/smoke.spec.ts <<'EOF'
import { describe, it, expect } from 'vitest'

describe('smoke', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2)
  })
})
EOF
npm test
```

Expected: `1 passed`. Then delete the smoke file:

```bash
rm app/stores/__tests__/smoke.spec.ts
```

- [ ] **Step 9: Verify dev server still boots**

```bash
npm run dev
```

Expected: Nuxt starts without errors; `[nuxt] Pinia module registered` in logs. Stop with Ctrl+C.

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json nuxt.config.ts vitest.config.ts tests/setup.ts app/lib/supabase-instance.ts app/plugins/supabase.ts
git commit -m "chore: setup pinia, vitest, supabase singleton"
```

---

## Task 2: Shared types

**Files:**
- Create: `app/stores/types.ts`

- [ ] **Step 1: Write the type definitions**

```ts
export interface Player {
  id: string
  room_id: string
  name: string
  is_moderator: boolean
  vote: string | null
  user_id: string | null
  created_at: string
  left_at: string | null
}

export interface RoomState {
  room_id: string
  phase: 'voting' | 'revealed'
  active_cards: string[]
  round_started_at: string
}

export type ConnectionStatus = 'connecting' | 'online' | 'reconnecting' | 'offline'
```

Note: `Player` no longer has `is_online` — it's computed from `presenceStore`.

- [ ] **Step 2: Commit**

```bash
git add app/stores/types.ts
git commit -m "feat: add shared store types"
```

---

## Task 3: SQL migration to drop is_online

**Files:**
- Create: `supabase/migrations/002_drop_is_online.sql`

- [ ] **Step 1: Write the migration**

```sql
alter table players drop column is_online;
```

- [ ] **Step 2: Apply manually via Supabase SQL Editor**

Open Supabase Dashboard → SQL Editor → run the statement. Confirm column gone:

```sql
select column_name from information_schema.columns where table_name = 'players';
```

Expected: no `is_online` row.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/002_drop_is_online.sql
git commit -m "db: drop players.is_online (replaced by presence channel)"
```

---

## Task 4: roomStore (TDD)

**Files:**
- Create: `app/stores/room.ts`
- Create: `app/stores/__tests__/room.spec.ts`

- [ ] **Step 1: Write failing tests**

`app/stores/__tests__/room.spec.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setSupabase, resetSupabase } from '../../lib/supabase-instance'
import { useRoomStore } from '../room'
import type { RoomState } from '../types'

function fakeRoomState(overrides: Partial<RoomState> = {}): RoomState {
  return {
    room_id: 'r1',
    phase: 'voting',
    active_cards: ['1', '2', '3'],
    round_started_at: '2026-05-04T00:00:00Z',
    ...overrides,
  }
}

describe('roomStore.applyChange', () => {
  beforeEach(() => resetSupabase())

  it('applies UPDATE to roomState', () => {
    const store = useRoomStore()
    store.roomState = fakeRoomState({ phase: 'voting' })
    store.applyChange({
      eventType: 'UPDATE',
      new: fakeRoomState({ phase: 'revealed' }),
      old: {} as any,
    } as any)
    expect(store.roomState?.phase).toBe('revealed')
  })

  it('ignores INSERT/DELETE on room_state (singleton row)', () => {
    const store = useRoomStore()
    store.roomState = fakeRoomState()
    store.applyChange({ eventType: 'INSERT', new: fakeRoomState({ phase: 'revealed' }) } as any)
    expect(store.roomState.phase).toBe('voting')
  })
})

describe('roomStore actions', () => {
  beforeEach(() => resetSupabase())

  it('reveal() sends update with phase=revealed', async () => {
    const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
    setSupabase({ from: () => ({ update }) } as any)
    const store = useRoomStore()
    store.roomId = 'r1'
    await store.reveal()
    expect(update).toHaveBeenCalledWith({ phase: 'revealed' })
  })

  it('startNewRound() sets phase=voting and round_started_at', async () => {
    const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
    setSupabase({ from: () => ({ update }) } as any)
    const store = useRoomStore()
    store.roomId = 'r1'
    await store.startNewRound()
    const arg = update.mock.calls[0][0]
    expect(arg.phase).toBe('voting')
    expect(typeof arg.round_started_at).toBe('string')
  })

  it('saveCardDeck(cards) sends update with active_cards', async () => {
    const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
    setSupabase({ from: () => ({ update }) } as any)
    const store = useRoomStore()
    store.roomId = 'r1'
    await store.saveCardDeck(['1', '5'])
    expect(update).toHaveBeenCalledWith({ active_cards: ['1', '5'] })
  })
})
```

- [ ] **Step 2: Run — should fail with import error**

```bash
npm test -- room.spec
```

Expected: FAIL — `Cannot find module '../room'`.

- [ ] **Step 3: Implement `app/stores/room.ts`**

```ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getSupabase } from '~/lib/supabase-instance'
import type { RoomState } from './types'

type RealtimePayload = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: RoomState
  old: Partial<RoomState>
}

export const useRoomStore = defineStore('room', () => {
  const roomId = ref<string | null>(null)
  const roomState = ref<RoomState | null>(null)

  function applyChange(payload: RealtimePayload) {
    if (payload.eventType === 'UPDATE') {
      roomState.value = payload.new
    }
  }

  async function reveal() {
    if (!roomId.value) return
    await getSupabase().from('room_state').update({ phase: 'revealed' }).eq('room_id', roomId.value)
  }

  async function startNewRound() {
    if (!roomId.value) return
    await getSupabase()
      .from('room_state')
      .update({ phase: 'voting', round_started_at: new Date().toISOString() })
      .eq('room_id', roomId.value)
  }

  async function saveCardDeck(cards: string[]) {
    if (!roomId.value) return
    await getSupabase().from('room_state').update({ active_cards: cards }).eq('room_id', roomId.value)
  }

  return { roomId, roomState, applyChange, reveal, startNewRound, saveCardDeck }
})
```

- [ ] **Step 4: Run — should pass**

```bash
npm test -- room.spec
```

Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add app/stores/room.ts app/stores/__tests__/room.spec.ts
git commit -m "feat(store): add roomStore with applyChange and actions"
```

---

## Task 5a: playersStore — applyChange (TDD)

**Files:**
- Create: `app/stores/players.ts`
- Create: `app/stores/__tests__/players.spec.ts`

- [ ] **Step 1: Write failing tests**

`app/stores/__tests__/players.spec.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { resetSupabase } from '../../lib/supabase-instance'
import { usePlayersStore } from '../players'
import type { Player } from '../types'

function fakePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'p1',
    room_id: 'r1',
    name: 'Alice',
    is_moderator: false,
    vote: null,
    user_id: null,
    created_at: '2026-05-04T00:00:00Z',
    left_at: null,
    ...overrides,
  }
}

describe('playersStore.applyChange', () => {
  beforeEach(() => resetSupabase())

  it('INSERT adds a player', () => {
    const store = usePlayersStore()
    store.applyChange({ eventType: 'INSERT', new: fakePlayer({ id: 'p1' }), old: {} } as any)
    expect(store.players).toHaveLength(1)
    expect(store.players[0].id).toBe('p1')
  })

  it('INSERT is idempotent (no duplicates)', () => {
    const store = usePlayersStore()
    const p = fakePlayer({ id: 'p1' })
    store.applyChange({ eventType: 'INSERT', new: p, old: {} } as any)
    store.applyChange({ eventType: 'INSERT', new: p, old: {} } as any)
    expect(store.players).toHaveLength(1)
  })

  it('UPDATE replaces matching player', () => {
    const store = usePlayersStore()
    store.players = [fakePlayer({ id: 'p1', name: 'Alice' })]
    store.applyChange({
      eventType: 'UPDATE',
      new: fakePlayer({ id: 'p1', name: 'Alice2' }),
      old: {},
    } as any)
    expect(store.players[0].name).toBe('Alice2')
  })

  it('DELETE removes player (used for kick)', () => {
    const store = usePlayersStore()
    store.players = [fakePlayer({ id: 'p1' }), fakePlayer({ id: 'p2' })]
    store.applyChange({ eventType: 'DELETE', new: {}, old: { id: 'p1' } } as any)
    expect(store.players.map(p => p.id)).toEqual(['p2'])
  })

  it('soft-delete via UPDATE marks left_at and is filtered by visiblePlayers', () => {
    const store = usePlayersStore()
    store.players = [fakePlayer({ id: 'p1' })]
    store.applyChange({
      eventType: 'UPDATE',
      new: fakePlayer({ id: 'p1', left_at: '2026-05-04T01:00:00Z' }),
      old: {},
    } as any)
    expect(store.players).toHaveLength(1)
    expect(store.visiblePlayers).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run — should fail**

```bash
npm test -- players.spec
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `app/stores/players.ts` (applyChange + visiblePlayers only for now)**

```ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getSupabase } from '~/lib/supabase-instance'
import type { Player } from './types'

type RealtimePayload = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: Player
  old: Partial<Player>
}

export const usePlayersStore = defineStore('players', () => {
  const players = ref<Player[]>([])
  const pendingVotes = ref<Record<string, string>>({})

  const visiblePlayers = computed(() => players.value.filter(p => p.left_at === null))

  function applyChange(payload: RealtimePayload) {
    switch (payload.eventType) {
      case 'INSERT':
        if (!players.value.find(p => p.id === payload.new.id)) {
          players.value.push(payload.new)
        }
        break
      case 'UPDATE': {
        const idx = players.value.findIndex(p => p.id === payload.new.id)
        if (idx >= 0) players.value[idx] = payload.new
        if (pendingVotes.value[payload.new.id] === payload.new.vote) {
          delete pendingVotes.value[payload.new.id]
        }
        break
      }
      case 'DELETE':
        players.value = players.value.filter(p => p.id !== (payload.old as any).id)
        break
    }
  }

  return { players, pendingVotes, visiblePlayers, applyChange }
})
```

- [ ] **Step 4: Run — should pass**

```bash
npm test -- players.spec
```

Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add app/stores/players.ts app/stores/__tests__/players.spec.ts
git commit -m "feat(store): add playersStore.applyChange + visiblePlayers"
```

---

## Task 5b: playersStore — castVote optimistic flow (TDD)

**Files:**
- Modify: `app/stores/players.ts`
- Modify: `app/stores/__tests__/players.spec.ts`

- [ ] **Step 1: Append failing tests**

Add to `players.spec.ts`:

```ts
import { setSupabase } from '../../lib/supabase-instance'
import { vi } from 'vitest'

describe('playersStore.castVote (optimistic)', () => {
  beforeEach(() => resetSupabase())

  it('sets pendingVotes immediately and clears on success', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null })
    const update = vi.fn().mockReturnValue({ eq })
    setSupabase({ from: () => ({ update }) } as any)
    const store = usePlayersStore()
    store.players = [fakePlayer({ id: 'p1', vote: null })]
    const promise = store.castVote('p1', '5')
    expect(store.pendingVotes['p1']).toBe('5')
    await promise
    expect(update).toHaveBeenCalledWith({ vote: '5' })
  })

  it('rolls back pendingVotes on error', async () => {
    const eq = vi.fn().mockResolvedValue({ error: new Error('fail') })
    const update = vi.fn().mockReturnValue({ eq })
    setSupabase({ from: () => ({ update }) } as any)
    const store = usePlayersStore()
    store.players = [fakePlayer({ id: 'p1' })]
    await expect(store.castVote('p1', '5')).rejects.toThrow('fail')
    expect(store.pendingVotes['p1']).toBeUndefined()
  })

  it('voteOf returns pending vote when present', () => {
    const store = usePlayersStore()
    store.players = [fakePlayer({ id: 'p1', vote: '1' })]
    store.pendingVotes['p1'] = '5'
    expect(store.voteOf('p1')).toBe('5')
  })

  it('voteOf falls back to server vote when no pending', () => {
    const store = usePlayersStore()
    store.players = [fakePlayer({ id: 'p1', vote: '1' })]
    expect(store.voteOf('p1')).toBe('1')
  })

  it('applyChange UPDATE clears matching pendingVote (reconciliation)', () => {
    const store = usePlayersStore()
    store.players = [fakePlayer({ id: 'p1', vote: null })]
    store.pendingVotes['p1'] = '5'
    store.applyChange({
      eventType: 'UPDATE',
      new: fakePlayer({ id: 'p1', vote: '5' }),
      old: {},
    } as any)
    expect(store.pendingVotes['p1']).toBeUndefined()
  })

  it('clearPendingVotes() empties the map (used on phase=revealed)', () => {
    const store = usePlayersStore()
    store.pendingVotes = { p1: '5', p2: '3' }
    store.clearPendingVotes()
    expect(store.pendingVotes).toEqual({})
  })
})
```

- [ ] **Step 2: Run — should fail**

```bash
npm test -- players.spec
```

Expected: FAIL — `castVote`/`voteOf`/`clearPendingVotes` undefined.

- [ ] **Step 3: Extend `app/stores/players.ts`**

Add inside the store body (before `return`):

```ts
function voteOf(playerId: string): string | null {
  if (pendingVotes.value[playerId] !== undefined) return pendingVotes.value[playerId]
  return players.value.find(p => p.id === playerId)?.vote ?? null
}

async function castVote(playerId: string, card: string) {
  pendingVotes.value[playerId] = card
  try {
    const { error } = await getSupabase()
      .from('players')
      .update({ vote: card })
      .eq('id', playerId)
    if (error) throw error
  } catch (e) {
    delete pendingVotes.value[playerId]
    throw e
  }
}

function clearPendingVotes() {
  pendingVotes.value = {}
}
```

Update return:

```ts
return {
  players, pendingVotes, visiblePlayers,
  applyChange, voteOf, castVote, clearPendingVotes,
}
```

- [ ] **Step 4: Run — should pass**

```bash
npm test -- players.spec
```

Expected: 11 passed total in this file.

- [ ] **Step 5: Commit**

```bash
git add app/stores/players.ts app/stores/__tests__/players.spec.ts
git commit -m "feat(store): add optimistic castVote with rollback and reconciliation"
```

---

## Task 5c: playersStore — remaining actions (rename, kick, toggleModerator, join, rejoin, leave, linkUser, fetchAll)

**Files:**
- Modify: `app/stores/players.ts`
- Modify: `app/stores/__tests__/players.spec.ts`

- [ ] **Step 1: Add failing tests for actions**

Append to `players.spec.ts`:

```ts
describe('playersStore actions', () => {
  beforeEach(() => resetSupabase())

  function makeBuilder(result: any = { error: null, data: null }) {
    const eq = vi.fn().mockResolvedValue(result)
    const update = vi.fn().mockReturnValue({ eq })
    const del = vi.fn().mockReturnValue({ eq })
    const single = vi.fn().mockResolvedValue(result)
    const select = vi.fn().mockReturnValue({ single })
    const insert = vi.fn().mockReturnValue({ select })
    return { update, del, insert, eq, select, single }
  }

  it('rename(id, name) sends update with name', async () => {
    const b = makeBuilder()
    setSupabase({ from: () => ({ update: b.update }) } as any)
    await usePlayersStore().rename('p1', 'Bob')
    expect(b.update).toHaveBeenCalledWith({ name: 'Bob' })
  })

  it('toggleModerator(id, true) sends update', async () => {
    const b = makeBuilder()
    setSupabase({ from: () => ({ update: b.update }) } as any)
    await usePlayersStore().toggleModerator('p1', true)
    expect(b.update).toHaveBeenCalledWith({ is_moderator: true })
  })

  it('kick(id) sends DELETE', async () => {
    const b = makeBuilder()
    setSupabase({ from: () => ({ delete: b.del }) } as any)
    await usePlayersStore().kick('p1')
    expect(b.del).toHaveBeenCalled()
  })

  it('leave(id) sets left_at and clears localStorage session', async () => {
    localStorage.setItem('storypoker_session_r1', 'x')
    const b = makeBuilder()
    setSupabase({ from: () => ({ update: b.update }) } as any)
    const store = usePlayersStore()
    store.roomId = 'r1'
    await store.leave('p1')
    const arg = b.update.mock.calls[0][0]
    expect(typeof arg.left_at).toBe('string')
    expect(localStorage.getItem('storypoker_session_r1')).toBeNull()
  })

  it('join(name, userId?) inserts and returns new player', async () => {
    const newP = fakePlayer({ id: 'p9', name: 'Carol' })
    const b = makeBuilder({ error: null, data: newP })
    setSupabase({ from: () => ({ insert: b.insert }) } as any)
    const store = usePlayersStore()
    store.roomId = 'r1'
    const result = await store.join('Carol')
    expect(result.id).toBe('p9')
    expect(b.insert).toHaveBeenCalledWith({ room_id: 'r1', name: 'Carol', user_id: null, is_moderator: false })
  })

  it('linkUser(playerId, userId) sends update with user_id', async () => {
    const b = makeBuilder()
    setSupabase({ from: () => ({ update: b.update }) } as any)
    await usePlayersStore().linkUser('p1', 'u9')
    expect(b.update).toHaveBeenCalledWith({ user_id: 'u9' })
  })
})
```

- [ ] **Step 2: Run — should fail**

```bash
npm test -- players.spec
```

Expected: FAIL — `rename`/`toggleModerator`/etc. undefined.

- [ ] **Step 3: Extend `app/stores/players.ts`**

Add `roomId` ref + actions inside the setup:

```ts
const roomId = ref<string | null>(null)

async function rename(playerId: string, name: string) {
  await getSupabase().from('players').update({ name }).eq('id', playerId)
}

async function toggleModerator(playerId: string, value: boolean) {
  await getSupabase().from('players').update({ is_moderator: value }).eq('id', playerId)
}

async function kick(playerId: string) {
  await getSupabase().from('players').delete().eq('id', playerId)
}

async function leave(playerId: string) {
  if (roomId.value) localStorage.removeItem(`storypoker_session_${roomId.value}`)
  await getSupabase()
    .from('players')
    .update({ left_at: new Date().toISOString() })
    .eq('id', playerId)
}

async function join(name: string, userId: string | null = null): Promise<Player> {
  if (!roomId.value) throw new Error('roomId not set')
  const { data, error } = await getSupabase()
    .from('players')
    .insert({ room_id: roomId.value, name, user_id: userId, is_moderator: false })
    .select()
    .single()
  if (error) throw error
  return data as Player
}

async function rejoin(playerId: string): Promise<Player> {
  const { data, error } = await getSupabase()
    .from('players')
    .update({ left_at: null })
    .eq('id', playerId)
    .select()
    .single()
  if (error) throw error
  return data as Player
}

async function linkUser(playerId: string, userId: string) {
  await getSupabase().from('players').update({ user_id: userId }).eq('id', playerId)
}

async function fetchAll(roomIdArg: string): Promise<void> {
  const { data } = await getSupabase()
    .from('players')
    .select('*')
    .eq('room_id', roomIdArg)
    .order('created_at')
  players.value = (data ?? []) as Player[]
}
```

Update return to include all new exports + `roomId`:

```ts
return {
  roomId, players, pendingVotes, visiblePlayers,
  applyChange, voteOf, castVote, clearPendingVotes,
  rename, toggleModerator, kick, leave, join, rejoin, linkUser, fetchAll,
}
```

- [ ] **Step 4: Run — should pass**

```bash
npm test -- players.spec
```

Expected: all tests in players.spec pass.

- [ ] **Step 5: Commit**

```bash
git add app/stores/players.ts app/stores/__tests__/players.spec.ts
git commit -m "feat(store): add player CRUD actions (rename/kick/leave/join/rejoin/linkUser)"
```

---

## Task 6: presenceStore (TDD)

**Files:**
- Create: `app/stores/presence.ts`
- Create: `app/stores/__tests__/presence.spec.ts`

The store machine: a fake Supabase channel exposing `track`, `untrack`, `subscribe`, `unsubscribe`, `on`. Visibility/network handlers manipulated through `document.dispatchEvent` and `Object.defineProperty(navigator, 'onLine', ...)`.

- [ ] **Step 1: Write failing tests**

`app/stores/__tests__/presence.spec.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setSupabase, resetSupabase } from '../../lib/supabase-instance'
import { usePresenceStore } from '../presence'

function makeFakeChannel() {
  const handlers: Record<string, Function[]> = {}
  const channel: any = {
    on(_type: string, _filter: any, handler: Function) {
      const key = _filter?.event ?? _type
      handlers[key] = handlers[key] ?? []
      handlers[key].push(handler)
      return channel
    },
    track: vi.fn().mockResolvedValue('ok'),
    untrack: vi.fn().mockResolvedValue('ok'),
    subscribe(cb?: (status: string) => void) {
      setTimeout(() => cb?.('SUBSCRIBED'), 0)
      return channel
    },
    unsubscribe: vi.fn().mockResolvedValue('ok'),
    presenceState: vi.fn().mockReturnValue({}),
    _trigger(event: string, payload: any) {
      ;(handlers[event] ?? []).forEach(h => h(payload))
    },
  }
  return channel
}

function fakeSupabase(channel: any) {
  return { channel: vi.fn().mockReturnValue(channel) }
}

describe('presenceStore — initial state', () => {
  beforeEach(() => resetSupabase())

  it('starts in connecting status', () => {
    const store = usePresenceStore()
    expect(store.status).toBe('connecting')
    expect(store.online.size).toBe(0)
  })
})

describe('presenceStore — start/stop', () => {
  beforeEach(() => resetSupabase())

  it('start() subscribes and tracks the player', async () => {
    const ch = makeFakeChannel()
    setSupabase(fakeSupabase(ch) as any)
    const store = usePresenceStore()
    await store.start('r1', 'p1')
    await new Promise(r => setTimeout(r, 5))
    expect(ch.track).toHaveBeenCalledWith({ playerId: 'p1' })
    expect(store.status).toBe('online')
  })

  it('stop() untracks and unsubscribes; status → offline', async () => {
    const ch = makeFakeChannel()
    setSupabase(fakeSupabase(ch) as any)
    const store = usePresenceStore()
    await store.start('r1', 'p1')
    await new Promise(r => setTimeout(r, 5))
    await store.stop()
    expect(ch.untrack).toHaveBeenCalled()
    expect(ch.unsubscribe).toHaveBeenCalled()
    expect(store.status).toBe('offline')
  })
})

describe('presenceStore — presence sync', () => {
  beforeEach(() => resetSupabase())

  it('sync event populates online set from presenceState()', async () => {
    const ch = makeFakeChannel()
    ch.presenceState = vi.fn().mockReturnValue({
      key1: [{ playerId: 'p1' }],
      key2: [{ playerId: 'p2' }],
    })
    setSupabase(fakeSupabase(ch) as any)
    const store = usePresenceStore()
    await store.start('r1', 'p1')
    await new Promise(r => setTimeout(r, 5))
    ch._trigger('sync', {})
    expect(store.online.has('p1')).toBe(true)
    expect(store.online.has('p2')).toBe(true)
  })
})

describe('presenceStore — visibility handler', () => {
  beforeEach(() => resetSupabase())

  it('hidden visibility → status becomes offline + untrack called', async () => {
    const ch = makeFakeChannel()
    setSupabase(fakeSupabase(ch) as any)
    const store = usePresenceStore()
    await store.start('r1', 'p1')
    await new Promise(r => setTimeout(r, 5))
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
    await new Promise(r => setTimeout(r, 5))
    expect(ch.untrack).toHaveBeenCalled()
    expect(store.status).toBe('offline')
  })

  it('visible visibility → re-enters connecting then online', async () => {
    const ch = makeFakeChannel()
    setSupabase(fakeSupabase(ch) as any)
    const store = usePresenceStore()
    await store.start('r1', 'p1')
    await new Promise(r => setTimeout(r, 5))
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
    await new Promise(r => setTimeout(r, 5))
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
    await new Promise(r => setTimeout(r, 10))
    expect(store.status).toBe('online')
  })
})

describe('presenceStore — network handler', () => {
  beforeEach(() => resetSupabase())

  it('window offline event → status becomes reconnecting', async () => {
    const ch = makeFakeChannel()
    setSupabase(fakeSupabase(ch) as any)
    const store = usePresenceStore()
    await store.start('r1', 'p1')
    await new Promise(r => setTimeout(r, 5))
    window.dispatchEvent(new Event('offline'))
    expect(store.status).toBe('reconnecting')
  })
})
```

- [ ] **Step 2: Run — should fail**

```bash
npm test -- presence.spec
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `app/stores/presence.ts`**

```ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getSupabase } from '~/lib/supabase-instance'
import type { ConnectionStatus } from './types'

export const usePresenceStore = defineStore('presence', () => {
  const status = ref<ConnectionStatus>('connecting')
  const online = ref<Set<string>>(new Set())

  let channel: any = null
  let currentRoomId: string | null = null
  let currentPlayerId: string | null = null
  let visibilityHandler: (() => void) | null = null
  let onlineHandler: (() => void) | null = null
  let offlineHandler: (() => void) | null = null

  async function start(roomId: string, playerId: string) {
    currentRoomId = roomId
    currentPlayerId = playerId
    await openChannel()
    attachWindowHandlers()
  }

  async function openChannel() {
    if (!currentRoomId || !currentPlayerId) return
    status.value = 'connecting'
    const supabase = getSupabase()
    channel = supabase.channel(`room:${currentRoomId}`)
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState() as Record<string, Array<{ playerId: string }>>
      const next = new Set<string>()
      for (const arr of Object.values(state)) {
        for (const m of arr) next.add(m.playerId)
      }
      online.value = next
    })
    channel.subscribe(async (s: string) => {
      if (s === 'SUBSCRIBED') {
        await channel.track({ playerId: currentPlayerId })
        status.value = 'online'
      } else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT' || s === 'CLOSED') {
        if (status.value !== 'offline') status.value = 'reconnecting'
      }
    })
  }

  async function closeChannel() {
    if (!channel) return
    try { await channel.untrack() } catch {}
    try { await channel.unsubscribe() } catch {}
    channel = null
    online.value = new Set()
  }

  async function stop() {
    detachWindowHandlers()
    await closeChannel()
    status.value = 'offline'
  }

  function attachWindowHandlers() {
    if (typeof document === 'undefined') return
    visibilityHandler = async () => {
      if (document.visibilityState === 'hidden') {
        await closeChannel()
        status.value = 'offline'
      } else if (document.visibilityState === 'visible') {
        if (status.value === 'offline' || status.value === 'reconnecting') {
          await openChannel()
        }
      }
    }
    offlineHandler = () => { status.value = 'reconnecting' }
    onlineHandler = () => { if (status.value === 'reconnecting') openChannel() }
    document.addEventListener('visibilitychange', visibilityHandler)
    window.addEventListener('offline', offlineHandler)
    window.addEventListener('online', onlineHandler)
  }

  function detachWindowHandlers() {
    if (visibilityHandler) document.removeEventListener('visibilitychange', visibilityHandler)
    if (offlineHandler) window.removeEventListener('offline', offlineHandler)
    if (onlineHandler) window.removeEventListener('online', onlineHandler)
    visibilityHandler = null
    offlineHandler = null
    onlineHandler = null
  }

  return { status, online, start, stop }
})
```

- [ ] **Step 4: Run — should pass**

```bash
npm test -- presence.spec
```

Expected: 6 passed. If "visible → online" times out, increase the wait inside that test from 10ms to 30ms.

- [ ] **Step 5: Commit**

```bash
git add app/stores/presence.ts app/stores/__tests__/presence.spec.ts
git commit -m "feat(store): add presenceStore with visibility/network state machine"
```

---

## Task 7: authStore

**Files:**
- Create: `app/stores/auth.ts`

No tests — store is a thin wrapper around Supabase auth, behavior fully delegated.

- [ ] **Step 1: Implement `app/stores/auth.ts`**

```ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getSupabase } from '~/lib/supabase-instance'
import type { User } from '@supabase/supabase-js'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  let initialized = false

  async function init() {
    if (initialized) return
    initialized = true
    const supabase = getSupabase()
    const { data } = await supabase.auth.getSession()
    user.value = data.session?.user ?? null
    supabase.auth.onAuthStateChange((_event, session) => {
      user.value = session?.user ?? null
    })
  }

  async function signIn(email: string, password: string) {
    const { error } = await getSupabase().auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function signUp(email: string, password: string) {
    const { error } = await getSupabase().auth.signUp({ email, password })
    if (error) throw error
  }

  async function signOut() {
    await getSupabase().auth.signOut()
  }

  return { user, init, signIn, signUp, signOut }
})
```

- [ ] **Step 2: Commit**

```bash
git add app/stores/auth.ts
git commit -m "feat(store): add authStore"
```

---

## Task 8: ConnectionBanner component

**Files:**
- Create: `app/components/ConnectionBanner.vue`

- [ ] **Step 1: Implement the component**

```vue
<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { usePresenceStore } from '~/stores/presence'

const presence = usePresenceStore()
const { status } = storeToRefs(presence)
</script>

<template>
  <Transition name="banner-fade">
    <div
      v-if="status === 'reconnecting'"
      class="connection-banner"
      role="status"
      aria-live="polite"
    >
      <span class="banner-spinner" aria-hidden="true" />
      <span>Reconnecting…</span>
    </div>
  </Transition>
</template>

<style scoped>
.connection-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background-color: #f59e0b;
  color: #000;
  font-size: 14px;
  font-weight: 500;
  z-index: 9999;
}
.banner-spinner {
  width: 12px;
  height: 12px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.banner-fade-enter-active, .banner-fade-leave-active { transition: opacity 0.15s; }
.banner-fade-enter-from, .banner-fade-leave-to { opacity: 0; }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add app/components/ConnectionBanner.vue
git commit -m "feat: add ConnectionBanner component"
```

---

## Task 9: Mount ConnectionBanner in app.vue

**Files:**
- Modify: `app/app.vue`

- [ ] **Step 1: Update template**

Replace contents of `app/app.vue`:

```vue
<script setup lang="ts">
const { init } = useTheme()
onMounted(() => init())
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--bg-app); color: var(--text-body);">
    <ConnectionBanner />
    <NuxtPage />
  </div>
</template>
```

(Nuxt auto-imports `ConnectionBanner` from `app/components/`.)

- [ ] **Step 2: Verify dev server starts without errors**

```bash
npm run dev
```

Expected: page loads, no console errors. Stop with Ctrl+C.

- [ ] **Step 3: Commit**

```bash
git add app/app.vue
git commit -m "feat: mount ConnectionBanner globally"
```

---

## Task 10: Refactor pages/[slug].vue to use stores

**Files:**
- Modify: `app/pages/[slug].vue`

- [ ] **Step 1: Replace the entire `<script setup>` block**

```vue
<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useAuthStore } from '~/stores/auth'
import { useRoomStore } from '~/stores/room'
import { usePlayersStore } from '~/stores/players'
import { usePresenceStore } from '~/stores/presence'

const route = useRoute()
const router = useRouter()
const roomId = route.params.slug as string

const authStore = useAuthStore()
const roomStore = useRoomStore()
const playersStore = usePlayersStore()
const presenceStore = usePresenceStore()

const { user } = storeToRefs(authStore)
const { roomState } = storeToRefs(roomStore)
const { visiblePlayers, pendingVotes } = storeToRefs(playersStore)
const { online, status: connectionStatus } = storeToRefs(presenceStore)

const currentPlayerId = ref<string | null>(null)
const showJoin = ref(false)
const showAuth = ref<'signin' | 'signup' | null>(null)
const showCardDeck = ref(false)
const renameTarget = ref<string | null>(null)
const renameValue = ref('')

const currentPlayer = computed(() => visiblePlayers.value.find(p => p.id === currentPlayerId.value) ?? null)
const isModerator = computed(() => currentPlayer.value?.is_moderator ?? false)
const isAuthorizedModerator = computed(() => isModerator.value && !!user.value)
const onlineCount = computed(() => visiblePlayers.value.filter(p => online.value.has(p.id)).length)

const playersForUi = computed(() =>
  visiblePlayers.value.map(p => ({
    ...p,
    is_online: online.value.has(p.id),
    vote: playersStore.voteOf(p.id),
  }))
)

const voteCounts = computed(() => {
  if (!roomState.value) return {}
  return visiblePlayers.value.reduce((acc, p) => {
    if (p.vote) acc[p.vote] = (acc[p.vote] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)
})

let playersChannel: any = null
let stateChannel: any = null

onMounted(async () => {
  await authStore.init()
  roomStore.roomId = roomId
  playersStore.roomId = roomId
  await fetchInitialData()

  const session = getStoredSession()
  if (session) {
    try {
      await playersStore.rejoin(session.playerId)
      currentPlayerId.value = session.playerId
      await presenceStore.start(roomId, session.playerId)
    } catch {
      showJoin.value = true
    }
  } else {
    showJoin.value = true
  }

  subscribeRealtime()
})

watch(connectionStatus, async (next, prev) => {
  if (prev === 'reconnecting' && next === 'online') {
    await fetchInitialData()
  }
})

watch(() => roomState.value?.phase, (phase) => {
  if (phase === 'revealed') playersStore.clearPendingVotes()
})

onUnmounted(async () => {
  unsubscribe()
  await presenceStore.stop()
})

async function fetchInitialData() {
  const { $supabase } = useNuxtApp()
  const [{ data: pData }, { data: sData }] = await Promise.all([
    $supabase.from('players').select('*').eq('room_id', roomId).order('created_at'),
    $supabase.from('room_state').select('*').eq('room_id', roomId).single(),
  ])
  playersStore.players = pData ?? []
  roomStore.roomState = sData ?? null
}

function subscribeRealtime() {
  const { $supabase } = useNuxtApp()
  playersChannel = $supabase
    .channel(`players:${roomId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${roomId}` },
      (payload) => playersStore.applyChange(payload as any))
    .subscribe()
  stateChannel = $supabase
    .channel(`room_state:${roomId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'room_state', filter: `room_id=eq.${roomId}` },
      (payload) => roomStore.applyChange(payload as any))
    .subscribe()
}

function unsubscribe() {
  playersChannel?.unsubscribe()
  stateChannel?.unsubscribe()
}

function getStoredSession(): { playerId: string; playerName: string } | null {
  if (!import.meta.client) return null
  const raw = localStorage.getItem(`storypoker_session_${roomId}`)
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

async function handleJoin(name: string) {
  const player = await playersStore.join(name, user.value?.id ?? null)
  localStorage.setItem(
    `storypoker_session_${roomId}`,
    JSON.stringify({ playerId: player.id, playerName: player.name })
  )
  currentPlayerId.value = player.id
  showJoin.value = false
  await presenceStore.start(roomId, player.id)
}

async function handleVote(card: string) {
  if (!currentPlayerId.value) return
  try {
    await playersStore.castVote(currentPlayerId.value, card)
  } catch {
    // toast left for future UI work
  }
}

async function handleToggleModerator(id: string, value: boolean) {
  await playersStore.toggleModerator(id, value)
}

function handleRename(id: string) {
  renameTarget.value = id
  renameValue.value = visiblePlayers.value.find(p => p.id === id)?.name ?? ''
}

async function submitRename() {
  if (renameTarget.value && renameValue.value.trim()) {
    await playersStore.rename(renameTarget.value, renameValue.value.trim())
    renameTarget.value = null
  }
}

async function handleLeave(id: string) {
  await playersStore.leave(id)
  await presenceStore.stop()
  router.push('/')
}

async function handleKick(id: string) {
  await playersStore.kick(id)
}

async function handleAuthSuccess() {
  if (currentPlayerId.value && user.value) {
    await playersStore.linkUser(currentPlayerId.value, user.value.id)
  }
}

async function handleSaveCardDeck(cards: string[]) {
  await roomStore.saveCardDeck(cards)
  showCardDeck.value = false
}
</script>
```

(Template block stays the same except: pass `playersForUi` to `<PlayersList :players=...>` instead of raw `players`. Update the `<PlayersList>` line:)

```vue
<PlayersList
  :players="playersForUi"
  :phase="roomState?.phase ?? 'voting'"
  :current-player-id="currentPlayerId"
  :current-user-is-authorized-moderator="isAuthorizedModerator"
  @rename="handleRename"
  @toggle-moderator="handleToggleModerator"
  @leave="handleLeave"
  @kick="handleKick"
/>
```

And update `<CardsArea>` `selected-vote` to use the optimistic getter:

```vue
<CardsArea
  v-if="roomState?.phase === 'voting'"
  :active-cards="roomState.active_cards ?? []"
  :selected-vote="currentPlayer ? playersStore.voteOf(currentPlayer.id) : null"
  :is-moderator="isModerator"
  @vote="handleVote"
  @reveal="roomStore.reveal()"
/>
```

And `<ResultsArea>`:

```vue
<ResultsArea
  v-else-if="roomState?.phase === 'revealed'"
  :votes="voteCounts"
  :is-moderator="isModerator"
  @start-new-round="roomStore.startNewRound()"
/>
```

- [ ] **Step 2: Run typecheck**

```bash
npx nuxi typecheck
```

Expected: passes (or only pre-existing warnings).

- [ ] **Step 3: Smoke-test manually**

```bash
npm run dev
```

Open `http://localhost:3000`, create a room, vote on a card. Verify:
- Vote highlights immediately
- Open same URL in another tab → second player joins → online count is 2
- Switch tab away in tab 2 → tab 1 sees online count drop to 1 within ~1s
- Switch back → count restores to 2

Stop with Ctrl+C.

- [ ] **Step 4: Commit**

```bash
git add app/pages/\[slug\].vue
git commit -m "refactor(page): rewrite room page on top of pinia stores"
```

---

## Task 11: Refactor pages/index.vue

**Files:**
- Modify: `app/pages/index.vue`

- [ ] **Step 1: Add `roomStore.create()` method to roomStore**

Edit `app/stores/room.ts` — add inside the setup before the return:

```ts
function generateRoomId(): string {
  const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  return Array.from({ length: 8 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('')
}

async function create(): Promise<string> {
  const id = generateRoomId()
  const supabase = getSupabase()
  const { error: roomErr } = await supabase.from('rooms').insert({ id })
  if (roomErr) throw roomErr
  const { error: stateErr } = await supabase.from('room_state').insert({ room_id: id })
  if (stateErr) throw stateErr
  return id
}
```

Update return:

```ts
return { roomId, roomState, applyChange, reveal, startNewRound, saveCardDeck, create }
```

- [ ] **Step 2: Update `app/pages/index.vue`**

Replace the `<script setup>`:

```vue
<script setup lang="ts">
import { useRoomStore } from '~/stores/room'
import { usePlayersStore } from '~/stores/players'
import { useAuthStore } from '~/stores/auth'

const name = ref('')
const hasError = ref(false)
const router = useRouter()
const roomStore = useRoomStore()
const playersStore = usePlayersStore()
const authStore = useAuthStore()

async function createRoom() {
  if (!name.value.trim()) {
    hasError.value = true
    return
  }
  hasError.value = false
  await authStore.init()
  const roomId = await roomStore.create()
  playersStore.roomId = roomId
  const player = await playersStore.join(name.value.trim(), authStore.user?.id ?? null)
  await playersStore.toggleModerator(player.id, true)
  localStorage.setItem(
    `storypoker_session_${roomId}`,
    JSON.stringify({ playerId: player.id, playerName: player.name })
  )
  router.push(`/${roomId}`)
}
</script>
```

Template block stays unchanged.

- [ ] **Step 3: Smoke-test**

```bash
npm run dev
```

Click Create Room — should redirect to `/<roomId>` and you appear as moderator.

- [ ] **Step 4: Commit**

```bash
git add app/pages/index.vue app/stores/room.ts
git commit -m "refactor(page): index uses roomStore.create + playersStore.join"
```

---

## Task 12: Update AppHeader and AuthModal to use authStore

**Files:**
- Modify: `app/components/AppHeader.vue`
- Modify: `app/components/AuthModal.vue`

- [ ] **Step 1: AppHeader — replace `useAuth` import**

Find the line:

```ts
const { user } = useAuth()
```

Replace with:

```ts
import { storeToRefs } from 'pinia'
import { useAuthStore } from '~/stores/auth'
const { user } = storeToRefs(useAuthStore())
```

- [ ] **Step 2: AuthModal — replace `useAuth` import**

Find:

```ts
const { signIn, signUp } = useAuth()
```

Replace with:

```ts
import { useAuthStore } from '~/stores/auth'
const { signIn, signUp } = useAuthStore()
```

- [ ] **Step 3: Smoke test**

```bash
npm run dev
```

Open the app, click Sign In, enter creds (or just close modal). No console errors.

- [ ] **Step 4: Commit**

```bash
git add app/components/AppHeader.vue app/components/AuthModal.vue
git commit -m "refactor(components): AppHeader & AuthModal read from authStore"
```

---

## Task 13: Delete old composables, run full test + dev smoke

**Files:**
- Delete: `app/composables/useRoom.ts`
- Delete: `app/composables/usePlayer.ts`
- Delete: `app/composables/useAuth.ts`

- [ ] **Step 1: Verify no remaining consumers**

```bash
grep -rn "useRoom\|usePlayer\|useAuth\b" app/ --include='*.ts' --include='*.vue'
```

Expected: zero matches outside the composable files themselves.

- [ ] **Step 2: Delete the files**

```bash
rm app/composables/useRoom.ts app/composables/usePlayer.ts app/composables/useAuth.ts
```

- [ ] **Step 3: Typecheck + tests**

```bash
npx nuxi typecheck
npm test
```

Both should pass.

- [ ] **Step 4: Dev smoke — full acceptance criteria walk**

```bash
npm run dev
```

Open two tabs at `http://localhost:3000`, create room in tab A, join in tab B with a different name.

| Acceptance | Check |
|---|---|
| Vote shows immediately | Click a card in tab B → highlights instantly |
| Mobile background = offline ≤ 1s | Tab A: hide tab (Cmd+Tab to another window) → tab B sees online count drop |
| Auto-rejoin on return | Switch back to tab A → online count restores |
| Reconnect banner | DevTools → Network → Offline → banner appears in ~1–2s |
| `is_online` removed | Check Supabase Table Editor — column gone |
| No refetch on every event | DevTools → Network → vote in tab A → tab B shows no `select` request |
| Stores in DevTools | Vue DevTools → Pinia tab shows 4 stores |
| Vitest green | `npm test` from step 3 |

Stop dev server.

- [ ] **Step 5: Commit**

```bash
git add -u app/composables
git commit -m "refactor: remove obsolete composables (replaced by stores)"
```

---

## Task 14: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add State Management section**

Insert after the `## Database` section, before `## Realtime`:

```markdown
## State Management

Pinia stores in `app/stores/`:

- **`auth.ts`** — Supabase session + signIn/signUp/signOut
- **`room.ts`** — `room_state` (phase, active_cards), `create()`, `reveal()`, `startNewRound()`, `saveCardDeck()`
- **`players.ts`** — `players[]`, `pendingVotes`, optimistic `castVote()`, CRUD (join/rejoin/rename/kick/leave/linkUser), `applyChange()`
- **`presence.ts`** — connection status (`connecting`/`online`/`reconnecting`/`offline`), live `online: Set<playerId>` from Supabase Presence, visibility/network handlers

**Store ↔ Supabase:** stores access the client via `getSupabase()` from `app/lib/supabase-instance.ts`. The `supabase` Nuxt plugin calls `setSupabase(client)` once at startup. Tests inject a mock with `setSupabase(mock)`.

**Realtime → store:** page subscribes to `postgres_changes`, hands payload to `xxxStore.applyChange(payload)`. No full refetch except after `'reconnecting' → 'online'` transition.

**Optimistic vote:** `playersStore.castVote()` writes to `pendingVotes[playerId]` immediately, then async UPDATE; success/realtime ACK clears the entry, error rolls back.

**Presence:** `is_online` column does NOT exist — online status is derived from `presenceStore.online`. `left_at` (soft-delete) is unrelated.

## Testing

```bash
npm test          # vitest run
npm run test:watch
```

Suites in `app/stores/__tests__/`. Use vanilla Vitest + happy-dom (no Nuxt context). Inject Supabase mock via `setSupabase()` from `app/lib/supabase-instance.ts`.
```

- [ ] **Step 2: Update Project Structure block** to include stores:

Replace the existing tree with:

```
app/
├── app.vue
├── pages/
│   ├── index.vue          # Головна (створення кімнати)
│   └── [slug].vue         # Кімната (URL: /<roomId>, без /room/)
├── components/            # AppHeader, CardsArea, PlayersList, ConnectionBanner, ...
├── composables/           # useTheme, useDylanAvatar (auth/room/players → stores)
├── stores/                # auth, room, players, presence (Pinia)
├── plugins/               # supabase, vWave, clickOutside
├── lib/                   # supabase-instance (singleton getter)
└── utils/                 # roomId (8-char ID), relativeTime
assets/css/main.css        # MUI-like класи
supabase/migrations/       # SQL міграції (001 initial, 002 drop is_online)
```

- [ ] **Step 3: Confirm CLAUDE.md still ≤ 200 lines**

```bash
wc -l CLAUDE.md
```

If over 200, trim less-essential lines (e.g., compress the Common Commands block).

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add State Management section to CLAUDE.md"
```

---

## Done

All acceptance criteria from the spec should now hold:
1. ✅ Optimistic vote (Task 5b + smoke in Task 13)
2. ✅ Mobile-background = offline ≤ 1s (Task 6 + smoke in Task 13)
3. ✅ Auto-rejoin on return (Task 6 visibility handler)
4. ✅ Reconnect banner (Task 8 + Task 9 + smoke in Task 13)
5. ✅ `is_online` dropped (Task 3)
6. ✅ Differential realtime, refetch only after reconnect (Tasks 4, 5a, 10 watcher)
7. ✅ Old composables deleted (Task 13)
8. ✅ Vitest green (Task 13 step 3)
