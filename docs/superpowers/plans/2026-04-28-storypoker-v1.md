# Story Poker v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Побудувати веб-застосунок Story Poker з реалтайм синхронізацією через Supabase — від головної сторінки до повного флоу голосування.

**Architecture:** Nuxt 4 SPA без власного бекенду. Весь стан зберігається в Supabase Postgres, синхронізація між клієнтами через Supabase Realtime subscriptions. Анонімна ідентифікація гравців через localStorage, авторизація через Supabase Auth (email+пароль) для розблокування функції Kick Player.

**Tech Stack:** Nuxt 4.4.2, Vue 3 Composition API, Tailwind CSS 4, Supabase JS v2, @dicebear/core + @dicebear/collection (Dylan avatars), @nuxt/icon, v-wave, Google Fonts Montserrat.

---

## File Map

```
nuxt.config.ts                          -- конфіг Nuxt, підключення модулів
package.json                            -- залежності
.env.example                            -- шаблон env змінних
app/
  app.vue                               -- кореневий компонент
  pages/
    index.vue                           -- головна: форма імені + Create Room
    room/
      [slug].vue                        -- сторінка кімнати
  components/
    AppHeader.vue                       -- хедер з меню юзера
    PlayersList.vue                     -- панель гравців з аватарами
    PlayerRow.vue                       -- один рядок гравця
    CardsArea.vue                       -- сітка карт для голосування
    ResultsArea.vue                     -- кругова діаграма після reveal
    ModeratorInsights.vue               -- блок "round started N ago"
    JoinOverlay.vue                     -- оверлей входу в кімнату
    ConfigureCardDeckModal.vue          -- модал налаштування карт
    AuthModal.vue                       -- модал Sign In / Sign Up
    PieChart.vue                        -- SVG кругова діаграма
  composables/
    useRoom.ts                          -- підписки Realtime, стан кімнати
    usePlayer.ts                        -- поточний гравець, localStorage
    useAuth.ts                          -- Supabase Auth стан
    useDylanAvatar.ts                   -- генерація DiceBear SVG
  utils/
    roomId.ts                           -- генерація 8-char ID
    relativeTime.ts                     -- "N minutes ago"
  plugins/
    supabase.client.ts                  -- ініціалізація Supabase клієнта
supabase/
  migrations/
    001_initial_schema.sql              -- схема БД
```

---

## Task 1: Ініціалізація Nuxt проекту

**Files:**
- Create: `package.json`
- Create: `nuxt.config.ts`
- Create: `.env.example`
- Create: `app/app.vue`

- [ ] **Step 1: Ініціалізувати Nuxt 4 проект**

```bash
cd /Users/ihororlovskyi/work/github/storypoker
npx nuxi@latest init . --no-install
```

Обери: No git init (вже є), No install.

- [ ] **Step 2: Встановити залежності**

```bash
npm install
npm install @supabase/supabase-js
npm install @dicebear/core @dicebear/collection
npm install -D @nuxtjs/tailwindcss
npx nuxi module add icon
npm install v-wave
```

- [ ] **Step 3: Налаштувати `nuxt.config.ts`**

```typescript
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss', '@nuxt/icon'],
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      link: [
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600&display=swap',
        },
      ],
    },
  },
})
```

- [ ] **Step 4: Створити `assets/css/main.css`**

```css
@import 'tailwindcss';

* {
  font-family: 'Montserrat', sans-serif;
}
```

- [ ] **Step 5: Створити `.env.example`**

```
NUXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NUXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

- [ ] **Step 6: Створити `.env` (локально, не комітити)**

Скопіюй `.env.example` у `.env` і заповни реальними значеннями зі свого Supabase проекту.

- [ ] **Step 7: Замінити `app/app.vue`**

```vue
<template>
  <div class="min-h-screen bg-[#1a1a1a] text-white">
    <NuxtPage />
  </div>
</template>
```

- [ ] **Step 8: Запустити dev-сервер і переконатись що стартує**

```bash
npm run dev
```

Очікується: сервер стартує на `http://localhost:3000` без помилок.

- [ ] **Step 9: Зкомітити**

```bash
git add -A
git commit -m "feat: init Nuxt 4 project with Tailwind and base config"
```

---

## Task 2: Supabase — схема БД та клієнт

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`
- Create: `app/plugins/supabase.client.ts`

- [ ] **Step 1: Створити міграцію**

```bash
mkdir -p supabase/migrations
```

Створи файл `supabase/migrations/001_initial_schema.sql`:

```sql
create table rooms (
  id text primary key,
  created_at timestamptz default now()
);

create table room_state (
  room_id text primary key references rooms(id) on delete cascade,
  phase text not null default 'voting',
  active_cards text[] not null default array['0.5','1','2','3','5','8','13','21','?','Pass','☕'],
  round_started_at timestamptz default now()
);

create table players (
  id uuid primary key default gen_random_uuid(),
  room_id text references rooms(id) on delete cascade,
  name text not null,
  is_moderator boolean not null default false,
  vote text,
  is_online boolean not null default true,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

alter table rooms enable row level security;
alter table room_state enable row level security;
alter table players enable row level security;

create policy "public read rooms" on rooms for select using (true);
create policy "public insert rooms" on rooms for insert with check (true);

create policy "public read room_state" on room_state for select using (true);
create policy "public insert room_state" on room_state for insert with check (true);
create policy "public update room_state" on room_state for update using (true);

create policy "public read players" on players for select using (true);
create policy "public insert players" on players for insert with check (true);
create policy "public update players" on players for update using (true);
create policy "public delete players" on players for delete using (true);
```

- [ ] **Step 2: Виконати міграцію в Supabase**

Відкрий Supabase Dashboard → SQL Editor → встав вміст файлу → Run.

Або якщо встановлено Supabase CLI:
```bash
supabase db push
```

- [ ] **Step 3: Увімкнути Realtime для таблиць**

В Supabase Dashboard → Database → Replication → увімкни `players` і `room_state` для реалтайм.

- [ ] **Step 4: Створити плагін `app/plugins/supabase.client.ts`**

```typescript
import { createClient } from '@supabase/supabase-js'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const supabase = createClient(
    config.public.supabaseUrl,
    config.public.supabaseAnonKey
  )
  return {
    provide: { supabase }
  }
})
```

- [ ] **Step 5: Додати runtime config у `nuxt.config.ts`**

```typescript
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss', '@nuxt/icon'],
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    public: {
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY,
    },
  },
  app: {
    head: {
      link: [
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600&display=swap',
        },
      ],
    },
  },
})
```

- [ ] **Step 6: Зкомітити**

```bash
git add -A
git commit -m "feat: add Supabase schema and client plugin"
```

---

## Task 3: Утиліти — roomId та relativeTime

**Files:**
- Create: `app/utils/roomId.ts`
- Create: `app/utils/relativeTime.ts`

- [ ] **Step 1: Створити `app/utils/roomId.ts`**

```typescript
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

export function generateRoomId(): string {
  return Array.from({ length: 8 }, () =>
    CHARS[Math.floor(Math.random() * CHARS.length)]
  ).join('')
}
```

- [ ] **Step 2: Створити `app/utils/relativeTime.ts`**

```typescript
export function relativeTime(date: string | Date): string {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (diff < 60) return 'a few seconds ago'
  if (diff < 3600) {
    const m = Math.floor(diff / 60)
    return `${m} minute${m === 1 ? '' : 's'} ago`
  }
  const h = Math.floor(diff / 3600)
  return `${h} hour${h === 1 ? '' : 's'} ago`
}
```

- [ ] **Step 3: Зкомітити**

```bash
git add app/utils/
git commit -m "feat: add roomId generator and relativeTime util"
```

---

## Task 4: Composable — useAuth

**Files:**
- Create: `app/composables/useAuth.ts`

- [ ] **Step 1: Створити `app/composables/useAuth.ts`**

```typescript
export function useAuth() {
  const { $supabase } = useNuxtApp()
  const user = useState<any>('auth_user', () => null)

  async function init() {
    const { data } = await $supabase.auth.getSession()
    user.value = data.session?.user ?? null
    $supabase.auth.onAuthStateChange((_event, session) => {
      user.value = session?.user ?? null
    })
  }

  async function signIn(email: string, password: string) {
    const { error } = await $supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function signUp(email: string, password: string) {
    const { error } = await $supabase.auth.signUp({ email, password })
    if (error) throw error
  }

  async function signOut() {
    await $supabase.auth.signOut()
  }

  return { user, init, signIn, signUp, signOut }
}
```

- [ ] **Step 2: Зкомітити**

```bash
git add app/composables/useAuth.ts
git commit -m "feat: add useAuth composable"
```

---

## Task 5: Composable — useDylanAvatar

**Files:**
- Create: `app/composables/useDylanAvatar.ts`

- [ ] **Step 1: Створити `app/composables/useDylanAvatar.ts`**

```typescript
import { createAvatar } from '@dicebear/core'
import { dylan } from '@dicebear/collection'

export function useDylanAvatar() {
  function getAvatar(seed: string, grayscale = false): string {
    const avatar = createAvatar(dylan, {
      seed,
      ...(grayscale ? { colorful: false } : {}),
    })
    return avatar.toString()
  }

  function avatarDataUri(seed: string, grayscale = false): string {
    const svg = getAvatar(seed, grayscale)
    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`
  }

  return { avatarDataUri }
}
```

- [ ] **Step 2: Зкомітити**

```bash
git add app/composables/useDylanAvatar.ts
git commit -m "feat: add useDylanAvatar composable with DiceBear Dylan"
```

---

## Task 6: Composable — usePlayer

**Files:**
- Create: `app/composables/usePlayer.ts`

- [ ] **Step 1: Створити `app/composables/usePlayer.ts`**

```typescript
interface StoredSession {
  playerId: string
  playerName: string
}

export function usePlayer(roomId: string) {
  const { $supabase } = useNuxtApp()

  function getStoredSession(): StoredSession | null {
    if (!import.meta.client) return null
    const raw = localStorage.getItem(`storypoker_session_${roomId}`)
    if (!raw) return null
    try { return JSON.parse(raw) } catch { return null }
  }

  function saveSession(playerId: string, playerName: string) {
    localStorage.setItem(
      `storypoker_session_${roomId}`,
      JSON.stringify({ playerId, playerName })
    )
  }

  function clearSession() {
    localStorage.removeItem(`storypoker_session_${roomId}`)
  }

  async function joinRoom(name: string, userId?: string) {
    const { data, error } = await $supabase
      .from('players')
      .insert({ room_id: roomId, name, is_online: true, user_id: userId ?? null })
      .select()
      .single()
    if (error) throw error
    saveSession(data.id, data.name)
    return data
  }

  async function rejoinRoom(playerId: string) {
    const { data, error } = await $supabase
      .from('players')
      .update({ is_online: true })
      .eq('id', playerId)
      .select()
      .single()
    if (error) throw error
    return data
  }

  async function setOffline(playerId: string) {
    await $supabase
      .from('players')
      .update({ is_online: false })
      .eq('id', playerId)
  }

  async function castVote(playerId: string, vote: string) {
    await $supabase.from('players').update({ vote }).eq('id', playerId)
  }

  async function rename(playerId: string, name: string) {
    await $supabase.from('players').update({ name }).eq('id', playerId)
  }

  async function toggleModerator(playerId: string, isModerator: boolean) {
    await $supabase.from('players').update({ is_moderator: isModerator }).eq('id', playerId)
  }

  async function kickPlayer(playerId: string) {
    await $supabase.from('players').delete().eq('id', playerId)
  }

  async function leaveRoom(playerId: string) {
    clearSession()
    await $supabase.from('players').delete().eq('id', playerId)
  }

  async function linkUser(playerId: string, userId: string) {
    await $supabase.from('players').update({ user_id: userId }).eq('id', playerId)
  }

  return {
    getStoredSession,
    saveSession,
    clearSession,
    joinRoom,
    rejoinRoom,
    setOffline,
    castVote,
    rename,
    toggleModerator,
    kickPlayer,
    leaveRoom,
    linkUser,
  }
}
```

- [ ] **Step 2: Зкомітити**

```bash
git add app/composables/usePlayer.ts
git commit -m "feat: add usePlayer composable"
```

---

## Task 7: Composable — useRoom

**Files:**
- Create: `app/composables/useRoom.ts`

- [ ] **Step 1: Створити `app/composables/useRoom.ts`**

```typescript
interface Player {
  id: string
  room_id: string
  name: string
  is_moderator: boolean
  vote: string | null
  is_online: boolean
  user_id: string | null
  created_at: string
}

interface RoomState {
  room_id: string
  phase: 'voting' | 'revealed'
  active_cards: string[]
  round_started_at: string
}

export function useRoom(roomId: string) {
  const { $supabase } = useNuxtApp()
  const players = ref<Player[]>([])
  const roomState = ref<RoomState | null>(null)
  let playersChannel: any = null
  let stateChannel: any = null

  async function fetchInitialData() {
    const [{ data: pData }, { data: sData }] = await Promise.all([
      $supabase.from('players').select('*').eq('room_id', roomId).order('created_at'),
      $supabase.from('room_state').select('*').eq('room_id', roomId).single(),
    ])
    players.value = pData ?? []
    roomState.value = sData ?? null
  }

  function subscribeRealtime() {
    playersChannel = $supabase
      .channel(`players:${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${roomId}` },
        async () => {
          const { data } = await $supabase.from('players').select('*').eq('room_id', roomId).order('created_at')
          players.value = data ?? []
        }
      )
      .subscribe()

    stateChannel = $supabase
      .channel(`room_state:${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_state', filter: `room_id=eq.${roomId}` },
        async () => {
          const { data } = await $supabase.from('room_state').select('*').eq('room_id', roomId).single()
          roomState.value = data ?? null
        }
      )
      .subscribe()
  }

  function unsubscribe() {
    playersChannel?.unsubscribe()
    stateChannel?.unsubscribe()
  }

  async function revealEstimates() {
    await $supabase.from('room_state').update({ phase: 'revealed' }).eq('room_id', roomId)
  }

  async function startNewRound() {
    await Promise.all([
      $supabase.from('players').update({ vote: null }).eq('room_id', roomId),
      $supabase.from('room_state').update({ phase: 'voting', round_started_at: new Date().toISOString() }).eq('room_id', roomId),
    ])
  }

  async function saveCardDeck(cards: string[]) {
    await $supabase.from('room_state').update({ active_cards: cards }).eq('room_id', roomId)
  }

  return {
    players,
    roomState,
    fetchInitialData,
    subscribeRealtime,
    unsubscribe,
    revealEstimates,
    startNewRound,
    saveCardDeck,
  }
}
```

- [ ] **Step 2: Зкомітити**

```bash
git add app/composables/useRoom.ts
git commit -m "feat: add useRoom composable with Realtime subscriptions"
```

---

## Task 8: Головна сторінка

**Files:**
- Create: `app/pages/index.vue`

- [ ] **Step 1: Створити `app/pages/index.vue`**

```vue
<script setup lang="ts">
const name = ref('')
const hasError = ref(false)
const { $supabase } = useNuxtApp()
const router = useRouter()

async function createRoom() {
  if (!name.value.trim()) {
    hasError.value = true
    return
  }
  hasError.value = false
  const roomId = generateRoomId()
  const { error: roomErr } = await $supabase.from('rooms').insert({ id: roomId })
  if (roomErr) throw roomErr
  const { error: stateErr } = await $supabase.from('room_state').insert({ room_id: roomId })
  if (stateErr) throw stateErr
  const { data: player, error: playerErr } = await $supabase
    .from('players')
    .insert({ room_id: roomId, name: name.value.trim(), is_moderator: true })
    .select()
    .single()
  if (playerErr) throw playerErr
  localStorage.setItem(
    `storypoker_session_${roomId}`,
    JSON.stringify({ playerId: player.id, playerName: player.name })
  )
  router.push(`/room/${roomId}`)
}
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-screen px-4">
    <h1 class="text-2xl font-semibold mb-2 text-center">Create a planning poker room</h1>
    <p class="text-gray-400 mb-8 text-center">and start estimating with your team right away</p>
    <div class="w-full max-w-sm flex flex-col gap-4">
      <input
        v-model="name"
        type="text"
        placeholder="Please enter your name"
        class="bg-transparent border rounded px-4 py-3 outline-none transition-colors"
        :class="hasError ? 'border-red-500' : 'border-gray-600 focus:border-gray-400'"
        @keyup.enter="createRoom"
      />
      <button
        class="bg-[#4a6572] hover:bg-[#5a7582] text-white font-semibold py-3 rounded-full uppercase tracking-widest transition-colors"
        @click="createRoom"
      >
        Create Room
      </button>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Відкрити `http://localhost:3000` і перевірити**

- Поле порожнє → клік "Create Room" → рамка стає червоною
- Ввести ім'я → клік → редірект на `/room/[id]` (404 поки що — це нормально)
- Перевірити в Supabase Dashboard що у таблицях `rooms`, `room_state`, `players` з'явились записи

- [ ] **Step 3: Зкомітити**

```bash
git add app/pages/index.vue
git commit -m "feat: add home page with create room form"
```

---

## Task 9: Компонент PieChart

**Files:**
- Create: `app/components/PieChart.vue`

- [ ] **Step 1: Створити `app/components/PieChart.vue`**

```vue
<script setup lang="ts">
const props = defineProps<{
  votes: Record<string, number>
}>()

const COLORS = ['#4a6572', '#e64a19', '#fbc02d', '#388e3c', '#7b1fa2', '#0288d1', '#00796b', '#f57c00']

const segments = computed(() => {
  const entries = Object.entries(props.votes).filter(([, count]) => count > 0)
  const total = entries.reduce((s, [, c]) => s + c, 0)
  if (total === 0) return []

  const cx = 50
  const cy = 50
  const r = 40
  let angle = -Math.PI / 2
  return entries.map(([label, count], i) => {
    const slice = (count / total) * 2 * Math.PI
    const x1 = cx + r * Math.cos(angle)
    const y1 = cy + r * Math.sin(angle)
    angle += slice
    const x2 = cx + r * Math.cos(angle)
    const y2 = cy + r * Math.sin(angle)
    const largeArc = slice > Math.PI ? 1 : 0
    const midAngle = angle - slice / 2
    const lx = cx + (r * 0.6) * Math.cos(midAngle)
    const ly = cy + (r * 0.6) * Math.sin(midAngle)
    return {
      d: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`,
      color: COLORS[i % COLORS.length],
      label,
      lx,
      ly,
    }
  })
})
</script>

<template>
  <svg viewBox="0 0 100 100" class="w-full max-w-xs mx-auto">
    <path
      v-for="seg in segments"
      :key="seg.label"
      :d="seg.d"
      :fill="seg.color"
    />
    <text
      v-for="seg in segments"
      :key="`label-${seg.label}`"
      :x="seg.lx"
      :y="seg.ly"
      text-anchor="middle"
      dominant-baseline="central"
      font-size="6"
      fill="white"
      font-weight="600"
    >{{ seg.label }}</text>
  </svg>
</template>
```

- [ ] **Step 2: Зкомітити**

```bash
git add app/components/PieChart.vue
git commit -m "feat: add SVG PieChart component"
```

---

## Task 10: Компонент PlayerRow

**Files:**
- Create: `app/components/PlayerRow.vue`

- [ ] **Step 1: Створити `app/components/PlayerRow.vue`**

```vue
<script setup lang="ts">
const props = defineProps<{
  player: {
    id: string
    name: string
    is_moderator: boolean
    vote: string | null
    is_online: boolean
    user_id: string | null
  }
  phase: 'voting' | 'revealed'
  currentPlayerId: string | null
  currentUserIsAuthorizedModerator: boolean
}>()

const emit = defineEmits<{
  rename: [id: string]
  toggleModerator: [id: string, value: boolean]
  leave: [id: string]
  kick: [id: string]
}>()

const { avatarDataUri } = useDylanAvatar()

const isOwn = computed(() => props.player.id === props.currentPlayerId)
const showMenu = ref(false)

function close() { showMenu.value = false }
</script>

<template>
  <div class="flex items-center gap-2 py-1 px-2 rounded hover:bg-white/5 relative">
    <img
      :src="avatarDataUri(player.name, !player.is_online)"
      :alt="player.name"
      class="w-7 h-7 rounded-full flex-shrink-0"
    />
    <span
      class="flex-1 text-sm truncate"
      :class="player.is_online ? 'text-white' : 'text-gray-500'"
    >
      {{ player.name }}
    </span>
    <Icon v-if="player.is_moderator" name="mdi:gamepad-variant" class="text-gray-400 w-4 h-4 flex-shrink-0" />

    <template v-if="player.is_online">
      <template v-if="phase === 'voting'">
        <Icon
          v-if="player.vote !== null"
          name="mdi:check-circle"
          class="text-green-500 w-4 h-4 flex-shrink-0"
        />
      </template>
      <span v-else class="text-sm text-gray-300 flex-shrink-0">{{ player.vote ?? '—' }}</span>
    </template>
    <Icon v-else name="mdi:wifi-off" class="text-gray-600 w-4 h-4 flex-shrink-0" />

    <div v-if="isOwn || currentUserIsAuthorizedModerator" class="relative">
      <button class="p-1 hover:bg-white/10 rounded" @click="showMenu = !showMenu">
        <Icon name="mdi:dots-vertical" class="w-4 h-4" />
      </button>
      <div
        v-if="showMenu"
        v-click-outside="close"
        class="absolute right-0 top-6 bg-[#2a2a2a] border border-gray-700 rounded shadow-lg z-10 min-w-36"
      >
        <template v-if="isOwn">
          <button class="w-full text-left px-4 py-2 text-sm hover:bg-white/10" @click="emit('rename', player.id); close()">
            Rename
          </button>
          <button class="w-full text-left px-4 py-2 text-sm hover:bg-white/10" @click="emit('toggleModerator', player.id, !player.is_moderator); close()">
            {{ player.is_moderator ? 'Leave moderator role' : 'Become moderator' }}
          </button>
          <button class="w-full text-left px-4 py-2 text-sm hover:bg-white/10 text-red-400" @click="emit('leave', player.id); close()">
            Leave room
          </button>
        </template>
        <template v-else-if="currentUserIsAuthorizedModerator">
          <button class="w-full text-left px-4 py-2 text-sm hover:bg-white/10 text-red-400" @click="emit('kick', player.id); close()">
            Kick Player
          </button>
        </template>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Додати директиву `v-click-outside` у `app/plugins/clickOutside.ts`**

```typescript
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive('click-outside', {
    mounted(el, binding) {
      el._clickOutside = (e: MouseEvent) => {
        if (!el.contains(e.target as Node)) binding.value()
      }
      document.addEventListener('click', el._clickOutside)
    },
    unmounted(el) {
      document.removeEventListener('click', el._clickOutside)
    },
  })
})
```

- [ ] **Step 3: Зкомітити**

```bash
git add app/components/PlayerRow.vue app/plugins/clickOutside.ts
git commit -m "feat: add PlayerRow component with menu"
```

---

## Task 11: Компонент PlayersList

**Files:**
- Create: `app/components/PlayersList.vue`

- [ ] **Step 1: Створити `app/components/PlayersList.vue`**

```vue
<script setup lang="ts">
const props = defineProps<{
  players: Array<{
    id: string
    name: string
    is_moderator: boolean
    vote: string | null
    is_online: boolean
    user_id: string | null
  }>
  phase: 'voting' | 'revealed'
  currentPlayerId: string | null
  currentUserIsAuthorizedModerator: boolean
}>()

const emit = defineEmits<{
  rename: [id: string]
  toggleModerator: [id: string, value: boolean]
  leave: [id: string]
  kick: [id: string]
}>()
</script>

<template>
  <div class="bg-[#2a2a2a] rounded-lg p-3">
    <h2 class="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider">Players</h2>
    <PlayerRow
      v-for="player in players"
      :key="player.id"
      :player="player"
      :phase="phase"
      :current-player-id="currentPlayerId"
      :current-user-is-authorized-moderator="currentUserIsAuthorizedModerator"
      @rename="emit('rename', $event)"
      @toggle-moderator="emit('toggleModerator', $event, arguments[1])"
      @leave="emit('leave', $event)"
      @kick="emit('kick', $event)"
    />
  </div>
</template>
```

- [ ] **Step 2: Зкомітити**

```bash
git add app/components/PlayersList.vue
git commit -m "feat: add PlayersList component"
```

---

## Task 12: Компонент CardsArea

**Files:**
- Create: `app/components/CardsArea.vue`

- [ ] **Step 1: Створити `app/components/CardsArea.vue`**

```vue
<script setup lang="ts">
const props = defineProps<{
  activeCards: string[]
  selectedVote: string | null
  isModerator: boolean
}>()

const emit = defineEmits<{
  vote: [card: string]
  reveal: []
}>()
</script>

<template>
  <div class="flex flex-col items-center gap-6">
    <div class="grid grid-cols-6 gap-3 w-full">
      <button
        v-for="card in activeCards"
        :key="card"
        class="aspect-[2/3] rounded-lg text-xl font-semibold transition-colors flex items-center justify-center"
        :class="selectedVote === card
          ? 'bg-[#4a6572] text-white'
          : 'bg-[#3a3a3a] hover:bg-[#444] text-white'"
        @click="emit('vote', card)"
      >
        {{ card }}
      </button>
    </div>
    <button
      v-if="isModerator"
      class="bg-[#4a6572] hover:bg-[#5a7582] text-white font-semibold py-3 px-8 rounded-full uppercase tracking-widest transition-colors"
      @click="emit('reveal')"
    >
      Reveal Estimates
    </button>
  </div>
</template>
```

- [ ] **Step 2: Зкомітити**

```bash
git add app/components/CardsArea.vue
git commit -m "feat: add CardsArea component"
```

---

## Task 13: Компонент ResultsArea

**Files:**
- Create: `app/components/ResultsArea.vue`

- [ ] **Step 1: Створити `app/components/ResultsArea.vue`**

```vue
<script setup lang="ts">
const props = defineProps<{
  votes: Record<string, number>
  isModerator: boolean
}>()

const emit = defineEmits<{
  startNewRound: []
}>()
</script>

<template>
  <div class="flex flex-col items-center gap-6">
    <PieChart :votes="votes" />
    <button
      v-if="isModerator"
      class="bg-[#4a6572] hover:bg-[#5a7582] text-white font-semibold py-3 px-8 rounded-full uppercase tracking-widest transition-colors"
      @click="emit('startNewRound')"
    >
      Start New Estimation Round
    </button>
  </div>
</template>
```

- [ ] **Step 2: Зкомітити**

```bash
git add app/components/ResultsArea.vue
git commit -m "feat: add ResultsArea component"
```

---

## Task 14: Компонент ModeratorInsights

**Files:**
- Create: `app/components/ModeratorInsights.vue`

- [ ] **Step 1: Створити `app/components/ModeratorInsights.vue`**

```vue
<script setup lang="ts">
const props = defineProps<{
  roundStartedAt: string
}>()

const text = ref('')

function update() {
  text.value = `This round started ${relativeTime(props.roundStartedAt)}`
}

let interval: ReturnType<typeof setInterval>
onMounted(() => { update(); interval = setInterval(update, 30_000) })
onUnmounted(() => clearInterval(interval))
watch(() => props.roundStartedAt, update)
</script>

<template>
  <div class="bg-[#2a2a2a] rounded-lg p-3 mt-3">
    <h2 class="text-sm font-semibold text-gray-400 mb-1 uppercase tracking-wider">Moderator Insights</h2>
    <p class="text-sm text-gray-300">{{ text }}</p>
  </div>
</template>
```

- [ ] **Step 2: Зкомітити**

```bash
git add app/components/ModeratorInsights.vue
git commit -m "feat: add ModeratorInsights component"
```

---

## Task 15: Компонент ConfigureCardDeckModal

**Files:**
- Create: `app/components/ConfigureCardDeckModal.vue`

- [ ] **Step 1: Створити `app/components/ConfigureCardDeckModal.vue`**

```vue
<script setup lang="ts">
const ALL_CARDS = ['0.5', '1', '2', '3', '5', '8', '13', '21', '?', 'Pass', '☕']

const props = defineProps<{
  activeCards: string[]
}>()

const emit = defineEmits<{
  save: [cards: string[]]
  close: []
}>()

const selected = ref<string[]>([...props.activeCards])

function toggle(card: string) {
  if (selected.value.includes(card)) {
    selected.value = selected.value.filter(c => c !== card)
  } else {
    selected.value = [...selected.value, card].sort(
      (a, b) => ALL_CARDS.indexOf(a) - ALL_CARDS.indexOf(b)
    )
  }
}
</script>

<template>
  <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50" @click.self="emit('close')">
    <div class="bg-[#2a2a2a] rounded-xl p-6 w-full max-w-md relative">
      <button class="absolute top-4 right-4 text-gray-400 hover:text-white" @click="emit('close')">
        <Icon name="mdi:close" class="w-5 h-5" />
      </button>
      <h2 class="text-lg font-semibold mb-4">Configure Card Deck</h2>
      <select class="w-full bg-[#3a3a3a] border border-gray-600 rounded px-3 py-2 mb-4 text-sm">
        <option>Fibonacci scale</option>
      </select>
      <div class="grid grid-cols-3 gap-2 mb-6">
        <label
          v-for="card in ALL_CARDS"
          :key="card"
          class="flex items-center gap-2 text-sm cursor-pointer"
        >
          <input
            type="checkbox"
            :checked="selected.includes(card)"
            class="accent-[#4a6572]"
            @change="toggle(card)"
          />
          {{ card }}
        </label>
      </div>
      <button
        class="w-full bg-[#4a6572] hover:bg-[#5a7582] text-white font-semibold py-3 rounded-full uppercase tracking-widest transition-colors"
        @click="emit('save', selected)"
      >
        Save Card Deck
      </button>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Зкомітити**

```bash
git add app/components/ConfigureCardDeckModal.vue
git commit -m "feat: add ConfigureCardDeckModal component"
```

---

## Task 16: Компонент AuthModal

**Files:**
- Create: `app/components/AuthModal.vue`

- [ ] **Step 1: Створити `app/components/AuthModal.vue`**

```vue
<script setup lang="ts">
const props = defineProps<{
  mode: 'signin' | 'signup'
}>()

const emit = defineEmits<{
  close: []
  success: []
}>()

const { signIn, signUp } = useAuth()
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  loading.value = true
  try {
    if (props.mode === 'signin') {
      await signIn(email.value, password.value)
    } else {
      await signUp(email.value, password.value)
    }
    emit('success')
    emit('close')
  } catch (e: any) {
    error.value = e.message ?? 'Something went wrong'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50" @click.self="emit('close')">
    <div class="bg-[#2a2a2a] rounded-xl p-6 w-full max-w-sm relative">
      <button class="absolute top-4 right-4 text-gray-400 hover:text-white" @click="emit('close')">
        <Icon name="mdi:close" class="w-5 h-5" />
      </button>
      <h2 class="text-xl font-semibold mb-1 text-center">
        {{ mode === 'signin' ? 'Sign In' : 'Sign Up' }}
      </h2>
      <p v-if="mode === 'signup'" class="text-gray-400 text-sm text-center mb-4">and gain moderator powers</p>
      <div class="flex flex-col gap-3 mt-4">
        <input
          v-model="email"
          type="email"
          placeholder="Please enter business email"
          class="bg-transparent border border-gray-600 rounded px-4 py-3 text-sm outline-none focus:border-gray-400"
        />
        <input
          v-model="password"
          type="password"
          placeholder="Please enter password"
          class="bg-transparent border border-gray-600 rounded px-4 py-3 text-sm outline-none focus:border-gray-400"
        />
        <p v-if="error" class="text-red-400 text-xs">{{ error }}</p>
        <button
          class="bg-[#4a6572] hover:bg-[#5a7582] text-white font-semibold py-3 rounded-full uppercase tracking-widest transition-colors disabled:opacity-50"
          :disabled="loading"
          @click="submit"
        >
          {{ mode === 'signin' ? 'Sign In' : 'Sign Up' }}
        </button>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Зкомітити**

```bash
git add app/components/AuthModal.vue
git commit -m "feat: add AuthModal component"
```

---

## Task 17: Компонент AppHeader

**Files:**
- Create: `app/components/AppHeader.vue`

- [ ] **Step 1: Створити `app/components/AppHeader.vue`**

```vue
<script setup lang="ts">
const props = defineProps<{
  onlineCount: number
  isModerator: boolean
  playerName: string
}>()

const emit = defineEmits<{
  openSignIn: []
  openSignUp: []
  openCardDeck: []
  signOut: []
}>()

const { user } = useAuth()
const { avatarDataUri } = useDylanAvatar()
const showMenu = ref(false)
</script>

<template>
  <header class="bg-[#2a2a2a] px-4 py-2 flex items-center justify-between sticky top-0 z-40">
    <NuxtLink to="/" class="font-semibold text-base">Story Point Poker</NuxtLink>
    <div class="flex items-center gap-3 relative">
      <span class="text-sm text-gray-400">{{ onlineCount }}</span>
      <button class="flex items-center" @click="showMenu = !showMenu">
        <img
          v-if="user"
          :src="avatarDataUri(playerName)"
          class="w-8 h-8 rounded-full"
          :alt="playerName"
        />
        <Icon v-else name="mdi:account-circle" class="w-8 h-8 text-gray-400" />
      </button>
      <div
        v-if="showMenu"
        class="absolute right-0 top-10 bg-[#2a2a2a] border border-gray-700 rounded shadow-lg z-50 min-w-44"
      >
        <template v-if="isModerator">
          <button class="w-full text-left px-4 py-2 text-sm hover:bg-white/10 flex items-center gap-2" @click="emit('openCardDeck'); showMenu = false">
            <Icon name="mdi:cog" class="w-4 h-4" /> Configure Card Deck
          </button>
          <hr class="border-gray-700" />
        </template>
        <template v-if="!user">
          <button class="w-full text-left px-4 py-2 text-sm hover:bg-white/10 flex items-center gap-2" @click="emit('openSignIn'); showMenu = false">
            <Icon name="mdi:login" class="w-4 h-4" /> Sign In
          </button>
          <button class="w-full text-left px-4 py-2 text-sm hover:bg-white/10 flex items-center gap-2" @click="emit('openSignUp'); showMenu = false">
            <Icon name="mdi:account-plus" class="w-4 h-4" /> Sign Up
          </button>
        </template>
        <template v-else>
          <button class="w-full text-left px-4 py-2 text-sm hover:bg-white/10 flex items-center gap-2" @click="emit('signOut'); showMenu = false">
            <Icon name="mdi:logout" class="w-4 h-4" /> Sign Out
          </button>
        </template>
      </div>
    </div>
  </header>
</template>
```

- [ ] **Step 2: Зкомітити**

```bash
git add app/components/AppHeader.vue
git commit -m "feat: add AppHeader component"
```

---

## Task 18: Компонент JoinOverlay

**Files:**
- Create: `app/components/JoinOverlay.vue`

- [ ] **Step 1: Створити `app/components/JoinOverlay.vue`**

```vue
<script setup lang="ts">
const emit = defineEmits<{
  join: [name: string]
}>()

const name = ref('')
const hasError = ref(false)

function submit() {
  if (!name.value.trim()) {
    hasError.value = true
    return
  }
  emit('join', name.value.trim())
}
</script>

<template>
  <div class="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
    <div class="bg-[#2a2a2a] rounded-xl p-6 w-full max-w-sm flex flex-col gap-4">
      <h2 class="text-lg font-semibold text-center">Join the room</h2>
      <input
        v-model="name"
        type="text"
        placeholder="Please enter your name"
        class="bg-transparent border rounded px-4 py-3 text-sm outline-none transition-colors"
        :class="hasError ? 'border-red-500' : 'border-gray-600 focus:border-gray-400'"
        @keyup.enter="submit"
      />
      <button
        class="bg-[#4a6572] hover:bg-[#5a7582] text-white font-semibold py-3 rounded-full uppercase tracking-widest transition-colors"
        @click="submit"
      >
        Join Room
      </button>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Зкомітити**

```bash
git add app/components/JoinOverlay.vue
git commit -m "feat: add JoinOverlay component"
```

---

## Task 19: Сторінка кімнати — фінальна збірка

**Files:**
- Create: `app/pages/room/[slug].vue`

- [ ] **Step 1: Створити `app/pages/room/[slug].vue`**

```vue
<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const roomId = route.params.slug as string

const { user, init: initAuth, signOut: authSignOut, linkUser } = useAuth()
const { players, roomState, fetchInitialData, subscribeRealtime, unsubscribe, revealEstimates, startNewRound, saveCardDeck } = useRoom(roomId)
const { getStoredSession, joinRoom, rejoinRoom, setOffline, castVote, rename, toggleModerator, kickPlayer, leaveRoom, linkUser: linkPlayerUser } = usePlayer(roomId)

const currentPlayerId = ref<string | null>(null)
const showJoin = ref(false)
const showAuth = ref<'signin' | 'signup' | null>(null)
const showCardDeck = ref(false)
const renameTarget = ref<string | null>(null)
const renameValue = ref('')

const currentPlayer = computed(() => players.value.find(p => p.id === currentPlayerId.value) ?? null)
const isModerator = computed(() => currentPlayer.value?.is_moderator ?? false)
const isAuthorizedModerator = computed(() => isModerator.value && !!user.value)
const onlineCount = computed(() => players.value.filter(p => p.is_online).length)

const voteCounts = computed(() => {
  if (!roomState.value) return {}
  return players.value.reduce((acc, p) => {
    if (p.vote) acc[p.vote] = (acc[p.vote] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)
})

onMounted(async () => {
  await initAuth()
  await fetchInitialData()

  const session = getStoredSession()
  if (session) {
    try {
      await rejoinRoom(session.playerId)
      currentPlayerId.value = session.playerId
    } catch {
      showJoin.value = true
    }
  } else {
    showJoin.value = true
  }

  subscribeRealtime()

  window.addEventListener('beforeunload', onBeforeUnload)
})

onUnmounted(() => {
  unsubscribe()
  window.removeEventListener('beforeunload', onBeforeUnload)
})

function onBeforeUnload() {
  if (currentPlayerId.value) setOffline(currentPlayerId.value)
}

async function handleJoin(name: string) {
  const player = await joinRoom(name, user.value?.id)
  currentPlayerId.value = player.id
  showJoin.value = false
}

async function handleVote(card: string) {
  if (!currentPlayerId.value) return
  await castVote(currentPlayerId.value, card)
}

async function handleReveal() {
  await revealEstimates()
}

async function handleStartNewRound() {
  await startNewRound()
}

async function handleRename(id: string) {
  renameTarget.value = id
  const player = players.value.find(p => p.id === id)
  renameValue.value = player?.name ?? ''
}

async function submitRename() {
  if (renameTarget.value && renameValue.value.trim()) {
    await rename(renameTarget.value, renameValue.value.trim())
    renameTarget.value = null
  }
}

async function handleToggleModerator(id: string, value: boolean) {
  await toggleModerator(id, value)
}

async function handleLeave(id: string) {
  await leaveRoom(id)
  router.push('/')
}

async function handleKick(id: string) {
  await kickPlayer(id)
}

async function handleAuthSuccess() {
  if (currentPlayerId.value && user.value) {
    await linkPlayerUser(currentPlayerId.value, user.value.id)
  }
}

async function handleSignOut() {
  await authSignOut()
}

async function handleSaveCardDeck(cards: string[]) {
  await saveCardDeck(cards)
  showCardDeck.value = false
}
</script>

<template>
  <div class="min-h-screen bg-[#1a1a1a] text-white flex flex-col">
    <AppHeader
      :online-count="onlineCount"
      :is-moderator="isModerator"
      :player-name="currentPlayer?.name ?? ''"
      @open-sign-in="showAuth = 'signin'"
      @open-sign-up="showAuth = 'signup'"
      @open-card-deck="showCardDeck = true"
      @sign-out="handleSignOut"
    />

    <div class="flex flex-1 gap-4 p-4">
      <div class="w-64 flex-shrink-0 flex flex-col">
        <PlayersList
          :players="players"
          :phase="roomState?.phase ?? 'voting'"
          :current-player-id="currentPlayerId"
          :current-user-is-authorized-moderator="isAuthorizedModerator"
          @rename="handleRename"
          @toggle-moderator="handleToggleModerator"
          @leave="handleLeave"
          @kick="handleKick"
        />
        <ModeratorInsights
          v-if="isModerator && roomState"
          :round-started-at="roomState.round_started_at"
        />
      </div>

      <div class="flex-1 flex items-start justify-center pt-4">
        <CardsArea
          v-if="roomState?.phase === 'voting'"
          :active-cards="roomState?.active_cards ?? []"
          :selected-vote="currentPlayer?.vote ?? null"
          :is-moderator="isModerator"
          @vote="handleVote"
          @reveal="handleReveal"
        />
        <ResultsArea
          v-else-if="roomState?.phase === 'revealed'"
          :votes="voteCounts"
          :is-moderator="isModerator"
          @start-new-round="handleStartNewRound"
        />
      </div>
    </div>

    <JoinOverlay v-if="showJoin" @join="handleJoin" />

    <AuthModal
      v-if="showAuth"
      :mode="showAuth"
      @close="showAuth = null"
      @success="handleAuthSuccess"
    />

    <ConfigureCardDeckModal
      v-if="showCardDeck && roomState"
      :active-cards="roomState.active_cards"
      @close="showCardDeck = false"
      @save="handleSaveCardDeck"
    />

    <div v-if="renameTarget" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div class="bg-[#2a2a2a] rounded-xl p-6 w-full max-w-sm flex flex-col gap-4">
        <h2 class="text-lg font-semibold">Rename</h2>
        <input
          v-model="renameValue"
          class="bg-transparent border border-gray-600 rounded px-4 py-3 text-sm outline-none focus:border-gray-400"
          @keyup.enter="submitRename"
        />
        <div class="flex gap-2 justify-end">
          <button class="px-4 py-2 text-sm text-gray-400 hover:text-white" @click="renameTarget = null">Cancel</button>
          <button class="bg-[#4a6572] px-4 py-2 text-sm rounded" @click="submitRename">Save</button>
        </div>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Відкрити кімнату і перевірити базовий флоу**

- Перейти на `/room/[id]` зі збереженою сесією → одразу бачиш кімнату
- Відкрити в новій вкладці / іншому браузері → бачиш join-оверлей
- Після Join → обидва гравці бачать один одного в списку в реалтаймі
- Клік по карті → з'являється ✓ в іншого гравця
- Moderator → Reveal Estimates → бачиш діаграму і числа

- [ ] **Step 3: Перевірити Kick Player**

- Авторизуватись через Sign Up
- Стати модератором
- Натиснути `⋮` на чужому гравці → "Kick Player" → гравця видалено

- [ ] **Step 4: Зкомітити**

```bash
git add app/pages/room/
git commit -m "feat: add room page — full voting flow"
```

---

## Task 20: Фінальна перевірка та .gitignore

**Files:**
- Create/Modify: `.gitignore`

- [ ] **Step 1: Переконатись що `.env` не потрапить у git**

```bash
cat .gitignore | grep .env
```

Якщо немає — додати:
```
.env
.env.local
```

- [ ] **Step 2: Перевірити повний флоу end-to-end**

1. Головна → ввести ім'я → Create Room → редірект у кімнату
2. Скопіювати URL → відкрити в іншому браузері → Join Room → обидва гравці в списку
3. Обидва голосують → модератор бачить ✓ у всіх
4. Reveal Estimates → кругова діаграма з результатами
5. Start New Estimation Round → карти скинуті, знову phase=voting
6. Configure Card Deck → зняти кілька карт → Save → карти оновились у обох гравців
7. Sign Up → стати модератором → кнопка Kick Player доступна
8. Закрити вкладку → гравець офлайн (сірий аватар)
9. Повернутись → автоматично зайшов без форми

- [ ] **Step 3: Фінальний коміт**

```bash
git add .
git commit -m "feat: story poker v1 complete"
```
