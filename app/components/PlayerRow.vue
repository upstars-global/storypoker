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
  <div
    class="grid items-center gap-2 px-2 py-2 rounded relative"
    style="grid-template-columns: 32px 1fr auto auto auto;"
  >
    <img
      :src="avatarDataUri(player.name, !player.is_online)"
      :alt="player.name"
      class="rounded-full"
      style="width: 26px; height: 26px;"
    />
    <span
      class="truncate text-base"
      :style="{ color: player.is_online ? 'var(--text-primary)' : 'var(--text-muted)' }"
    >
      {{ player.name }}
    </span>
    <IconModerator
      v-if="player.is_moderator"
      style="font-size: 1.25rem; color: var(--text-primary);"
      aria-label="moderator"
    />
    <span v-else />

    <template v-if="player.is_online">
      <template v-if="phase === 'voting'">
        <IconCheckCircle
          v-if="player.vote !== null"
          style="font-size: 1.25rem; color: var(--text-primary);"
          aria-label="estimate given"
        />
        <IconDeciding
          v-else
          style="font-size: 1.25rem; color: var(--text-disabled);"
          aria-label="player deciding"
        />
      </template>
      <template v-else>
        <span
          v-if="player.vote !== null"
          class="text-base font-medium"
          style="color: var(--text-primary);"
        >{{ player.vote }}</span>
        <IconCancel
          v-else
          style="font-size: 1.25rem; color: var(--text-disabled);"
        />
      </template>
    </template>
    <IconOffline
      v-else
      style="font-size: 1.25rem; color: var(--text-disabled);"
      aria-label="inactive"
    />

    <div v-if="isOwn || currentUserIsAuthorizedModerator" class="relative">
      <button
        class="mui-icon-btn"
        style="padding: 4px;"
        @click.stop="showMenu = !showMenu"
      >
        <IconMoreVert style="font-size: 1.125rem;" />
      </button>
      <ul
        v-if="showMenu"
        v-click-outside="close"
        class="mui-menu absolute right-0 top-8 z-20"
      >
        <template v-if="isOwn">
          <li>
            <button
              class="mui-menu-item"
              role="menuitemcheckbox"
              :aria-checked="String(player.is_moderator)"
              @click="emit('toggleModerator', player.id, !player.is_moderator); close()"
            >
              <IconModerator class="mui-menu-icon" />
              <span class="flex-1">Is Moderator</span>
              <span class="mui-switch">
                <input type="checkbox" :checked="player.is_moderator" tabindex="-1" readonly />
                <span class="track" />
                <span class="thumb" />
              </span>
            </button>
          </li>
          <li>
            <button class="mui-menu-item" @click="emit('rename', player.id); close()">
              <IconEdit class="mui-menu-icon" /> Rename Player
            </button>
          </li>
          <li>
            <button class="mui-menu-item" @click="emit('leave', player.id); close()">
              <IconLeaveRoom class="mui-menu-icon" /> Leave Room
            </button>
          </li>
        </template>
        <template v-else-if="currentUserIsAuthorizedModerator">
          <li>
            <button class="mui-menu-item is-danger" @click="emit('kick', player.id); close()">
              <IconPersonRemove class="mui-menu-icon" /> Kick Player
            </button>
          </li>
        </template>
      </ul>
    </div>
    <span v-else />
  </div>
</template>
