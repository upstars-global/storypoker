<script setup lang="ts">
import { computed } from 'vue'
import PlayerRow from '~/components/PlayerRow.vue'

const props = defineProps<{
  players: Array<{
    id: string
    name: string
    is_moderator: boolean
    vote: string | null
    is_online: boolean
    user_id: string | null
    shields: string[]
    votePending: boolean
  }>
  phase: 'voting' | 'revealed'
  currentPlayerId: string | null
  currentUserIsAuthorizedModerator: boolean
}>()

const emit = defineEmits<{
  rename: [id: string]
  toggleModerator: [id: string, value: boolean]
  editShields: [id: string]
  leave: [id: string]
  kick: [id: string]
}>()

const onlineCount = computed(() => props.players.filter(p => p.is_online).length)
const totalCount = computed(() => props.players.length)
</script>

<template>
  <div
    data-testid="players-list"
    class="mui-paper"
  >
    <div class="mui-paper-header flex items-center justify-center gap-2">
      <span>{{ $t('players.title') }}</span>
      <span class="text-sm font-normal">
        {{ onlineCount }} / {{ totalCount }}
      </span>
    </div>
    <div class="pl-4 pr-2 py-2 flex flex-col">
      <PlayerRow
        v-for="player in players"
        :key="player.id"
        :player="player"
        :phase="phase"
        :current-player-id="currentPlayerId"
        :current-user-is-authorized-moderator="currentUserIsAuthorizedModerator"
        @rename="emit('rename', $event)"
        @toggle-moderator="(id: string, val: boolean) => emit('toggleModerator', id, val)"
        @edit-shields="emit('editShields', $event)"
        @leave="emit('leave', $event)"
        @kick="emit('kick', $event)"
      />
    </div>
  </div>
</template>
