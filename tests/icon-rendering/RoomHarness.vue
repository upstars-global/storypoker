<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import AppHeader from '~/components/AppHeader.vue'
import PlayersList from '~/components/PlayersList.vue'
import Timer from '~/components/Timer.vue'
import CardsArea from '~/components/CardsArea.vue'
import JoinOverlay from '~/components/JoinOverlay.vue'
import AppIcon from '~/components/AppIcon.vue'
import { DECK_PRESETS, DEFAULT_PRESET_ID } from '~/utils/cardDecks'
import { inputNames } from '~/utils/iconManifest'
import {
  type HarnessRole,
  ROOM_NAME,
  ROOM_STARTED_AT,
  currentPlayerId,
  isModeratorRole,
  makePlayers,
} from './fixture'

const params = new URLSearchParams(window.location.search)
const role = (params.get('role') ?? 'guest') as HarnessRole
const view = params.get('view') === 'catalog' ? 'catalog' : 'room'

const players = ref(makePlayers())
const ready = ref(false)
const countdownCounter = ref(0)
const countdownRunning = ref(false)
const sideWidget = ref<'timer' | 'slot'>('timer')
const showJoin = ref(false)

const isModerator = computed(() => isModeratorRole(role))
const activeCards = DECK_PRESETS.find(preset => preset.id === DEFAULT_PRESET_ID)!.defaultActive

const playersForUi = computed(() => players.value.map(player => ({
  ...player,
  is_online: false,
  votePending: false,
})))

onMounted(async () => {
  await nextTick()
  showJoin.value = role === 'guest'
  await nextTick()
  ready.value = true
})
</script>

<template>
  <div class="min-h-screen bg-app text-body">
    <div
      v-if="ready"
      data-testid="icon-harness-ready"
      class="sr-only"
    >
      ready
    </div>

    <template v-if="view === 'catalog'">
      <div class="grid grid-cols-6 gap-4 p-8">
        <div
          v-for="name in inputNames"
          :key="name"
          :data-icon-name="name"
          class="flex flex-col items-center gap-2 text-xs"
        >
          <AppIcon
            :icon="name"
            style="font-size: 2rem;"
          />
          <span>{{ name }}</span>
        </div>
      </div>
    </template>

    <template v-else>
      <AppHeader
        :online-count="0"
        :is-moderator="isModerator"
        :player-name="role === 'guest' ? '' : 'Player 01'"
        :player-user-id="null"
        :room-name="ROOM_NAME"
        :countdown-active="false"
        :countdown-counter="0"
        :countdown-total="0"
      />

      <main
        id="main"
        tabindex="-1"
        class="flex flex-1 flex-col md:flex-row gap-6 p-4 sm:p-6 md:p-8 max-w-[1400px] w-full mx-auto outline-none"
      >
        <div class="w-full md:w-1/3 lg:w-1/4 flex-shrink-0 flex flex-col gap-6">
          <PlayersList
            :players="playersForUi"
            phase="voting"
            :current-player-id="currentPlayerId(role)"
            :current-user-is-moderator="isModerator"
            :current-user-is-authorized-moderator="role === 'authorized-moderator'"
            :truncate-votes="false"
            :slot-winner-id="null"
          />
          <Timer
            v-if="sideWidget === 'timer'"
            :round-started-at="ROOM_STARTED_AT"
            phase="voting"
            :paused-at="null"
            :paused-elapsed-ms="0"
            :can-control="isModerator"
            @switch-widget="sideWidget = 'slot'"
          />
        </div>

        <div class="flex-1 flex flex-col items-center justify-start">
          <CardsArea
            :active-cards="activeCards"
            :selected-vote="null"
            :is-moderator="isModerator"
            :has-votes="false"
            :can-reset="false"
            :countdown-counter="countdownCounter"
            :countdown-running="countdownRunning"
            :poll-mode="false"
            :vote-question-mode="false"
            :poll-question="null"
            :has-last-round="false"
          />
        </div>
      </main>

      <JoinOverlay
        v-if="showJoin"
        :room-name="ROOM_NAME"
        @close="showJoin = false"
      />
    </template>
  </div>
</template>
