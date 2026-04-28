<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const roomId = route.params.slug as string

const { user, init: initAuth, signOut: authSignOut } = useAuth()
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

async function handleToggleModerator(id: string, value: boolean) {
  await toggleModerator(id, value)
}

async function handleRename(id: string) {
  renameTarget.value = id
  renameValue.value = players.value.find(p => p.id === id)?.name ?? ''
}

async function submitRename() {
  if (renameTarget.value && renameValue.value.trim()) {
    await rename(renameTarget.value, renameValue.value.trim())
    renameTarget.value = null
  }
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
      @sign-out="authSignOut"
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
          :active-cards="roomState.active_cards ?? []"
          :selected-vote="currentPlayer?.vote ?? null"
          :is-moderator="isModerator"
          @vote="handleVote"
          @reveal="revealEstimates"
        />
        <ResultsArea
          v-else-if="roomState?.phase === 'revealed'"
          :votes="voteCounts"
          :is-moderator="isModerator"
          @start-new-round="startNewRound"
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
          class="bg-transparent border border-gray-600 rounded px-4 py-3 text-sm outline-none focus:border-gray-400 text-white"
          @keyup.enter="submitRename"
        />
        <div class="flex gap-2 justify-end">
          <button class="px-4 py-2 text-sm text-gray-400 hover:text-white" @click="renameTarget = null">Cancel</button>
          <button class="bg-[#4a6572] px-4 py-2 text-sm rounded text-white" @click="submitRename">Save</button>
        </div>
      </div>
    </div>
  </div>
</template>
