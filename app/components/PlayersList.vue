<script setup lang="ts">
defineProps<{
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
      @toggle-moderator="(id, val) => emit('toggleModerator', id, val)"
      @leave="emit('leave', $event)"
      @kick="emit('kick', $event)"
    />
  </div>
</template>
