<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { ref, computed } from 'vue'
import { useProfilesStore } from '~/stores/profiles'
import { useDylanAvatar } from '~/composables/useDylanAvatar'

const props = defineProps<{
  player: {
    id: string
    name: string
    is_moderator: boolean
    vote: string | null
    is_online: boolean
    user_id: string | null
    votePending: boolean
  }
  phase: 'voting' | 'revealed'
  currentPlayerId: string | null
  currentUserIsAuthorizedModerator: boolean
  openMenuId: string | null
}>()

const emit = defineEmits<{
  rename: [id: string]
  toggleModerator: [id: string, value: boolean]
  leave: [id: string]
  kick: [id: string]
  menuOpen: [id: string]
  menuClose: []
}>()

const profilesStore = useProfilesStore()
const { avatarDataUri } = useDylanAvatar()

const isOwn = computed(() => props.player.id === props.currentPlayerId)
const showMenu = computed(() => props.openMenuId === props.player.id)
const playerAvatar = computed(() => {
  const profile = props.player.user_id ? profilesStore.get(props.player.user_id) : null
  if (profile) return avatarDataUri(profile.avatar_seed, !props.player.is_online, profile.avatar_style)
  return avatarDataUri(props.player.name, !props.player.is_online, 'bottts')
})
const triggerEl = ref<HTMLButtonElement | null>(null)
const menuStyle = ref<Record<string, string>>({})

function toggleMenu() {
  if (showMenu.value) {
    emit('menuClose')
  } else {
    if (triggerEl.value) {
      const rect = triggerEl.value.getBoundingClientRect()
      menuStyle.value = {
        position: 'fixed',
        top: `${rect.bottom + 4}px`,
        right: `${window.innerWidth - rect.right}px`,
        minWidth: '200px',
      }
    }
    emit('menuOpen', props.player.id)
  }
}

function close() { emit('menuClose') }
</script>

<template>
  <div
    data-testid="player-row"
    :data-player-name="player.name"
    :data-voted="String(player.vote !== null)"
    :data-vote-pending="String(player.votePending)"
    class="grid items-center gap-2 rounded relative"
    style="grid-template-columns: 32px 1fr auto 36px;"
  >
    <img
      :src="playerAvatar"
      :alt="player.name"
      class="rounded-full"
      style="width: 28px; height: 28px;"
    />
    <div class="flex items-center gap-1.5 min-w-0">
      <span
        class="truncate text-base"
        :style="{ color: player.is_online ? 'var(--text-primary)' : 'var(--text-muted)' }"
      >
        {{ player.name }}
      </span>
      <span
        v-if="player.is_moderator"
        class="inline-flex flex-none mui-tooltip"
        :data-tooltip="$t('players.moderatorOf', { name: player.name })"
      >
        <Icon
          class="mui-svg-icon"
          icon="app:moderator"
          style="font-size: 1.5rem; color: var(--icon-player-color);"
          :aria-label="$t('players.moderatorOf', { name: player.name })"
        />
      </span>
    </div>

    <template v-if="player.is_online">
      <template v-if="phase === 'voting'">
        <span
          v-if="player.vote !== null"
          class="inline-flex mui-tooltip"
          :data-tooltip="$t('players.estimateGiven')"
        >
          <Icon
            class="mui-svg-icon"
            icon="ic:baseline-check-circle"
            style="font-size: 1.5rem; color: var(--icon-player-color);"
            :aria-label="$t('players.estimateGiven')"
          />
        </span>
        <span
          v-else
          class="inline-flex mui-tooltip"
          :data-tooltip="$t('players.playerDeciding')"
        >
          <Icon
            class="mui-svg-icon"
            icon="app:deciding"
            style="font-size: 1.5rem; color: var(--icon-player-color);"
            :aria-label="$t('players.playerDeciding')"
          />
        </span>
      </template>
      <template v-else>
        <span
          v-if="player.vote !== null"
          class="text-base font-medium text-center"
          style="width: 24px; color: var(--text-primary);"
        >{{ player.vote }}</span>
        <span
          v-else
          class="inline-flex mui-tooltip"
          :data-tooltip="$t('players.noVote')"
        >
          <Icon
            class="mui-svg-icon"
            icon="ic:baseline-cancel"
            style="font-size: 1.5rem; color: var(--icon-player-color);"
            :aria-label="$t('players.noVote')"
          />
        </span>
      </template>
    </template>
    <template v-else>
      <span
        v-if="phase === 'revealed' && player.vote !== null"
        class="text-base font-medium text-center text-disabled dark:text-muted"
        style="width: 24px;"
      >{{ player.vote }}</span>
      <span
        v-else-if="phase === 'voting' && player.vote !== null"
        class="inline-flex mui-tooltip"
        :data-tooltip="$t('players.estimateGiven')"
      >
        <Icon
          class="mui-svg-icon text-black/[0.26] dark:text-white/30"
          icon="ic:baseline-check-circle"
          style="font-size: 1.5rem;"
          :aria-label="$t('players.estimateGiven')"
        />
      </span>
      <span
        v-else
        class="inline-flex mui-tooltip"
        :data-tooltip="$t('players.inactive')"
      >
        <Icon
          class="mui-svg-icon text-black/[0.26] dark:text-white/30"
          icon="app:offline"
          style="font-size: 1.5rem;"
          :aria-label="$t('players.inactive')"
        />
      </span>
    </template>

    <div class="flex items-center justify-center" style="width: 36px; height: 36px;">
      <template v-if="isOwn || currentUserIsAuthorizedModerator">
        <button
          ref="triggerEl"
          v-wave
          class="mui-icon-btn"
          style="padding: 4px;"
          @click.stop="toggleMenu"
        >
          <Icon class="mui-svg-icon text-muted dark:text-inverse" icon="ic:baseline-more-vert" style="font-size: 1.5rem;" />
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
                  v-wave
                  class="mui-menu-item"
                  role="menuitemcheckbox"
                  :aria-checked="player.is_moderator"
                  @click="emit('toggleModerator', player.id, !player.is_moderator); close()"
                >
                  <Icon class="mui-menu-icon" icon="app:moderator" />
                  <span class="flex-1">{{ $t('players.isModerator') }}</span>
                  <span class="mui-switch">
                    <input type="checkbox" :checked="player.is_moderator" tabindex="-1" readonly />
                    <span class="track" />
                    <span class="thumb" />
                  </span>
                </button>
              </li>
              <li>
                <button v-wave class="mui-menu-item" @click="emit('rename', player.id); close()">
                  <Icon class="mui-menu-icon" icon="ic:baseline-edit" /> {{ $t('players.renamePlayer') }}
                </button>
              </li>
              <li>
                <button v-wave class="mui-menu-item" @click="emit('leave', player.id); close()">
                  <Icon class="mui-menu-icon" icon="app:leave-room" /> {{ $t('players.leaveRoom') }}
                </button>
              </li>
            </template>
            <template v-else-if="currentUserIsAuthorizedModerator">
              <li>
                <button v-wave class="mui-menu-item" @click="emit('rename', player.id); close()">
                  <Icon class="mui-menu-icon" icon="ic:baseline-edit" /> {{ $t('players.renamePlayer') }}
                </button>
              </li>
              <li>
                <button v-wave class="mui-menu-item" @click="emit('kick', player.id); close()">
                  <Icon class="mui-menu-icon" icon="ic:baseline-person-remove" /> {{ $t('players.kickPlayer') }}
                </button>
              </li>
            </template>
          </ul>
        </Teleport>
      </template>
    </div>
  </div>
</template>
