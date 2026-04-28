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
