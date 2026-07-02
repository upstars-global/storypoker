<script setup lang="ts">
import AppIcon from '~/components/AppIcon.vue'
import { ref, computed, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useClickOutside } from '~/composables/useClickOutside'
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
  title?: string
  countdownActive?: boolean
  countdownCounter?: number
  countdownTotal?: number
}>(), {
  title: 'Story Poker',
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
  openHistory: []
  openAlignmentTrends: []
  signOut: []
}>()

const { user } = storeToRefs(useAuthStore())
const profilesStore = useProfilesStore()
const { avatarDataUri } = useDylanAvatar()
const { isLight, toggle: toggleTheme } = useTheme()
const { locale } = useI18n()
const countdownBarWidth = ref(0)

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

const menuRef = ref<HTMLElement | null>(null)
const menuOpen = ref(false)
useClickOutside(menuRef, () => { menuOpen.value = false })
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
      <AppIcon
        icon="app:fibonacci"
        style="font-size: 1.75rem; transform: rotate(-90deg);"
      />
    </RouterLink>
    <span class="mx-1.5 text-appbar-subtle">•</span>
    <span
      v-if="!roomName"
      class="mui-h6 text-lg px-2 text-white"
    >{{ title }}</span>
    <template v-if="roomName">
      <span class="mui-h6 text-lg text-appbar-emphasis">{{ roomName }}</span>
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
      <span
        v-if="headerLabel"
        class="text-sm text-appbar-emphasis"
      >
        {{ headerLabel }}
      </span>
      <div ref="menuRef" style="position: relative;">
        <button
          v-wave
          class="mui-icon-btn text-white"
          style="--hover-bg: rgba(255,255,255,0.08);"
          :aria-label="$t('header.currentUserAccount')"
          :aria-expanded="menuOpen"
          data-testid="account-menu-button"
          @click="menuOpen = !menuOpen"
        >
          <img
            v-if="myAvatarUri"
            :src="myAvatarUri"
            class="w-7 h-7 rounded-full"
            :alt="playerName"
            :style="{ opacity: profileFetched ? 1 : 0, transition: 'opacity 0.15s' }"
          >
          <AppIcon
            v-else
            class="mui-svg-icon"
            icon="ic:baseline-account-circle"
            style="font-size: 1.5rem;"
          />
        </button>

        <ul
          v-if="menuOpen"
          class="mui-menu z-50"
          role="menu"
          style="position: absolute; right: 0; top: calc(100% + 4px); min-width: 240px;"
          @keydown.escape="menuOpen = false"
        >
          <template v-if="isModerator">
            <li
              v-wave
              class="mui-menu-item whitespace-nowrap"
              role="menuitem"
              tabindex="0"
              @click="emit('openCardDeck'); menuOpen = false"
              @keydown.enter="emit('openCardDeck'); menuOpen = false"
            >
              <AppIcon class="mui-menu-icon" icon="ic:baseline-settings" />
              {{ $t('header.configureCardDeck') }}
            </li>
            <li
              v-if="user"
              v-wave
              class="mui-menu-item whitespace-nowrap"
              role="menuitem"
              tabindex="0"
              @click="emit('openRenameRoom'); menuOpen = false"
              @keydown.enter="emit('openRenameRoom'); menuOpen = false"
            >
              <AppIcon class="mui-menu-icon" icon="ic:baseline-edit" />
              {{ $t('header.renameRoom') }}
            </li>
            <hr class="mui-divider">
          </template>

          <template v-if="user">
            <li
              v-wave
              class="mui-menu-item whitespace-nowrap"
              role="menuitem"
              tabindex="0"
              @click="emit('openAccountSettings'); menuOpen = false"
              @keydown.enter="emit('openAccountSettings'); menuOpen = false"
            >
              <AppIcon class="mui-menu-icon" icon="ic:baseline-settings" />
              {{ $t('header.accountSettings') }}
            </li>
            <hr class="mui-divider">
          </template>

          <li
            v-wave
            class="mui-menu-item whitespace-nowrap"
            role="menuitem"
            tabindex="0"
            @click="emit('openHistory'); menuOpen = false"
            @keydown.enter="emit('openHistory'); menuOpen = false"
          >
            <AppIcon class="mui-menu-icon" icon="ic:baseline-history" />
            {{ $t('header.history') }}
          </li>
          <li
            v-wave
            class="mui-menu-item whitespace-nowrap"
            role="menuitem"
            tabindex="0"
            @click="emit('openAlignmentTrends'); menuOpen = false"
            @keydown.enter="emit('openAlignmentTrends'); menuOpen = false"
          >
            <AppIcon class="mui-menu-icon" icon="ic:baseline-trending-up" />
            {{ $t('header.alignmentTrends') }}
          </li>
          <hr class="mui-divider">

          <li
            v-wave
            class="mui-menu-item whitespace-nowrap"
            role="menuitem"
            tabindex="0"
            @click.stop="toggleTheme"
          >
            <AppIcon class="mui-menu-icon" :icon="isLight ? 'ic:baseline-light-mode' : 'ic:baseline-dark-mode'" />
            <span class="flex-1">{{ isLight ? $t('header.lightTheme') : $t('header.darkTheme') }}</span>
            <span class="mui-switch">
              <input type="checkbox" :checked="isLight" tabindex="-1" readonly>
              <span class="track" />
              <span class="thumb" />
            </span>
          </li>

          <template v-if="!user">
            <hr class="mui-divider">
            <li
              v-wave
              class="mui-menu-item whitespace-nowrap"
              role="menuitem"
              tabindex="0"
              data-testid="auth-sign-in-menu-item"
              @click="emit('openSignIn'); menuOpen = false"
              @keydown.enter="emit('openSignIn'); menuOpen = false"
            >
              <AppIcon class="mui-menu-icon" icon="ic:baseline-login" />
              {{ $t('common.signIn') }}
            </li>
            <li
              v-wave
              class="mui-menu-item whitespace-nowrap"
              role="menuitem"
              tabindex="0"
              @click="emit('openSignUp'); menuOpen = false"
              @keydown.enter="emit('openSignUp'); menuOpen = false"
            >
              <AppIcon class="mui-menu-icon" icon="ic:baseline-person-add" />
              {{ $t('common.signUp') }}
            </li>
          </template>
          <template v-else>
            <hr class="mui-divider">
            <li
              v-wave
              class="mui-menu-item whitespace-nowrap"
              role="menuitem"
              tabindex="0"
              data-testid="auth-sign-out-menu-item"
              @click="emit('signOut'); menuOpen = false"
              @keydown.enter="emit('signOut'); menuOpen = false"
            >
              <AppIcon class="mui-menu-icon" icon="ic:baseline-logout" />
              {{ $t('common.signOut') }}
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
