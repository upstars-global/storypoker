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
const { isLight } = useTheme()

const isOwn = computed(() => props.player.id === props.currentPlayerId)
const showMenu = ref(false)
const triggerEl = ref<HTMLButtonElement | null>(null)
const menuStyle = ref<Record<string, string>>({})

function toggleMenu() {
  showMenu.value = !showMenu.value
  if (showMenu.value && triggerEl.value) {
    const rect = triggerEl.value.getBoundingClientRect()
    menuStyle.value = {
      position: 'fixed',
      top: `${rect.top}px`,
      left: `${rect.left - 200 - 8}px`,
      minWidth: '200px',
    }
  }
}

function close() { showMenu.value = false }
</script>

<template>
  <div
    class="grid items-center gap-2 px-2 py-2 rounded relative"
    style="grid-template-columns: 32px 1fr auto auto;"
  >
    <img
      :src="avatarDataUri(player.name, !player.is_online)"
      :alt="player.name"
      class="rounded-full"
      style="width: 26px; height: 26px;"
    />
    <div class="flex items-center gap-1.5 min-w-0">
      <span
        class="truncate text-base"
        :style="{ color: player.is_online ? 'var(--text-primary)' : 'var(--text-muted)' }"
      >
        {{ player.name }}
      </span>
      <IconModerator
        v-if="player.is_moderator"
        class="flex-none"
        style="font-size: 1.5rem; color: var(--icon-player-color);"
        aria-label="moderator"
      />
    </div>

    <template v-if="player.is_online">
      <template v-if="phase === 'voting'">
        <IconCheckCircle
          v-if="player.vote !== null"
          style="font-size: 1.5rem; color: var(--icon-player-color);"
          aria-label="estimate given"
        />
        <IconDeciding
          v-else
          style="font-size: 1.5rem; color: var(--icon-player-color);"
          aria-label="player deciding"
        />
      </template>
      <template v-else>
        <span
          v-if="player.vote !== null"
          class="text-base font-medium text-center"
          style="width: 24px; color: var(--text-primary);"
        >{{ player.vote }}</span>
        <IconCancel
          v-else
          :style="{ fontSize: '1.5rem', color: isLight ? 'rgb(69, 90, 100)' : 'rgb(250, 250, 250)' }"
        />
      </template>
    </template>
    <template v-else>
      <span
        v-if="phase === 'revealed' && player.vote !== null"
        class="text-base font-medium text-center"
        :style="{ width: '24px', color: isLight ? 'rgba(0, 0, 0, 0.38)' : 'rgb(123, 123, 123)' }"
      >{{ player.vote }}</span>
      <IconCheckCircle
        v-else-if="phase === 'voting' && player.vote !== null"
        :style="{ fontSize: '1.5rem', color: isLight ? 'rgba(0, 0, 0, 0.26)' : 'rgba(255, 255, 255, 0.3)' }"
        aria-label="estimate given"
      />
      <IconOffline
        v-else
        :style="{ fontSize: '1.5rem', color: isLight ? 'rgba(0, 0, 0, 0.26)' : 'rgba(255, 255, 255, 0.3)' }"
        aria-label="inactive"
      />
    </template>

    <template v-if="isOwn || currentUserIsAuthorizedModerator">
      <div class="relative">
        <button
          ref="triggerEl"
          class="mui-icon-btn"
          style="padding: 4px;"
          @click.stop="toggleMenu"
        >
          <IconMoreVert :style="{ fontSize: '1.5rem', color: isLight ? 'rgba(0, 0, 0, 0.54)' : 'rgb(255, 255, 255)' }" />
        </button>
        <Teleport to="body">
          <ul
            v-if="showMenu"
            v-click-outside="close"
            class="mui-menu z-50"
            :style="menuStyle"
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
        </Teleport>
      </div>
    </template>
    <span v-else style="width: 32px;" />
  </div>
</template>
