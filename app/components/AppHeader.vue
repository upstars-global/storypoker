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
  signOut: []
}>()

const { user } = useAuth()
const { avatarDataUri } = useDylanAvatar()
const { isLight, toggle: toggleTheme } = useTheme()
const showMenu = ref(false)
</script>

<template>
  <header
    class="sticky top-0 z-40 w-full flex items-center px-4 sm:px-6"
    style="background-color: var(--bg-appbar); color: #fff; min-height: 56px; box-shadow: var(--shadow-4);"
  >
    <NuxtLink to="/" class="mui-h6 flex-1" style="color: #fff;">Story Point Poker</NuxtLink>

    <div class="flex items-center gap-2 relative">
      <span class="text-sm" style="color: rgba(255,255,255,0.85);">{{ onlineCount }}</span>
      <button
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
        class="mui-menu absolute right-0 top-12 z-50"
      >
        <li>
          <button
            class="mui-menu-item"
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
        <li v-if="isModerator">
          <hr class="mui-divider" />
          <button class="mui-menu-item" @click="emit('openCardDeck'); showMenu = false">
            <IconSettings class="mui-menu-icon" /> Configure Card Deck
          </button>
        </li>
        <template v-if="!user">
          <li><hr class="mui-divider" /></li>
          <li>
            <button class="mui-menu-item" @click="emit('openSignIn'); showMenu = false">
              <IconLogin class="mui-menu-icon" /> Sign In
            </button>
          </li>
          <li>
            <button class="mui-menu-item" @click="emit('openSignUp'); showMenu = false">
              <IconPersonAdd class="mui-menu-icon" /> Sign Up
            </button>
          </li>
        </template>
        <template v-else>
          <li><hr class="mui-divider" /></li>
          <li>
            <button class="mui-menu-item" @click="emit('signOut'); showMenu = false">
              <IconLogout class="mui-menu-icon" /> Sign Out
            </button>
          </li>
        </template>
      </ul>
    </div>
  </header>
</template>
