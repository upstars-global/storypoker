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
const { locale, setLocale } = useI18n()
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

const profileFetched = ref(!user.value)

watch(() => user.value?.id, async (id) => {
  if (!id) { profileFetched.value = true; return }
  profileFetched.value = false
  await profilesStore.fetchOne(id)
  profileFetched.value = true
}, { immediate: true })

function goRecent() {
  showMenu.value = false
  router.push('/')
}

function toggleLocale() {
  setLocale(locale.value === 'uk' ? 'en' : 'uk')
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
          :aria-label="$t('header.roomSettings')"
          @click.stop="showRoomMenu = !showRoomMenu"
        >
          <Icon class="mui-svg-icon" name="app:settings" style="font-size: 1.2rem;" />
        </button>
        <ul
          v-if="showRoomMenu"
          v-click-outside="() => showRoomMenu = false"
          class="mui-menu absolute z-50"
          style="min-width: 220px; left: 0; top: calc(100% + 4px);"
        >
          <li v-if="user">
            <button v-wave class="mui-menu-item whitespace-nowrap" @click="emit('openRenameRoom'); showRoomMenu = false">
              <Icon class="mui-menu-icon" name="app:edit" /> {{ $t('header.renameRoom') }}
            </button>
          </li>
          <li>
            <button v-wave class="mui-menu-item whitespace-nowrap" @click="emit('openCardDeck'); showRoomMenu = false">
              <Icon class="mui-menu-icon" name="app:settings" /> {{ $t('header.configureCardDeck') }}
            </button>
          </li>
        </ul>
      </div>
    </template>
    <div class="flex-1" />

    <div class="flex items-center gap-2">
      <button
        v-wave
        class="mui-icon-btn text-xs font-bold tracking-widest"
        style="--hover-bg: rgba(255,255,255,0.12); color: rgba(255,255,255,0.85); width: auto; padding: 4px 10px; border-radius: 4px;"
        @click="toggleLocale"
      >
        {{ locale === 'uk' ? 'EN' : 'UA' }}
      </button>
      <span v-if="playerName" class="text-sm" style="color: rgba(255,255,255,0.85);">
        {{ playerName }}<template v-if="user && user.email"> ({{ user.email }})</template>
      </span>
      <div class="relative">
        <button
          v-wave
          class="mui-icon-btn"
          style="--hover-bg: rgba(255,255,255,0.08); color: #fff;"
          :aria-label="$t('header.currentUserAccount')"
          aria-haspopup="true"
          data-testid="account-menu-button"
          @click.stop="showMenu = !showMenu"
        >
          <img
            v-if="myAvatarUri"
            :src="myAvatarUri"
            class="w-7 h-7 rounded-full"
            :alt="playerName"
            :style="{ opacity: profileFetched ? 1 : 0, transition: 'opacity 0.15s' }"
          />
          <Icon v-else class="mui-svg-icon" name="app:account" style="font-size: 1.5rem;" />
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
                <Icon class="mui-menu-icon" name="app:settings" /> {{ $t('header.accountSettings') }}
              </button>
            </li>
            <li><hr class="mui-divider" /></li>
          </template>
        <li>
          <button v-wave class="mui-menu-item whitespace-nowrap" @click="goRecent">
            <Icon class="mui-menu-icon" name="app:history" /> {{ $t('header.recentRooms') }}
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
            <Icon class="mui-menu-icon" name="app:dark-mode" />
            <span class="flex-1">{{ $t('header.lightTheme') }}</span>
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
            <button v-wave class="mui-menu-item whitespace-nowrap" data-testid="auth-sign-in-menu-item" @click="emit('openSignIn'); showMenu = false">
              <Icon class="mui-menu-icon" name="app:login" /> {{ $t('common.signIn') }}
            </button>
          </li>
          <li>
            <button v-wave class="mui-menu-item whitespace-nowrap" @click="emit('openSignUp'); showMenu = false">
              <Icon class="mui-menu-icon" name="app:person-add" /> {{ $t('common.signUp') }}
            </button>
          </li>
        </template>
        <template v-else>
          <li><hr class="mui-divider" /></li>
          <li>
            <button v-wave class="mui-menu-item whitespace-nowrap" data-testid="auth-sign-out-menu-item" @click="emit('signOut'); showMenu = false">
              <Icon class="mui-menu-icon" name="app:logout" /> {{ $t('common.signOut') }}
            </button>
          </li>
        </template>
        </ul>
      </div>
    </div>
  </header>
</template>
