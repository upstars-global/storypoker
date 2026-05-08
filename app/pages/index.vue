<script setup lang="ts">
import { useRoomStore } from '~/stores/room'
import { usePlayersStore } from '~/stores/players'
import { useAuthStore } from '~/stores/auth'
import { listRecentRooms, touchRecentRoom, type RecentRoomEntry } from '~/utils/recentRooms'
import { relativeTime } from '~/utils/relativeTime'
import { getSupabase } from '~/lib/supabase-instance'

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
const headerPlayerName = computed(() => recentRooms.value[0]?.playerName ?? '')

onMounted(async () => {
  origin.value = window.location.origin
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
    namesByRoom[row.room_id] = namesByRoom[row.room_id] ?? []
    namesByRoom[row.room_id].push(row.name)
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
  <div class="min-h-screen flex flex-col bg-[var(--bg-app)] text-[var(--text-body)]">
    <AppHeader
      :online-count="0"
      :is-moderator="false"
      :player-name="headerPlayerName"
      @open-sign-in="showAuth = 'signin'"
      @open-sign-up="showAuth = 'signup'"
      @sign-out="authStore.signOut()"
    />

    <AuthModal
      v-if="showAuth"
      :mode="showAuth"
      @close="showAuth = null"
      @success="showAuth = null"
    />

    <main class="flex flex-1 flex-col items-center px-4 pt-[26px] pb-[40px]">
      <section class="w-full max-w-[460px] text-center">
        <h2 class="m-0 text-[22px] font-bold leading-[1.235] tracking-[0.00735em] text-[var(--text-primary)]">
          Create a planning poker room
        </h2>
        <p class="mt-[11px] whitespace-nowrap text-[15px] font-normal leading-[1.5] tracking-[0.00938em] text-[var(--text-body)]">
          and start estimating with your team right away
        </p>
        <div class="mt-[19px] flex flex-col items-center">
          <input
            v-model="name"
            type="text"
            placeholder="Please enter your name"
            class="mui-input h-[51px] max-w-[280px]"
            :class="{ 'is-error': hasError }"
            @keyup.enter="createRoom"
          />
          <button
            v-wave
            class="mt-[30px] inline-flex h-[46px] min-w-[180px] items-center justify-center rounded-[23px] bg-[#607d8b] px-[22px] text-[13px] font-medium uppercase leading-[1.75] tracking-[0.02857em] text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,.2),0_2px_2px_0_rgba(0,0,0,.14),0_1px_5px_0_rgba(0,0,0,.12)] transition-[background-color,box-shadow] duration-200 hover:bg-[#1c313a] hover:shadow-[0_2px_4px_-1px_rgba(0,0,0,.2),0_4px_5px_0_rgba(0,0,0,.14),0_1px_10px_0_rgba(0,0,0,.12)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#607d8b]"
            @click="createRoom"
          >
            Create Room
          </button>
        </div>
      </section>

      <section v-if="recentRooms.length" class="w-full max-w-[920px] mt-[60px]">
        <table class="w-full text-[14px]" style="color: var(--text-body);">
          <thead style="color: var(--text-primary);">
            <tr class="text-left">
              <th class="px-3 py-3 font-medium">Recent Rooms</th>
              <th class="px-3 py-3 font-medium">Players</th>
              <th class="px-3 py-3 font-medium text-right whitespace-nowrap">Last Visited</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="room in recentRooms"
              :key="room.roomId"
              class="border-t"
              style="border-color: var(--border);"
            >
              <td class="px-3 py-3 align-top">
                <NuxtLink :to="`/${room.slug ?? room.roomId}`" class="underline hover:no-underline" style="color: var(--primary);">
                  {{ room.name ?? room.slug ?? room.roomId }}
                </NuxtLink>
              </td>
              <td class="px-3 py-3 align-top">
                <span v-if="room.playerNames.length">{{ room.playerNames.join(', ') }}</span>
                <span v-else style="color: var(--text-muted);">—</span>
              </td>
              <td class="px-3 py-3 align-top text-right whitespace-nowrap" style="color: var(--text-muted);">
                {{ room.lastVisitedAt ? relativeTime(room.lastVisitedAt) : '—' }}
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </main>
  </div>
</template>
