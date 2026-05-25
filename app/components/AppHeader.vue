<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { ref, computed, watch, nextTick, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '~/stores/auth'
import { useProfilesStore } from '~/stores/profiles'
import { useDylanAvatar } from '~/composables/useDylanAvatar'
import { useTheme } from '~/composables/useTheme'

const props = withDefaults(defineProps<{
  onlineCount: number
  isModerator: boolean
  playerName: string
  playerUserId?: string | null
  roomName?: string
  countdownActive?: boolean
  countdownCounter?: number
  countdownTotal?: number
}>(), {
  countdownActive: false,
  countdownCounter: 0,
  countdownTotal: 0,
})

const emit = defineEmits<{
  openSignIn: []
  openSignUp: []
  openCardDeck: []
  openRenameRoom: []
  openAccountSettings: []
  signOut: []
}>()

const { user } = storeToRefs(useAuthStore())
const profilesStore = useProfilesStore()
const { avatarDataUri } = useDylanAvatar()
const { isLight, toggle: toggleTheme } = useTheme()
const { locale } = useI18n()
const showMenu = ref(false)
const showRoomMenu = ref(false)
const countdownBarWidth = ref(0)
const roomMenuEl = ref<HTMLElement | null>(null)
const accountMenuEl = ref<HTMLElement | null>(null)

async function clampToViewport(elRef: Ref<HTMLElement | null>) {
  await nextTick()
  const el = elRef.value
  if (!el) return
  el.style.transform = ''
  const rect = el.getBoundingClientRect()
  const rightOverflow = rect.right - (window.innerWidth - 8)
  const leftOverflow = 8 - rect.left
  if (rightOverflow > 0) el.style.transform = `translateX(-${rightOverflow}px)`
  else if (leftOverflow > 0) el.style.transform = `translateX(${leftOverflow}px)`
}

watch(showRoomMenu, val => { if (val) clampToViewport(roomMenuEl) })
watch(showMenu, val => { if (val) clampToViewport(accountMenuEl) })

watch(() => props.countdownActive, async (active) => {
  if (!active) {
    countdownBarWidth.value = 0
    return
  }
  countdownBarWidth.value = 0
  await nextTick()
  requestAnimationFrame(() => { countdownBarWidth.value = 100 })
})

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

const headerLabel = computed(() => {
  if (props.roomName) return props.playerName
  return user.value?.email ?? ''
})

const profileFetched = ref(!user.value)

watch(() => user.value?.id, async (id) => {
  if (!id) { profileFetched.value = true; return }
  profileFetched.value = false
  await profilesStore.fetchOne(id)
  profileFetched.value = true
}, { immediate: true })

function toggleLocale() {
  locale.value = locale.value === 'uk' ? 'en' : 'uk'
}
</script>

<template>
  <header
    class="sticky top-0 z-40 w-full flex items-center px-4 sm:px-6 bg-appbar text-white shadow-4"
    style="min-height: 56px;"
  >
    <RouterLink
      v-wave
      to="/"
      class="mui-icon-btn text-appbar-emphasis"
      style="--hover-bg: rgba(255,255,255,0.08);"
    >
      <Icon icon="app:fibonacci" style="font-size: 1.75rem; transform: rotate(-90deg);" />
    </RouterLink>
    <span v-if="!roomName" class="mui-h6 text-lg px-2 text-white">Story Poker</span>
    <template v-if="roomName">
      <span class="mx-1.5 text-appbar-subtle">/</span>
      <span class="mui-h6 text-lg text-appbar-emphasis">{{ roomName }}</span>
      <div v-if="isModerator" class="relative ml-1">
        <button
          v-wave
          class="mui-icon-btn text-appbar-muted"
          style="--hover-bg: rgba(255,255,255,0.08);"
          :aria-label="$t('header.roomSettings')"
          @click.stop="showRoomMenu = !showRoomMenu"
        >
          <Icon class="mui-svg-icon" icon="ic:baseline-settings" style="font-size: 1.2rem;" />
        </button>
        <ul
          v-if="showRoomMenu"
          ref="roomMenuEl"
          v-click-outside="() => showRoomMenu = false"
          class="mui-menu absolute z-50"
          style="min-width: 220px; right: 0; top: calc(100% + 4px);"
        >
          <li v-if="user">
            <button v-wave class="mui-menu-item whitespace-nowrap" @click="emit('openRenameRoom'); showRoomMenu = false">
              <Icon class="mui-menu-icon" icon="ic:baseline-edit" /> {{ $t('header.renameRoom') }}
            </button>
          </li>
          <li>
            <button v-wave class="mui-menu-item whitespace-nowrap" @click="emit('openCardDeck'); showRoomMenu = false">
              <Icon class="mui-menu-icon" icon="ic:baseline-settings" /> {{ $t('header.configureCardDeck') }}
            </button>
          </li>
        </ul>
      </div>
    </template>
    <div class="flex-1" />

    <div class="flex items-center gap-2">
      <button
        v-wave
        class="mui-icon-btn text-xs font-bold tracking-widest text-appbar-emphasis"
        style="--hover-bg: rgba(255,255,255,0.12); width: auto; padding: 4px 10px; border-radius: 4px;"
        @click="toggleLocale"
      >
        {{ locale === 'uk' ? 'EN' : 'UA' }}
      </button>
      <span v-if="headerLabel" class="text-sm text-appbar-emphasis">
        {{ headerLabel }}
      </span>
      <div class="relative">
        <button
          v-wave
          class="mui-icon-btn text-white"
          style="--hover-bg: rgba(255,255,255,0.08);"
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
          <Icon v-else class="mui-svg-icon" icon="ic:baseline-account-circle" style="font-size: 1.5rem;" />
        </button>

        <ul
          v-if="showMenu"
          ref="accountMenuEl"
          v-click-outside="() => showMenu = false"
          class="mui-menu absolute z-50"
          style="min-width: 240px; right: 0; top: calc(100% + 4px);"
        >
          <template v-if="user">
            <li>
              <button v-wave class="mui-menu-item whitespace-nowrap" @click="emit('openAccountSettings'); showMenu = false">
                <Icon class="mui-menu-icon" icon="ic:baseline-settings" /> {{ $t('header.accountSettings') }}
              </button>
            </li>
            <li><hr class="mui-divider" /></li>
          </template>
        <li>
          <button
            v-wave
            class="mui-menu-item whitespace-nowrap"
            role="menuitemcheckbox"
            :aria-checked="isLight"
            @click="toggleTheme"
          >
            <Icon class="mui-menu-icon" :icon="isLight ? 'ic:baseline-light-mode' : 'ic:baseline-dark-mode'" />
            <span class="flex-1">{{ isLight ? $t('header.lightTheme') : $t('header.darkTheme') }}</span>
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
              <Icon class="mui-menu-icon" icon="ic:baseline-login" /> {{ $t('common.signIn') }}
            </button>
          </li>
          <li>
            <button v-wave class="mui-menu-item whitespace-nowrap" @click="emit('openSignUp'); showMenu = false">
              <Icon class="mui-menu-icon" icon="ic:baseline-person-add" /> {{ $t('common.signUp') }}
            </button>
          </li>
        </template>
        <template v-else>
          <li><hr class="mui-divider" /></li>
          <li>
            <button v-wave class="mui-menu-item whitespace-nowrap" data-testid="auth-sign-out-menu-item" @click="emit('signOut'); showMenu = false">
              <Icon class="mui-menu-icon" icon="ic:baseline-logout" /> {{ $t('common.signOut') }}
            </button>
          </li>
        </template>
        </ul>
      </div>
    </div>

    <template v-if="countdownActive">
      <div
        class="absolute inset-x-0 bottom-0 h-1.5"
        style="background-color: rgba(255, 255, 255, 0.16);"
        data-testid="countdown-bar"
      >
        <div
          class="h-full"
          :style="{
            width: `${countdownBarWidth}%`,
            backgroundColor: 'var(--success)',
            transition: `width ${countdownTotal}s linear`,
          }"
        />
      </div>
      <div
        class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-mui-h2 font-bold tabular-nums text-white pointer-events-none"
        data-testid="countdown-number"
      >
        {{ countdownCounter }}
      </div>
    </template>
  </header>
</template>
