<script setup lang="ts">
import AppIcon from '~/components/AppIcon.vue'
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogClose,
} from 'reka-ui'
import { useAuthStore } from '~/stores/auth'
import { useRoomStore } from '~/stores/room'
import { usePlayersStore } from '~/stores/players'
import { usePresenceStore } from '~/stores/presence'
import { useProfilesStore } from '~/stores/profiles'
import { useCountdown, type CountdownMode } from '~/composables/useCountdown'
import { getSupabase } from '~/lib/supabase-instance'
import { touchRecentRoom } from '~/utils/recentRooms'
import { DEFAULT_PRESET_ID, type DeckPresetId } from '~/utils/cardDecks'
import { normalizeRoomSlug, isValidRoomSlug } from '~/utils/roomId'
import { isQaPlayer, roleTagForShields, roleTagOrder } from '~/utils/shields'
import { shouldCelebrateGroupedVotes } from '~/utils/resultCelebration'
import AppHeader from '~/components/AppHeader.vue'
import AuthModal from '~/components/AuthModal.vue'
import UserSettingsModal from '~/components/UserSettingsModal.vue'
import ConfigureCardDeckModal from '~/components/ConfigureCardDeckModal.vue'
import PlayerEditModal from '~/components/PlayerEditModal.vue'
import PlayersList from '~/components/PlayersList.vue'
import Timer from '~/components/Timer.vue'
import CardsArea from '~/components/CardsArea.vue'
import ResultsArea from '~/components/ResultsArea.vue'
import JoinOverlay from '~/components/JoinOverlay.vue'

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

interface LastRoundSnapshot {
  votes: Record<string, number>
  groupedVotes: { general: Record<string, number>; qa: Record<string, number> } | null
  playerVotes: { id: string; name: string; vote: string }[]
  pollQuestion: string | null
  isVotingDeck: boolean
  activeCards: string[]
}

const currentPlayerId = ref<string | null>(null)
const notFound = ref(false)
const showJoin = ref(false)
const showAuth = ref<'signin' | 'signup' | null>(null)
const showCardDeck = ref(false)
const showAccountSettings = ref(false)
const editTargetId = ref<string | null>(null)
const editTargetPlayer = computed(() => visiblePlayers.value.find(p => p.id === editTargetId.value) ?? null)
const showRenameRoom = ref(false)
const roomNameInput = ref('')
const roomNameError = ref<string | null>(null)
const currentSlug = ref<string | null>(null)
const currentRoomName = ref<string | null>(null)
const origin = ref('')
const kickTargetId = ref<string | null>(null)
const kickTargetName = computed(() => visiblePlayers.value.find(p => p.id === kickTargetId.value)?.name ?? '')

const pendingSnapshot = ref<LastRoundSnapshot | null>(null)
const lastRound = ref<LastRoundSnapshot | null>(null)
const showLastRound = ref(false)

const { t } = useI18n()
const currentPlayer = computed(() => visiblePlayers.value.find(p => p.id === currentPlayerId.value) ?? null)
const isModerator = computed(() => currentPlayer.value?.is_moderator ?? false)
const isAuthorizedModerator = computed(() => isModerator.value && !!user.value)
const onlineCount = computed(() => visiblePlayers.value.filter(p => online.value.has(p.id)).length)

const lastRoundVoteMap = computed(() => {
  if (!showLastRound.value || !lastRound.value) return {}
  return Object.fromEntries(lastRound.value.playerVotes.map(pv => [pv.id, pv.vote]))
})

const playersForUi = computed(() =>
  visiblePlayers.value
    .map(p => ({
      ...p,
      is_online: online.value.has(p.id),
      vote: showLastRound.value ? (lastRoundVoteMap.value[p.id] ?? null) : playersStore.voteOf(p.id),
      votePending: pendingVotes.value[p.id] !== undefined,
    }))
    .sort((a, b) => {
      const oa = roleTagOrder(roleTagForShields(a.shields))
      const ob = roleTagOrder(roleTagForShields(b.shields))
      return oa - ob || a.name.localeCompare(b.name)
    })
)

const hasVotes = computed(() => playersForUi.value.some(p => p.vote !== null))

const canReset = computed(() => {
  if (showLastRound.value) return false
  const voted = visiblePlayers.value.filter(p => playersStore.voteOf(p.id) !== null).length
  return voted > 0 && voted < visiblePlayers.value.length
})

const isPollDeck = computed(() =>
  roomState.value?.deck_preset === 'voting' || roomState.value?.deck_preset === 'vote_question'
)

const isConsensus = computed(() => {
  if (isPollDeck.value) return false
  const grouped = groupedVoteCounts.value
  if (grouped) return shouldCelebrateGroupedVotes(grouped)
  const votes = playersForUi.value.map(p => p.vote).filter((v): v is string => v !== null)
  return votes.length >= 2 && votes.every(v => v === votes[0])
})

const { countdownTimerCounter, countdownTimerTotal, countdownActive, countdownRunning, startCountdown } = useCountdown()

function broadcastCountdownStart(mode: CountdownMode) {
  countdownChannel?.send({ type: 'broadcast', event: 'start', payload: { initiatorId: currentPlayerId.value, mode } })
}


const voteCounts = computed(() => {
  if (!roomState.value) return {}
  return visiblePlayers.value.reduce((acc, p) => {
    if (p.vote) acc[p.vote] = (acc[p.vote] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)
})

const groupedVoteCounts = computed(() => {
  if (!roomState.value) return null
  const general: Record<string, number> = {}
  const qa: Record<string, number> = {}
  let hasQa = false
  for (const p of visiblePlayers.value) {
    if (!p.vote) continue
    if (isQaPlayer(p.shields)) {
      qa[p.vote] = (qa[p.vote] ?? 0) + 1
      hasQa = true
    } else {
      general[p.vote] = (general[p.vote] ?? 0) + 1
    }
  }
  return hasQa ? { general, qa } : null
})

let playersChannel: any = null
let stateChannel: any = null
let roomChannel: any = null
let profilesChannel: any = null
let countdownChannel: any = null

onMounted(async () => {
  origin.value = window.location.origin
  await authStore.init()
  const resolved = await roomStore.resolveRoom(urlParam)
  if (!resolved) {
    notFound.value = true
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

watch(() => roomState.value?.phase, (phase, prev) => {
  if (phase === 'revealed') {
    playersStore.clearPendingVotes()
    pendingSnapshot.value = {
      votes: { ...voteCounts.value },
      groupedVotes: groupedVoteCounts.value
        ? { general: { ...groupedVoteCounts.value.general }, qa: { ...groupedVoteCounts.value.qa } }
        : null,
      playerVotes: visiblePlayers.value
        .filter(p => p.vote !== null)
        .map(p => ({ id: p.id, name: p.name, vote: p.vote as string })),
      pollQuestion: isPollDeck.value ? (roomState.value?.poll_question ?? null) : null,
      isVotingDeck: isPollDeck.value,
      activeCards: [...(roomState.value?.active_cards ?? [])],
    }
    showLastRound.value = false
  }
  if (phase === 'voting' && prev === 'revealed') {
    lastRound.value = pendingSnapshot.value
    showLastRound.value = false
  }
})

const playerUserIds = computed(() =>
  (visiblePlayers.value.map(p => p.user_id).filter(Boolean) as string[]).sort().join(',')
)

watch(playerUserIds, async (ids) => {
  if (ids) await profilesStore.fetchMany(ids.split(','))
})

onUnmounted(async () => {
  unsubscribe()
  await presenceStore.stop()
})

async function fetchInitialData() {
  const supabase = getSupabase()
  const [{ data: pData }, { data: sData }] = await Promise.all([
    supabase.from('players').select('*').eq('room_id', roomId).order('created_at'),
    supabase.from('room_state').select('*').eq('room_id', roomId).single(),
  ])
  playersStore.players = pData ?? []
  roomStore.roomState = sData ?? null
  const ids = (pData ?? []).map((p: any) => p.user_id).filter(Boolean) as string[]
  if (user.value?.id) ids.push(user.value.id)
  if (ids.length) await profilesStore.fetchMany(ids)
}

function subscribeRealtime() {
  const supabase = getSupabase()
  playersChannel = supabase
    .channel(`players:${roomId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${roomId}` },
      (payload) => playersStore.applyChange(payload as any))
    .subscribe()
  stateChannel = supabase
    .channel(`room_state:${roomId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'room_state', filter: `room_id=eq.${roomId}` },
      (payload) => roomStore.applyChange(payload as any))
    .subscribe()
  roomChannel = supabase
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
  profilesChannel = supabase
    .channel(`user_profiles:${roomId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'user_profiles' },
      (payload) => profilesStore.applyChange(payload as any))
    .subscribe()
  countdownChannel = supabase
    .channel(`countdown:${roomId}`, { config: { broadcast: { self: true } } })
    .on('broadcast', { event: 'start' }, ({ payload }: any) => {
      const isInitiator = payload?.initiatorId === currentPlayerId.value
      const mode: CountdownMode = payload?.mode === 'wet' || payload?.mode === 'silent' ? payload.mode : 'dry'
      startCountdown(
        mode,
        isInitiator ? () => roomStore.reveal() : undefined,
        () => isConsensus.value,
      )
    })
    .subscribe()
}

function unsubscribe() {
  playersChannel?.unsubscribe()
  stateChannel?.unsubscribe()
  roomChannel?.unsubscribe()
  profilesChannel?.unsubscribe()
  countdownChannel?.unsubscribe()
}

function getStoredSession(): { playerId: string; playerName: string } | null {
  const raw = localStorage.getItem(`storypoker_session_${roomId}`)
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

async function handleJoin(payload: { name: string; shields: string[] }) {
  const player = await playersStore.join(payload.name, user.value?.id ?? null, payload.shields)
  touchRecentRoom(roomId, player.id, player.name)
  currentPlayerId.value = player.id
  showJoin.value = false
  await presenceStore.start(roomId, player.id)
}

async function handleVote(card: string) {
  if (!currentPlayerId.value) return
  if (isPollDeck.value && !roomState.value?.poll_question) return
  const next = playersStore.voteOf(currentPlayerId.value) === card ? null : card
  try {
    await playersStore.castVote(currentPlayerId.value, next)
  } catch {
  }
}

async function handleToggleModerator(id: string, value: boolean) {
  await playersStore.toggleModerator(id, value)
}

function handleEdit(id: string) {
  requestAnimationFrame(() => { editTargetId.value = id })
}

async function handleSaveEdit(payload: { name: string; shields: string[] }) {
  const target = editTargetPlayer.value
  if (!target) return
  try {
    if (payload.name !== target.name) {
      await playersStore.rename(target.id, payload.name)
    }
    await playersStore.setShields(target.id, payload.shields)
  } catch {
  }
  editTargetId.value = null
}

async function handleLeave(id: string) {
  await playersStore.leave(id)
  await presenceStore.stop()
  router.push('/')
}

function handleKick(id: string) {
  requestAnimationFrame(() => { kickTargetId.value = id })
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

async function handleStartVoteQuestion(question: string, answers: string[]) {
  await Promise.all([
    roomStore.setPollQuestion(question),
    roomStore.saveCardDeck(answers),
  ])
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
  <div v-if="notFound" class="min-h-screen flex items-center justify-center p-4 bg-app">
    <div class="mui-modal-paper text-center max-w-md w-full">
      <h2 class="text-mui-h2 font-bold text-primary">{{ $t('room.notFoundTitle') }}</h2>
      <p class="text-mui-body text-body mt-3">
        {{ $t('room.notFoundDescription', { id: urlParam }) }}
      </p>
      <div class="flex justify-center mt-6">
        <RouterLink to="/" class="mui-btn mui-btn-md inline-flex items-center justify-center">
          {{ $t('room.notFoundBackHome') }}
        </RouterLink>
      </div>
    </div>
  </div>
  <div v-else class="min-h-screen flex flex-col">
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
      :countdown-active="countdownActive"
      :countdown-counter="countdownTimerCounter"
      :countdown-total="countdownTimerTotal"
    />

    <div class="flex flex-1 flex-col md:flex-row gap-6 p-4 sm:p-6 md:p-8 max-w-[1400px] w-full mx-auto">
      <div class="w-full md:w-1/3 lg:w-1/4 flex-shrink-0 flex flex-col gap-6">
        <PlayersList
          :players="playersForUi"
          :phase="showLastRound ? 'revealed' : (roomState?.phase ?? 'voting')"
          :current-player-id="currentPlayerId"
          :current-user-is-authorized-moderator="isAuthorizedModerator"
          :truncate-votes="roomState?.deck_preset === 'vote_question'"
          @edit="handleEdit"
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
          :can-control="isModerator"
          @reset="roomStore.resetTimer"
          @pause="roomStore.pauseTimer"
          @resume="roomStore.resumeTimer"
          @adjust="(ms: number) => roomStore.adjustTimer(ms)"
        />
      </div>

      <div class="flex-1 flex flex-col items-center justify-start">
        <ResultsArea
          v-if="roomState?.phase === 'voting' && showLastRound && lastRound"
          :votes="lastRound.votes"
          :grouped-votes="lastRound.groupedVotes"
          :is-moderator="false"
          :poll-question="lastRound.pollQuestion"
          :disable-celebration="true"
          :active-cards="lastRound.isVotingDeck ? lastRound.activeCards : undefined"
        />
        <ResultsArea
          v-if="roomState?.phase === 'revealed'"
          :votes="voteCounts"
          :grouped-votes="groupedVoteCounts"
          :is-moderator="isModerator"
          :poll-question="isPollDeck ? (roomState.poll_question ?? null) : null"
          :disable-celebration="isPollDeck"
          :active-cards="isPollDeck ? (roomState.active_cards ?? undefined) : undefined"
          @start-new-round="roomStore.startNewRound()"
        />
        <CardsArea
          v-if="roomState?.phase === 'voting'"
          :active-cards="roomState.active_cards ?? []"
          :selected-vote="currentPlayer ? playersStore.voteOf(currentPlayer.id) : null"
          :is-moderator="isModerator"
          :has-votes="hasVotes"
          :can-reset="canReset"
          :countdown-counter="countdownTimerCounter"
          :countdown-running="countdownRunning"
          :poll-mode="roomState.deck_preset === 'voting'"
          :vote-question-mode="roomState.deck_preset === 'vote_question'"
          :poll-question="roomState.poll_question ?? null"
          :has-last-round="!!lastRound"
          :show-last-round="showLastRound"
          @vote="handleVote"
          @reveal="roomStore.reveal()"
          @reset="roomStore.resetVotes()"
          @start-countdown="broadcastCountdownStart"
          @set-poll-question="(q: string) => roomStore.setPollQuestion(q)"
          @start-vote-question="handleStartVoteQuestion"
          @toggle-last-round="showLastRound = !showLastRound"
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

    <PlayerEditModal
      v-if="editTargetPlayer"
      :name="editTargetPlayer.name"
      :shields="editTargetPlayer.shields ?? []"
      @close="editTargetId = null"
      @save="handleSaveEdit"
    />

    <UserSettingsModal
      v-if="showAccountSettings && user"
      @close="showAccountSettings = false"
    />

    <DialogRoot v-if="showRenameRoom" default-open @update:open="(open) => { if (!open) showRenameRoom = false }">
      <DialogPortal>
        <DialogOverlay class="mui-modal-overlay">
          <DialogContent class="mui-modal-paper" @pointerdown.stop>
            <DialogTitle as="h2" class="mui-h5 mb-4">{{ $t('room.renameTitle') }}</DialogTitle>
            <input
              v-model="roomNameInput"
              class="mui-input"
              :placeholder="$t('room.renamePlaceholder')"
              @keyup.enter="submitRenameRoom"
            />
            <p v-if="roomNameError" class="text-mui-caption mt-2 text-danger">{{ roomNameError }}</p>
            <div v-else class="text-mui-caption mt-2 flex flex-col gap-[2px] text-muted">
              <span v-if="roomNameInput.trim()">URL: {{ origin }}/{{ normalizeRoomSlug(roomNameInput) }}</span>
              <span>URL: {{ origin }}/{{ roomId }}</span>
            </div>
            <div class="flex justify-end mt-6">
              <button v-wave class="mui-btn" style="min-width: 120px;" @click="submitRenameRoom">{{ $t('common.save') }}</button>
            </div>
            <DialogClose
              v-wave
              class="mui-icon-btn absolute"
              style="top: 8px; right: 8px;"
              :aria-label="$t('common.close')"
            >
              <AppIcon class="mui-svg-icon" icon="ic:baseline-close" style="font-size: 1.5rem;" />
            </DialogClose>
          </DialogContent>
        </DialogOverlay>
      </DialogPortal>
    </DialogRoot>

    <DialogRoot v-if="kickTargetId" default-open @update:open="(open) => { if (!open) kickTargetId = null }">
      <DialogPortal>
        <DialogOverlay class="mui-modal-overlay">
          <DialogContent class="mui-modal-paper" @pointerdown.stop>
            <DialogTitle as="h2" class="mui-h5 mb-4">{{ $t('room.kickTitle') }}</DialogTitle>
            <p class="text-body">{{ $t('room.kickConfirm', { name: kickTargetName }) }}</p>
            <div class="flex justify-end mt-6">
              <button v-wave class="mui-btn" style="min-width: 120px;" @click="confirmKick">{{ $t('room.kickButton') }}</button>
            </div>
            <DialogClose
              v-wave
              class="mui-icon-btn absolute"
              style="top: 8px; right: 8px;"
              :aria-label="$t('common.close')"
            >
              <AppIcon class="mui-svg-icon" icon="ic:baseline-close" style="font-size: 1.5rem;" />
            </DialogClose>
          </DialogContent>
        </DialogOverlay>
      </DialogPortal>
    </DialogRoot>
  </div>
</template>
