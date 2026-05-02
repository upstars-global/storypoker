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
  <div class="min-h-screen flex flex-col">
    <AppHeader
      :online-count="onlineCount"
      :is-moderator="isModerator"
      :player-name="currentPlayer?.name ?? ''"
      @open-sign-in="showAuth = 'signin'"
      @open-sign-up="showAuth = 'signup'"
      @open-card-deck="showCardDeck = true"
      @sign-out="authSignOut"
    />

    <div class="flex flex-1 flex-col md:flex-row gap-6 p-4 sm:p-6 md:p-8 max-w-[1400px] w-full mx-auto">
      <div class="w-full md:w-1/3 lg:w-1/4 flex-shrink-0 flex flex-col gap-6">
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

      <div class="flex-1 flex flex-col items-center justify-start">
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
  </div>
</template>
