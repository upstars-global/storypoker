<script setup lang="ts">
defineProps<{
  onlineCount: number
  isModerator: boolean
  playerName: string
  roomName?: string
}>()

const emit = defineEmits<{
  openSignIn: []
  openSignUp: []
  openCardDeck: []
  openRenameRoom: []
  signOut: []
}>()

import { storeToRefs } from 'pinia'
import { useAuthStore } from '~/stores/auth'
const router = useRouter()
const { user } = storeToRefs(useAuthStore())
const { avatarDataUri } = useDylanAvatar()
const { isLight, toggle: toggleTheme } = useTheme()
const showMenu = ref(false)
const showRoomMenu = ref(false)

function goRecent() {
  showMenu.value = false
  router.push('/')
}
</script>

<template>
  <header
    class="sticky top-0 z-40 w-full flex items-center px-4 sm:px-6"
    style="background-color: var(--bg-appbar); color: #fff; min-height: 56px; box-shadow: var(--shadow-4);"
  >
    <NuxtLink v-wave to="/" class="mui-h6 text-lg inline-flex items-center px-2 py-1 -mx-2 rounded" style="color: #fff;">
      Story Poking
    </NuxtLink>
    <template v-if="roomName">
      <span style="color: rgba(255,255,255,0.4); margin: 0 6px;">/</span>
      <span class="mui-h6 text-lg" style="color: rgba(255,255,255,0.85);">{{ roomName }}</span>
      <div v-if="isModerator" class="relative ml-1">
        <button
          v-wave
          class="mui-icon-btn"
          style="--hover-bg: rgba(255,255,255,0.08); color: rgba(255,255,255,0.7);"
          aria-label="Room settings"
          @click.stop="showRoomMenu = !showRoomMenu"
        >
          <IconSettings style="font-size: 1.2rem;" />
        </button>
        <ul
          v-if="showRoomMenu"
          v-click-outside="() => showRoomMenu = false"
          class="mui-menu absolute z-50"
          style="min-width: 220px; left: 0; top: calc(100% + 4px);"
        >
          <li v-if="user">
            <button v-wave class="mui-menu-item whitespace-nowrap" @click="emit('openRenameRoom'); showRoomMenu = false">
              <IconEdit class="mui-menu-icon" /> Rename Room
            </button>
          </li>
          <li>
            <button v-wave class="mui-menu-item whitespace-nowrap" @click="emit('openCardDeck'); showRoomMenu = false">
              <IconSettings class="mui-menu-icon" /> Configure Card Deck
            </button>
          </li>
        </ul>
      </div>
    </template>
    <div class="flex-1" />

    <div class="flex items-center gap-2 relative">
      <span v-if="playerName" class="text-sm" style="color: rgba(255,255,255,0.85);">
        {{ playerName }}<template v-if="user && user.email"> ({{ user.email }})</template>
      </span>
      <button
        v-wave
        class="mui-icon-btn"
        style="--hover-bg: rgba(255,255,255,0.08); color: #fff;"
        aria-label="account of current user"
        aria-haspopup="true"
        @click.stop="showMenu = !showMenu"
      >
        <img
          v-if="user"
          :src="avatarDataUri(playerName)"
          class="w-7 h-7 rounded-full"
          :alt="playerName"
        />
        <IconAccount v-else style="font-size: 1.5rem;" />
      </button>

      <ul
        v-if="showMenu"
        v-click-outside="() => showMenu = false"
        class="mui-menu absolute z-50"
        style="min-width: 240px; right: 32px; top: 12px; margin-right: 8px;"
      >
        <li>
          <button v-wave class="mui-menu-item whitespace-nowrap" @click="goRecent">
            <IconHistory class="mui-menu-icon" /> Recent Rooms
          </button>
        </li>
        <li><hr class="mui-divider" /></li>
        <li>
          <button
            v-wave
            class="mui-menu-item whitespace-nowrap"
            role="menuitemcheckbox"
            :aria-checked="String(isLight)"
            @click="toggleTheme"
          >
            <IconDarkMode class="mui-menu-icon" />
            <span class="flex-1">Light theme</span>
            <span class="mui-switch">
              <input type="checkbox" :checked="isLight" tabindex="-1" readonly />
              <span class="track" />
              <span class="thumb" />
            </span>
          </button>
        </li>
        <template v-if="!user">
          <li><hr class="mui-divider" /></li>
          <li>
            <button v-wave class="mui-menu-item whitespace-nowrap" @click="emit('openSignIn'); showMenu = false">
              <IconLogin class="mui-menu-icon" /> Sign In
            </button>
          </li>
          <li>
            <button v-wave class="mui-menu-item whitespace-nowrap" @click="emit('openSignUp'); showMenu = false">
              <IconPersonAdd class="mui-menu-icon" /> Sign Up
            </button>
          </li>
        </template>
        <template v-else>
          <li><hr class="mui-divider" /></li>
          <li>
            <button v-wave class="mui-menu-item whitespace-nowrap" @click="emit('signOut'); showMenu = false">
              <IconLogout class="mui-menu-icon" /> Sign Out
            </button>
          </li>
        </template>
      </ul>
    </div>
  </header>
</template>
