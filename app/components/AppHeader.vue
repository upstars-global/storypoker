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
const showMenu = ref(false)
</script>

<template>
  <header class="bg-[#2a2a2a] px-4 py-2 flex items-center justify-between sticky top-0 z-40">
    <NuxtLink to="/" class="font-semibold text-base">Story Point Poker</NuxtLink>
    <div class="flex items-center gap-3 relative">
      <span class="text-sm text-gray-400">{{ onlineCount }}</span>
      <button class="flex items-center" @click="showMenu = !showMenu">
        <img
          v-if="user"
          :src="avatarDataUri(playerName)"
          class="w-8 h-8 rounded-full"
          :alt="playerName"
        />
        <Icon v-else name="mdi:account-circle" class="w-8 h-8 text-gray-400" />
      </button>
      <div
        v-if="showMenu"
        v-click-outside="() => showMenu = false"
        class="absolute right-0 top-10 bg-[#2a2a2a] border border-gray-700 rounded shadow-lg z-50 min-w-44"
      >
        <template v-if="isModerator">
          <button class="w-full text-left px-4 py-2 text-sm hover:bg-white/10 flex items-center gap-2" @click="emit('openCardDeck'); showMenu = false">
            <Icon name="mdi:cog" class="w-4 h-4" /> Configure Card Deck
          </button>
          <hr class="border-gray-700" />
        </template>
        <template v-if="!user">
          <button class="w-full text-left px-4 py-2 text-sm hover:bg-white/10 flex items-center gap-2" @click="emit('openSignIn'); showMenu = false">
            <Icon name="mdi:login" class="w-4 h-4" /> Sign In
          </button>
          <button class="w-full text-left px-4 py-2 text-sm hover:bg-white/10 flex items-center gap-2" @click="emit('openSignUp'); showMenu = false">
            <Icon name="mdi:account-plus" class="w-4 h-4" /> Sign Up
          </button>
        </template>
        <template v-else>
          <button class="w-full text-left px-4 py-2 text-sm hover:bg-white/10 flex items-center gap-2" @click="emit('signOut'); showMenu = false">
            <Icon name="mdi:logout" class="w-4 h-4" /> Sign Out
          </button>
        </template>
      </div>
    </div>
  </header>
</template>
