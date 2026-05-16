<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useAuthStore } from '~/stores/auth'
import { useRoomStore } from '~/stores/room'
import { usePlayersStore } from '~/stores/players'
import { usePresenceStore } from '~/stores/presence'
import { useProfilesStore } from '~/stores/profiles'
import { touchRecentRoom } from '~/utils/recentRooms'
import { DEFAULT_PRESET_ID, type DeckPresetId } from '~/utils/cardDecks'
import { normalizeRoomSlug, isValidRoomSlug } from '~/utils/roomId'
import { detectRoleGroup } from '~/utils/playerRoles'

const route = useRoute()
const router = useRouter()
const urlParam = route.params.slug as string
let roomId = ''

const authStore = useAuthStore()
const roomStore = useRoomStore()
const playersStore = usePlayersStore()
const presenceStore = usePresenceStore()
const profilesStore = useProfilesStore()

const { user } = storeToRefs(authStore)
const { roomState } = storeToRefs(roomStore)
const { visiblePlayers, pendingVotes } = storeToRefs(playersStore)
const { online, status: connectionStatus } = storeToRefs(presenceStore)

const currentPlayerId = ref<string | null>(null)
const showJoin = ref(false)
const showAuth = ref<'signin' | 'signup' | null>(null)
const showCardDeck = ref(false)
const showAccountSettings = ref(false)
const renameTarget = ref<string | null>(null)
const renameValue = ref('')
const showRenameRoom = ref(false)
const roomNameInput = ref('')
const roomNameError = ref<string | null>(null)
const currentSlug = ref<string | null>(null)
const currentRoomName = ref<string | null>(null)
const origin = ref('')
const kickTargetId = ref<string | null>(null)
const kickTargetName = computed(() => visiblePlayers.value.find(p => p.id === kickTargetId.value)?.name ?? '')

const renameSaveBtn = ref<HTMLButtonElement | null>(null)
const roomSaveBtn = ref<HTMLButtonElement | null>(null)
const kickConfirmBtn = ref<HTMLButtonElement | null>(null)

const { t } = useI18n()
const currentPlayer = computed(() => visiblePlayers.value.find(p => p.id === currentPlayerId.value) ?? null)
const isModerator = computed(() => currentPlayer.value?.is_moderator ?? false)
const isAuthorizedModerator = computed(() => isModerator.value && !!user.value)
const onlineCount = computed(() => visiblePlayers.value.filter(p => online.value.has(p.id)).length)

const playersForUi = computed(() =>
  visiblePlayers.value.map(p => ({
    ...p,
    is_online: online.value.has(p.id),
    vote: playersStore.voteOf(p.id),
    votePending: pendingVotes.value[p.id] !== undefined,
  }))
)

const hasVotes = computed(() => playersForUi.value.some(p => p.vote !== null))

const voteCounts = computed(() => {
  if (!roomState.value) return {}
  return visiblePlayers.value.reduce((acc, p) => {
    if (p.vote) acc[p.vote] = (acc[p.vote] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)
})

const groupedVoteCounts = computed(() => {
  if (!roomState.value) return null
  const dev: Record<string, number> = {}
  const qa: Record<string, number> = {}
  let hasGroups = false
  for (const p of visiblePlayers.value) {
    if (!p.vote) continue
    const group = detectRoleGroup(p.name)
    if (!group) continue
    hasGroups = true
    const target = group === 'DEV' ? dev : qa
    target[p.vote] = (target[p.vote] ?? 0) + 1
  }
  return hasGroups ? { dev, qa } : null
})

let playersChannel: any = null
let stateChannel: any = null
let roomChannel: any = null
let profilesChannel: any = null

onMounted(async () => {
  origin.value = window.location.origin
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
  currentRoomName.value = resolved.name
  roomId = resolved.id
  roomStore.roomId = roomId
  playersStore.roomId = roomId
  await fetchInitialData()

  const session = getStoredSession()
  let restored: { id: string; name: string } | null = null
  if (session) {
    try {
      const player = await playersStore.rejoin(session.playerId)
      restored = { id: player.id, name: player.name }
    } catch {}
  }
  if (!restored) {
    const existing = await playersStore.findExistingPlayer(roomId, user.value?.id ?? null)
    if (existing) {
      try {
        const player = await playersStore.rejoin(existing.id)
        restored = { id: player.id, name: player.name }
      } catch {}
    }
  }
  if (restored) {
    currentPlayerId.value = restored.id
    touchRecentRoom(roomId, restored.id, restored.name)
    await presenceStore.start(roomId, restored.id)
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

watch(visiblePlayers, async (next) => {
  const ids = next.map(p => p.user_id).filter(Boolean) as string[]
  if (ids.length) await profilesStore.fetchMany(ids)
}, { deep: true })

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
  const ids = (pData ?? []).map((p: any) => p.user_id).filter(Boolean) as string[]
  if (user.value?.id) ids.push(user.value.id)
  if (ids.length) await profilesStore.fetchMany(ids)
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
  roomChannel = $supabase
    .channel(`rooms:${roomId}`)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
      (payload: any) => {
        const row = payload.new as { slug: string | null; name: string | null }
        currentSlug.value = row.slug
        currentRoomName.value = row.name
        if (row.slug && route.params.slug !== row.slug) {
          router.replace(`/${row.slug}`)
        } else if (!row.slug && route.params.slug !== roomId) {
          router.replace(`/${roomId}`)
        }
      })
    .subscribe()
  profilesChannel = $supabase
    .channel(`user_profiles:${roomId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'user_profiles' },
      (payload) => profilesStore.applyChange(payload as any))
    .subscribe()
}

function unsubscribe() {
  playersChannel?.unsubscribe()
  stateChannel?.unsubscribe()
  roomChannel?.unsubscribe()
  profilesChannel?.unsubscribe()
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

function handleKick(id: string) {
  kickTargetId.value = id
}

async function confirmKick() {
  if (!kickTargetId.value) return
  await playersStore.kick(kickTargetId.value)
  kickTargetId.value = null
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
  roomNameInput.value = currentRoomName.value ?? currentSlug.value ?? ''
  roomNameError.value = null
  showRenameRoom.value = true
}

async function submitRenameRoom() {
  roomNameError.value = null
  const name = roomNameInput.value.trim()
  if (!name) {
    await roomStore.setRoomName(null, null)
    currentRoomName.value = null
    currentSlug.value = null
    showRenameRoom.value = false
    router.replace(`/${roomId}`)
    return
  }
  const slug = normalizeRoomSlug(name)
  if (!isValidRoomSlug(slug)) {
    roomNameError.value = t('room.slugError')
    return
  }
  try {
    await roomStore.setRoomName(name, slug)
  } catch (e: any) {
    if (e?.code === 'room_slug_taken') {
      roomNameError.value = t('room.slugTaken')
      return
    }
    throw e
  }
  currentRoomName.value = name
  currentSlug.value = slug
  showRenameRoom.value = false
  router.replace(`/${slug}`)
}
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <AppHeader
      :online-count="onlineCount"
      :is-moderator="isModerator"
      :player-name="currentPlayer?.name ?? ''"
      :player-user-id="currentPlayer?.user_id ?? null"
      :room-name="currentRoomName ?? currentSlug ?? roomId"
      @open-sign-in="showAuth = 'signin'"
      @open-sign-up="showAuth = 'signup'"
      @open-card-deck="showCardDeck = true"
      @open-rename-room="openRenameRoom"
      @open-account-settings="showAccountSettings = true"
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
          :paused-at="roomState.paused_at ?? null"
          :paused-elapsed-ms="roomState.paused_elapsed_ms ?? 0"
          :can-control="isAuthorizedModerator"
          @reset="roomStore.resetTimer"
          @pause="roomStore.pauseTimer"
          @resume="roomStore.resumeTimer"
          @adjust="(ms: number) => roomStore.adjustTimer(ms)"
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
          :grouped-votes="groupedVoteCounts"
          :is-moderator="isModerator"
          @start-new-round="roomStore.startNewRound()"
        />
      </div>
    </div>

    <JoinOverlay v-if="showJoin" @join="handleJoin" @close="router.push('/')" />

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

    <UserSettingsModal
      v-if="showAccountSettings && user"
      @close="showAccountSettings = false"
    />

    <div v-if="renameTarget" class="mui-modal-overlay" @click.self="renameTarget = null" @keydown.esc="renameTarget = null" @keydown.enter.prevent="renameSaveBtn?.click()">
      <div class="mui-modal-paper relative">
        <button
          v-wave
          class="mui-icon-btn absolute"
          style="top: 8px; right: 8px;"
          :aria-label="$t('common.close')"
          @click="renameTarget = null"
        >
          <Icon class="mui-svg-icon" name="app:close" style="font-size: 1.5rem;" />
        </button>
        <h2 class="mui-h5 mb-4">{{ $t('room.renamePlayer') }}</h2>
        <input
          v-model="renameValue"
          class="mui-input"
          autofocus
        />
        <div class="flex justify-end mt-6">
          <button ref="renameSaveBtn" v-wave class="mui-btn" style="min-width: 120px;" @click="submitRename">{{ $t('common.save') }}</button>
        </div>
      </div>
    </div>

    <div v-if="showRenameRoom" class="mui-modal-overlay" @click.self="showRenameRoom = false" @keydown.esc="showRenameRoom = false" @keydown.enter.prevent="roomSaveBtn?.click()">
      <div class="mui-modal-paper relative">
        <button
          v-wave
          class="mui-icon-btn absolute"
          style="top: 8px; right: 8px;"
          :aria-label="$t('common.close')"
          @click="showRenameRoom = false"
        >
          <Icon class="mui-svg-icon" name="app:close" style="font-size: 1.5rem;" />
        </button>
        <h2 class="mui-h5 mb-4">{{ $t('room.renameTitle') }}</h2>
        <input
          v-model="roomNameInput"
          class="mui-input"
          :placeholder="$t('room.renamePlaceholder')"
          autofocus
        />
        <p v-if="roomNameError" class="text-[13px] mt-2" style="color: #d32f2f;">{{ roomNameError }}</p>
        <div v-else class="text-[13px] mt-2 flex flex-col gap-[2px] text-muted">
          <span v-if="roomNameInput.trim()">URL: {{ origin }}/{{ normalizeRoomSlug(roomNameInput) }}</span>
          <span>URL: {{ origin }}/{{ roomId }}</span>
        </div>
        <div class="flex justify-end mt-6">
          <button ref="roomSaveBtn" v-wave class="mui-btn" style="min-width: 120px;" @click="submitRenameRoom">{{ $t('common.save') }}</button>
        </div>
      </div>
    </div>

    <div v-if="kickTargetId" class="mui-modal-overlay" @click.self="kickTargetId = null" @keydown.esc="kickTargetId = null" @keydown.enter.prevent="kickConfirmBtn?.click()">
      <div class="mui-modal-paper relative">
        <button
          v-wave
          class="mui-icon-btn absolute"
          style="top: 8px; right: 8px;"
          :aria-label="$t('common.close')"
          @click="kickTargetId = null"
        >
          <Icon class="mui-svg-icon" name="app:close" style="font-size: 1.5rem;" />
        </button>
        <h2 class="mui-h5 mb-4">{{ $t('room.kickTitle') }}</h2>
        <p style="color: var(--text-body);">{{ $t('room.kickConfirm', { name: kickTargetName }) }}</p>
        <div class="flex justify-end mt-6">
          <button ref="kickConfirmBtn" v-wave class="mui-btn" style="min-width: 120px;" @click="confirmKick">{{ $t('room.kickButton') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>
