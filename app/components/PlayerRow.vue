<script setup lang="ts">
import AppIcon from '~/components/AppIcon.vue'
import { computed } from 'vue'
import {
  DropdownMenuRoot,
  DropdownMenuTrigger,
  DropdownMenuPortal,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  TooltipRoot,
  TooltipTrigger,
  TooltipPortal,
  TooltipContent,
} from 'reka-ui'
import { useProfilesStore } from '~/stores/profiles'
import { useDylanAvatar } from '~/composables/useDylanAvatar'
import { roleTagForShields } from '~/utils/shields'
import { useCardLabel } from '~/composables/useCardLabel'

const cardLabel = useCardLabel()

function voteLabel(vote: string) {
  const label = cardLabel(vote)
  return props.truncateVotes && label.length > 4 ? label.slice(0, 4) : label
}

const props = defineProps<{
  player: {
    id: string
    name: string
    is_moderator: boolean
    vote: string | null
    is_online: boolean
    user_id: string | null
    shields: string[]
    votePending: boolean
  }
  phase: 'voting' | 'revealed'
  currentPlayerId: string | null
  currentUserIsAuthorizedModerator: boolean
  truncateVotes?: boolean
}>()

const emit = defineEmits<{
  edit: [id: string]
  toggleModerator: [id: string, value: boolean]
  leave: [id: string]
  kick: [id: string]
}>()

const profilesStore = useProfilesStore()
const { avatarDataUri } = useDylanAvatar()

const isOwn = computed(() => props.player.id === props.currentPlayerId)
const roleTag = computed(() => roleTagForShields(props.player.shields))
const playerAvatar = computed(() => {
  const profile = props.player.user_id ? profilesStore.get(props.player.user_id) : null
  if (profile) return avatarDataUri(profile.avatar_seed, !props.player.is_online, profile.avatar_style)
  return avatarDataUri(props.player.name, !props.player.is_online, 'bottts')
})
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
    <TooltipRoot>
      <TooltipTrigger as-child>
        <img
          :src="playerAvatar"
          :alt="player.name"
          class="rounded-full"
          style="width: 28px; height: 28px;"
        >
      </TooltipTrigger>
      <TooltipPortal>
        <TooltipContent
          class="mui-tooltip-content"
          side="top"
          :side-offset="6"
          style="max-width: 240px; white-space: normal; text-align: center;"
        >
          {{ $t('players.avatarAuthHint') }}
        </TooltipContent>
      </TooltipPortal>
    </TooltipRoot>
    <div class="flex items-center gap-1.5 min-w-0">
      <TooltipRoot v-if="roleTag">
        <TooltipTrigger as-child>
          <span class="flex-none mui-role-tag">{{ roleTag }}</span>
        </TooltipTrigger>
        <TooltipPortal>
          <TooltipContent class="mui-tooltip-content" side="top" :side-offset="6">
            {{ $t(`players.roleNames.${roleTag}`, roleTag) }}
          </TooltipContent>
        </TooltipPortal>
      </TooltipRoot>
      <span
        class="truncate text-base"
        :style="{ color: player.is_online ? 'var(--text-primary)' : 'var(--text-muted)' }"
      >
        {{ player.name }}
      </span>
      <TooltipRoot v-if="player.is_moderator">
        <TooltipTrigger as-child>
          <span class="inline-flex flex-none">
            <AppIcon
              class="mui-svg-icon"
              icon="app:moderator"
              style="font-size: 1.5rem; color: var(--icon-player-color);"
              :aria-label="$t('players.moderator')"
            />
          </span>
        </TooltipTrigger>
        <TooltipPortal>
          <TooltipContent class="mui-tooltip-content" side="top" :side-offset="6">
            {{ $t('players.moderator') }}
          </TooltipContent>
        </TooltipPortal>
      </TooltipRoot>
    </div>

    <template v-if="player.is_online">
      <template v-if="phase === 'voting'">
        <TooltipRoot v-if="player.vote !== null">
          <TooltipTrigger as-child>
            <span class="inline-flex">
              <AppIcon
                class="mui-svg-icon"
                icon="ic:baseline-check-circle"
                style="font-size: 1.5rem; color: var(--icon-player-color);"
                :aria-label="$t('players.estimateGiven')"
              />
            </span>
          </TooltipTrigger>
          <TooltipPortal>
            <TooltipContent class="mui-tooltip-content" side="top" :side-offset="6">
              {{ $t('players.estimateGiven') }}
            </TooltipContent>
          </TooltipPortal>
        </TooltipRoot>
        <TooltipRoot v-else>
          <TooltipTrigger as-child>
            <span class="inline-flex">
              <AppIcon
                class="mui-svg-icon"
                icon="app:deciding"
                style="font-size: 1.5rem; color: var(--icon-player-color);"
                :aria-label="$t('players.playerDeciding')"
              />
            </span>
          </TooltipTrigger>
          <TooltipPortal>
            <TooltipContent class="mui-tooltip-content" side="top" :side-offset="6">
              {{ $t('players.playerDeciding') }}
            </TooltipContent>
          </TooltipPortal>
        </TooltipRoot>
      </template>
      <template v-else>
        <span
          v-if="player.vote !== null"
          class="text-base font-medium text-center"
          style="width: 24px; color: var(--text-primary);"
        >{{ voteLabel(player.vote!) }}</span>
        <TooltipRoot v-else>
          <TooltipTrigger as-child>
            <span class="inline-flex">
              <AppIcon
                class="mui-svg-icon"
                icon="ic:baseline-cancel"
                style="font-size: 1.5rem; color: var(--icon-player-color);"
                :aria-label="$t('players.noVote')"
              />
            </span>
          </TooltipTrigger>
          <TooltipPortal>
            <TooltipContent class="mui-tooltip-content" side="top" :side-offset="6">
              {{ $t('players.noVote') }}
            </TooltipContent>
          </TooltipPortal>
        </TooltipRoot>
      </template>
    </template>
    <template v-else>
      <span
        v-if="phase === 'revealed' && player.vote !== null"
        class="text-base font-medium text-center"
        style="width: 24px; color: var(--text-primary);"
      >{{ voteLabel(player.vote!) }}</span>
      <TooltipRoot v-else-if="phase === 'voting' && player.vote !== null">
        <TooltipTrigger as-child>
          <span class="inline-flex">
            <AppIcon
              class="mui-svg-icon"
              icon="ic:baseline-check-circle"
              style="font-size: 1.5rem; color: var(--icon-player-color);"
              :aria-label="$t('players.estimateGiven')"
            />
          </span>
        </TooltipTrigger>
        <TooltipPortal>
          <TooltipContent class="mui-tooltip-content" side="top" :side-offset="6">
            {{ $t('players.estimateGiven') }}
          </TooltipContent>
        </TooltipPortal>
      </TooltipRoot>
      <TooltipRoot v-else>
        <TooltipTrigger as-child>
          <span class="inline-flex">
            <AppIcon
              class="mui-svg-icon text-black/[0.26] dark:text-white/30"
              icon="app:offline"
              style="font-size: 1.5rem;"
              :aria-label="$t('players.inactive')"
            />
          </span>
        </TooltipTrigger>
        <TooltipPortal>
          <TooltipContent class="mui-tooltip-content" side="top" :side-offset="6">
            {{ $t('players.inactive') }}
          </TooltipContent>
        </TooltipPortal>
      </TooltipRoot>
    </template>

    <div
      class="flex items-center justify-center"
      style="width: 36px; height: 36px;"
    >
      <DropdownMenuRoot v-if="isOwn || currentUserIsAuthorizedModerator">
        <DropdownMenuTrigger as-child>
          <button
            v-wave
            class="mui-icon-btn"
            style="padding: 4px;"
          >
            <AppIcon
              class="mui-svg-icon text-muted dark:text-inverse"
              icon="ic:baseline-more-vert"
              style="font-size: 1.5rem;"
            />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent
            class="mui-menu z-50"
            style="min-width: 200px;"
            align="end"
            :side-offset="4"
          >
            <template v-if="isOwn">
              <DropdownMenuCheckboxItem
                v-wave
                class="mui-menu-item"
                :model-value="player.is_moderator"
                @update:model-value="emit('toggleModerator', player.id, $event)"
              >
                <AppIcon
                  class="mui-menu-icon"
                  icon="app:moderator"
                />
                <span class="flex-1">{{ $t('players.isModerator') }}</span>
                <span class="mui-switch">
                  <input
                    type="checkbox"
                    :checked="player.is_moderator"
                    tabindex="-1"
                    readonly
                  >
                  <span class="track" />
                  <span class="thumb" />
                </span>
              </DropdownMenuCheckboxItem>
              <DropdownMenuItem
                v-wave
                class="mui-menu-item"
                @select="emit('edit', player.id)"
              >
                <AppIcon
                  class="mui-menu-icon"
                  icon="ic:baseline-edit"
                /> {{ $t('players.edit') }}
              </DropdownMenuItem>
              <DropdownMenuItem
                v-wave
                class="mui-menu-item"
                @select="emit('leave', player.id)"
              >
                <AppIcon
                  class="mui-menu-icon"
                  icon="app:leave-room"
                /> {{ $t('players.leaveRoom') }}
              </DropdownMenuItem>
            </template>
            <template v-else-if="currentUserIsAuthorizedModerator">
              <DropdownMenuItem
                v-wave
                class="mui-menu-item"
                @select="emit('edit', player.id)"
              >
                <AppIcon
                  class="mui-menu-icon"
                  icon="ic:baseline-edit"
                /> {{ $t('players.edit') }}
              </DropdownMenuItem>
              <DropdownMenuItem
                v-wave
                class="mui-menu-item"
                @select="emit('kick', player.id)"
              >
                <AppIcon
                  class="mui-menu-icon"
                  icon="ic:baseline-person-remove"
                /> {{ $t('players.kickPlayer') }}
              </DropdownMenuItem>
            </template>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenuRoot>
    </div>
  </div>
</template>
