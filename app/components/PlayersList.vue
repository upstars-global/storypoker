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

const onlineCount = computed(() => props.players.filter(p => p.is_online).length)
const totalCount = computed(() => props.players.length)

const openMenuId = ref<string | null>(null)
</script>

<template>
  <div class="mui-paper">
    <div class="mui-paper-header flex items-center justify-center gap-2">
      <span>{{ $t('players.title') }}</span>
      <span class="text-sm font-normal" style="color: #ffffff;">
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
        :open-menu-id="openMenuId"
        @rename="emit('rename', $event)"
        @toggle-moderator="(id, val) => emit('toggleModerator', id, val)"
        @leave="emit('leave', $event)"
        @kick="emit('kick', $event)"
        @menu-open="openMenuId = $event"
        @menu-close="openMenuId = null"
      />
    </div>
  </div>
</template>
