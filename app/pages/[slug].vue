<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useAuthStore } from '~/stores/auth'
import { useRoomStore } from '~/stores/room'
import { usePlayersStore } from '~/stores/players'
import { usePresenceStore } from '~/stores/presence'
import { touchRecentRoom } from '~/utils/recentRooms'
import { DEFAULT_PRESET_ID, type DeckPresetId } from '~/utils/cardDecks'
import { normalizeRoomSlug, isValidRoomSlug } from '~/utils/roomId'

const route = useRoute()
const router = useRouter()
const urlParam = route.params.slug as string
let roomId = ''

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
const showRenameRoom = ref(false)
const roomSlugInput = ref('')
const roomSlugError = ref<string | null>(null)
const currentSlug = ref<string | null>(null)

const currentPlayer = computed(() => visiblePlayers.value.find(p => p.id === currentPlayerId.value) ?? null)
const isModerator = computed(() => currentPlayer.value?.is_moderator ?? false)
const isAuthorizedModerator = computed(() => isModerator.value && !!user.value)
const onlineCount = computed(() => visiblePlayers.value.filter(p => online.value.has(p.id)).length)

const playersForUi = computed(() => {
  const mapped = visiblePlayers.value.map(p => ({
    ...p,
    is_online: online.value.has(p.id),
    vote: playersStore.voteOf(p.id),
  }))
  return [
    ...mapped.filter(p => p.is_online),
    ...mapped.filter(p => !p.is_online),
  ]
})

const hasVotes = computed(() => playersForUi.value.some(p => p.vote !== null))

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
  const resolved = await roomStore.resolveRoom(urlParam)
  if (!resolved) {
    router.push('/')
    return
  }
  if (resolved.slug && urlParam === resolved.id) {
    router.replace(`/${resolved.slug}`)
  }
  currentSlug.value = resolved.slug
  roomId = resolved.id
  roomStore.roomId = roomId
  playersStore.roomId = roomId
  await fetchInitialData()

  const session = getStoredSession()
  if (session) {
    try {
      await playersStore.rejoin(session.playerId)
      currentPlayerId.value = session.playerId
      touchRecentRoom(roomId, session.playerId, session.playerName)
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
  touchRecentRoom(roomId, player.id, player.name)
  currentPlayerId.value = player.id
  showJoin.value = false
  await presenceStore.start(roomId, player.id)
}

async function handleVote(card: string) {
  if (!currentPlayerId.value) return
  const next = playersStore.voteOf(currentPlayerId.value) === card ? null : card
  try {
    await playersStore.castVote(currentPlayerId.value, next)
  } catch {
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

async function handleSaveCardDeck(payload: { deckPreset: DeckPresetId; cards: string[] }) {
  if (payload.deckPreset !== roomState.value?.deck_preset) {
    await roomStore.setDeckPreset(payload.deckPreset)
  }
  await roomStore.saveCardDeck(payload.cards)
  showCardDeck.value = false
}

function openRenameRoom() {
  roomSlugInput.value = currentSlug.value ?? ''
  roomSlugError.value = null
  showRenameRoom.value = true
}

async function submitRenameRoom() {
  roomSlugError.value = null
  const raw = roomSlugInput.value.trim()
  if (!raw) {
    await roomStore.setSlug(null)
    currentSlug.value = null
    showRenameRoom.value = false
    router.replace(`/${roomId}`)
    return
  }
  const normalized = normalizeRoomSlug(raw)
  if (!isValidRoomSlug(normalized)) {
    roomSlugError.value = 'Use 2–32 chars: letters, numbers, dashes'
    return
  }
  try {
    await roomStore.setSlug(normalized)
  } catch (e: any) {
    if (e?.code === 'room_slug_taken') {
      roomSlugError.value = 'This name is already taken'
      return
    }
    throw e
  }
  currentSlug.value = normalized
  showRenameRoom.value = false
  router.replace(`/${normalized}`)
}
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <AppHeader
      :online-count="onlineCount"
      :is-moderator="isModerator"
      :player-name="currentPlayer?.name ?? ''"
      @open-sign-in="showAuth = 'signin'"
      @open-sign-up="showAuth = 'signup'"
      @open-card-deck="showCardDeck = true"
      @open-rename-room="openRenameRoom"
      @sign-out="authStore.signOut()"
    />

    <div class="flex flex-1 flex-col md:flex-row gap-6 p-4 sm:p-6 md:p-8 max-w-[1400px] w-full mx-auto">
      <div class="w-full md:w-1/3 lg:w-1/4 flex-shrink-0 flex flex-col gap-6">
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
        <Timer
          v-if="roomState"
          :round-started-at="roomState.round_started_at"
          :phase="roomState.phase ?? 'voting'"
        />
      </div>

      <div class="flex-1 flex flex-col items-center justify-start">
        <CardsArea
          v-if="roomState?.phase === 'voting'"
          :active-cards="roomState.active_cards ?? []"
          :selected-vote="currentPlayer ? playersStore.voteOf(currentPlayer.id) : null"
          :is-moderator="isModerator"
          :has-votes="hasVotes"
          @vote="handleVote"
          @reveal="roomStore.reveal()"
        />
        <ResultsArea
          v-else-if="roomState?.phase === 'revealed'"
          :votes="voteCounts"
          :is-moderator="isModerator"
          @start-new-round="roomStore.startNewRound()"
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
      :deck-preset="roomState.deck_preset ?? DEFAULT_PRESET_ID"
      :active-cards="roomState.active_cards"
      @close="showCardDeck = false"
      @save="handleSaveCardDeck"
    />

    <div v-if="renameTarget" class="mui-modal-overlay" @click.self="renameTarget = null">
      <div class="mui-modal-paper">
        <h2 class="mui-h5 mb-4">Rename Player</h2>
        <input
          v-model="renameValue"
          class="mui-input"
          @keyup.enter="submitRename"
        />
        <div class="flex gap-2 justify-end mt-6">
          <button class="mui-btn mui-btn-text" style="min-width: auto;" @click="renameTarget = null">Cancel</button>
          <button class="mui-btn" style="min-width: 120px;" @click="submitRename">Save</button>
        </div>
      </div>
    </div>

    <div v-if="showRenameRoom" class="mui-modal-overlay" @click.self="showRenameRoom = false">
      <div class="mui-modal-paper">
        <h2 class="mui-h5 mb-4">Rename Room</h2>
        <input
          v-model="roomSlugInput"
          class="mui-input"
          placeholder="e.g. backoffice"
          @keyup.enter="submitRenameRoom"
        />
        <p v-if="roomSlugError" class="text-[13px] mt-2" style="color: #d32f2f;">{{ roomSlugError }}</p>
        <p v-else class="text-[13px] mt-2" style="color: var(--text-muted);">
          Leave empty to remove the custom name.
        </p>
        <div class="flex gap-2 justify-end mt-6">
          <button class="mui-btn mui-btn-text" style="min-width: auto;" @click="showRenameRoom = false">Cancel</button>
          <button class="mui-btn" style="min-width: 120px;" @click="submitRenameRoom">Save</button>
        </div>
      </div>
    </div>
  </div>
</template>
