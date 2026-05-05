<script setup lang="ts">
defineProps<{
  onlineCount: number
  isModerator: boolean
  playerName: string
}>()

const emit = defineEmits<{
  openSignIn: []
  openSignUp: []
  openCardDeck: []
  openTrends: []
  openRecent: []
  signOut: []
}>()

import { storeToRefs } from 'pinia'
import { useAuthStore } from '~/stores/auth'
const { user } = storeToRefs(useAuthStore())
const { avatarDataUri } = useDylanAvatar()
const { isLight, toggle: toggleTheme } = useTheme()
const showMenu = ref(false)
</script>

<template>
  <header
    class="sticky top-0 z-40 w-full flex items-center px-4 sm:px-6"
    style="background-color: var(--bg-appbar); color: #fff; min-height: 56px; box-shadow: var(--shadow-4);"
  >
    <NuxtLink v-wave to="/" class="mui-h6 text-lg inline-flex items-center px-2 py-1 -mx-2 rounded" style="color: #fff;">
      Story Poker
    </NuxtLink>
    <div class="flex-1" />

    <div class="flex items-center gap-2 relative">
      <span v-if="playerName" class="text-sm" style="color: rgba(255,255,255,0.85);">{{ playerName }}</span>
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
        <li v-if="isModerator">
          <button v-wave class="mui-menu-item whitespace-nowrap" @click="emit('openCardDeck'); showMenu = false">
            <IconSettings class="mui-menu-icon" /> Configure Card Deck
          </button>
        </li>
        <li>
          <button v-wave class="mui-menu-item whitespace-nowrap" @click="emit('openTrends'); showMenu = false">
            <IconTrendingUp class="mui-menu-icon" /> Alignment Trends
          </button>
        </li>
        <li>
          <button v-wave class="mui-menu-item whitespace-nowrap" @click="emit('openRecent'); showMenu = false">
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
