<script setup lang="ts">
import { ref, shallowRef, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useRoomStore } from '~/stores/room'
import { usePlayersStore } from '~/stores/players'
import { useAuthStore } from '~/stores/auth'
import { useProfilesStore } from '~/stores/profiles'
import { listRecentRooms, touchRecentRoom, type RecentRoomEntry } from '~/utils/recentRooms'
import { relativeTime } from '~/utils/relativeTime'
import { getSupabase } from '~/lib/supabase-instance'
import AppHeader from '~/components/AppHeader.vue'
import AuthModal from '~/components/AuthModal.vue'
import UserSettingsModal from '~/components/UserSettingsModal.vue'

const name = shallowRef('')
const hasError = shallowRef(false)
const router = useRouter()
const roomStore = useRoomStore()
const playersStore = usePlayersStore()
const authStore = useAuthStore()

interface RecentRoomDisplay extends RecentRoomEntry {
  playerNames: string[]
  slug: string | null
  name: string | null
}

const recentRooms = ref<RecentRoomDisplay[]>([])
const origin = ref('')
const showAuth = ref<'signin' | 'signup' | null>(null)
const showAccountSettings = ref(false)
const profilesStore = useProfilesStore()
const { user } = storeToRefs(authStore)
const headerPlayerName = computed(() => recentRooms.value[0]?.playerName ?? '')

onMounted(async () => {
  origin.value = window.location.origin
  await authStore.init()
  if (user.value?.id) await profilesStore.fetchOne(user.value.id)
  const local = listRecentRooms()
  if (local.length === 0) return

  const supabase = getSupabase()
  const ids = local.map(r => r.roomId)
  const [{ data: playersData }, { data: roomsData }] = await Promise.all([
    supabase.from('players').select('room_id, name').in('room_id', ids).is('left_at', null),
    supabase.from('rooms').select('id, slug, name').in('id', ids),
  ])

  const namesByRoom: Record<string, string[]> = {}
  for (const row of playersData ?? []) {
    const names = namesByRoom[row.room_id] ?? []
    names.push(row.name)
    namesByRoom[row.room_id] = names
  }

  const slugByRoom: Record<string, { slug: string | null; name: string | null }> = {}
  for (const row of roomsData ?? []) {
    slugByRoom[row.id] = { slug: row.slug ?? null, name: row.name ?? null }
  }

  recentRooms.value = local.map(r => ({
    ...r,
    playerNames: namesByRoom[r.roomId] ?? [],
    slug: slugByRoom[r.roomId]?.slug ?? null,
    name: slugByRoom[r.roomId]?.name ?? null,
  }))
})

async function createRoom() {
  if (!name.value.trim()) {
    hasError.value = true
    return
  }
  hasError.value = false
  await authStore.init()
  const roomId = await roomStore.create()
  playersStore.roomId = roomId
  const player = await playersStore.join(name.value.trim(), authStore.user?.id ?? null)
  await playersStore.toggleModerator(player.id, true)
  touchRecentRoom(roomId, player.id, player.name)
  router.push(`/${roomId}`)
}
</script>

<template>
  <div class="min-h-screen flex flex-col bg-app text-body">
    <AppHeader
      :online-count="0"
      :is-moderator="false"
      :player-name="headerPlayerName"
      @open-sign-in="showAuth = 'signin'"
      @open-sign-up="showAuth = 'signup'"
      @open-account-settings="showAccountSettings = true"
      @sign-out="authStore.signOut()"
    />

    <AuthModal
      v-if="showAuth"
      :mode="showAuth"
      @close="showAuth = null"
      @success="showAuth = null"
    />

    <UserSettingsModal
      v-if="showAccountSettings && user"
      @close="showAccountSettings = false"
    />

    <main class="flex flex-1 flex-col items-center px-4 pt-[26px] pb-[40px]">
      <section class="w-full max-w-[460px] text-center">
        <h2 class="m-0 text-mui-h2 font-bold text-primary">
          {{ $t('home.title') }}
        </h2>
        <p class="mt-[11px] whitespace-nowrap text-mui-body font-normal text-body">
          {{ $t('home.subtitle') }}
        </p>
        <div class="mt-[19px] flex flex-col items-center">
          <div class="flex w-full max-w-[360px]">
            <input
              v-model="name"
              type="text"
              :placeholder="$t('home.namePlaceholder')"
              class="mui-input h-[51px] min-w-0 flex-1"
              :class="{ 'is-error': hasError }"
              data-testid="home-name-input"
              @keyup.enter="createRoom"
            />
          </div>
          <button
            v-wave
            class="mui-btn mt-[30px]"
            data-testid="home-create-room"
            @click="createRoom"
          >
            {{ $t('home.createRoom') }}
          </button>
        </div>
      </section>

      <section v-if="recentRooms.length" class="w-full max-w-[920px] mt-[60px]">
        <table class="w-full text-mui-table text-body">
          <thead class="text-primary">
            <tr class="text-left">
              <th class="px-3 py-3 font-medium">{{ $t('home.recentRooms') }}</th>
              <th class="px-3 py-3 font-medium">{{ $t('home.players') }}</th>
              <th class="px-3 py-3 font-medium text-right whitespace-nowrap">{{ $t('home.lastVisited') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="room in recentRooms"
              :key="room.roomId"
              class="border-t"
            >
              <td class="px-3 py-3 align-top">
                <RouterLink :to="`/${room.slug ?? room.roomId}`" class="underline hover:no-underline text-primary">
                  {{ room.name ?? room.slug ?? room.roomId }}
                </RouterLink>
              </td>
              <td class="px-3 py-3 align-top">
                <span v-if="room.playerNames.length">{{ room.playerNames.join(', ') }}</span>
                <span v-else class="text-muted">—</span>
              </td>
              <td class="px-3 py-3 align-top text-right whitespace-nowrap text-muted">
                {{ room.lastVisitedAt ? relativeTime(room.lastVisitedAt) : '—' }}
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </main>
  </div>
</template>
