<script setup lang="ts">
const props = defineProps<{
  onlineCount: number
  isModerator: boolean
  playerName: string
  playerUserId?: string | null
  roomName?: string
}>()

const emit = defineEmits<{
  openSignIn: []
  openSignUp: []
  openCardDeck: []
  openRenameRoom: []
  openAccountSettings: []
  signOut: []
}>()

import { storeToRefs } from 'pinia'
import { useAuthStore } from '~/stores/auth'
import { useProfilesStore } from '~/stores/profiles'
const router = useRouter()
const { user } = storeToRefs(useAuthStore())
const profilesStore = useProfilesStore()
const { avatarDataUri } = useDylanAvatar()
const { isLight, toggle: toggleTheme } = useTheme()
const showMenu = ref(false)
const showRoomMenu = ref(false)

const myAvatarUri = computed(() => {
  const userIdForProfile = props.playerUserId ?? user.value?.id ?? null
  if (userIdForProfile) {
    const profile = profilesStore.get(userIdForProfile)
    if (profile) return avatarDataUri(profile.avatar_seed, false, profile.avatar_style)
  }
  if (props.playerName) return avatarDataUri(props.playerName, false, 'bottts')
  if (user.value?.email) return avatarDataUri(user.value.email, false, 'bottts')
  return ''
})

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

    <div class="flex items-center gap-2">
      <span v-if="playerName" class="text-sm" style="color: rgba(255,255,255,0.85);">
        {{ playerName }}<template v-if="user && user.email"> ({{ user.email }})</template>
      </span>
      <div class="relative">
        <button
          v-wave
          class="mui-icon-btn"
          style="--hover-bg: rgba(255,255,255,0.08); color: #fff;"
          aria-label="account of current user"
          aria-haspopup="true"
          @click.stop="showMenu = !showMenu"
        >
          <img
            v-if="myAvatarUri"
            :src="myAvatarUri"
            class="w-7 h-7 rounded-full"
            :alt="playerName"
          />
          <IconAccount v-else style="font-size: 1.5rem;" />
        </button>

        <ul
          v-if="showMenu"
          v-click-outside="() => showMenu = false"
          class="mui-menu absolute z-50"
          style="min-width: 240px; right: 0; top: calc(100% + 4px);"
        >
        <template v-if="user">
          <li>
            <button v-wave class="mui-menu-item whitespace-nowrap" @click="emit('openAccountSettings'); showMenu = false">
              <IconSettings class="mui-menu-icon" /> Account Settings
            </button>
          </li>
          <li><hr class="mui-divider" /></li>
        </template>
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
    </div>
  </header>
</template>
