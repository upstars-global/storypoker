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
}

const recentRooms = ref<RecentRoomDisplay[]>([])
const origin = ref('')

onMounted(async () => {
  origin.value = window.location.origin
  const local = listRecentRooms()
  if (local.length === 0) return

  const supabase = getSupabase()
  const ids = local.map(r => r.roomId)
  const { data } = await supabase
    .from('players')
    .select('room_id, name')
    .in('room_id', ids)
    .is('left_at', null)

  const namesByRoom: Record<string, string[]> = {}
  for (const row of data ?? []) {
    namesByRoom[row.room_id] = namesByRoom[row.room_id] ?? []
    namesByRoom[row.room_id].push(row.name)
  }

  recentRooms.value = local.map(r => ({
    ...r,
    playerNames: namesByRoom[r.roomId] ?? [],
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
  <div class="min-h-screen flex flex-col bg-[#212121] text-[#e0e0e0]">
    <header
      class="sticky top-0 z-40 flex min-h-[58px] w-full items-center bg-[#424242] px-[22px] text-white shadow-[0_2px_4px_-1px_rgba(0,0,0,.2),0_4px_5px_0_rgba(0,0,0,.14),0_1px_10px_0_rgba(0,0,0,.12)]"
    >
      <h1 class="flex-1 text-[16px] font-semibold leading-[1.6] tracking-[0.0075em] text-white">
        Story Poker
      </h1>
      <div class="flex items-center gap-[11px] text-white">
        <button
          type="button"
          class="inline-flex size-[40px] items-center justify-center rounded-full transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-white/80"
          aria-label="About Story Point Poker"
        >
          <svg class="size-[20px] fill-current" viewBox="0 0 24 24" focusable="false" aria-hidden="true">
            <path d="M11 17h2v-6h-2v6Zm1-14a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 16a7 7 0 1 1 0-14 7 7 0 0 1 0 14Zm-1-10h2V7h-2v2Z" />
          </svg>
        </button>
        <button
          type="button"
          class="inline-flex size-[40px] items-center justify-center rounded-full transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-white/80"
          aria-label="Account"
        >
          <IconAccount class="text-[24px]" />
        </button>
      </div>
    </header>

    <main class="flex flex-1 flex-col items-center px-4 pt-[26px] pb-[40px]">
      <section class="w-full max-w-[460px] text-center">
        <h2 class="m-0 text-[22px] font-bold leading-[1.235] tracking-[0.00735em] text-[#f5f5f5]">
          Create a planning poker room
        </h2>
        <p class="mt-[11px] whitespace-nowrap text-[15px] font-normal leading-[1.5] tracking-[0.00938em] text-[#e0e0e0]">
          and start estimating with your team right away
        </p>
        <div class="mt-[19px] flex flex-col items-center">
          <input
            v-model="name"
            type="text"
            placeholder="Please enter your name"
            class="h-[51px] w-full max-w-[280px] rounded border border-white/25 bg-transparent px-[14px] text-[15px] font-normal leading-[1.4375] tracking-[0.00938em] text-[#f5f5f5] placeholder:text-[#e0e0e0] placeholder:opacity-100 transition-[border-color,box-shadow] duration-200 hover:border-[#f5f5f5] focus:border-[#546e7a] focus:outline-none focus:ring-1 focus:ring-[#546e7a]"
            :class="{ 'border-[#c63f17] focus:border-[#c63f17] focus:ring-[#c63f17]': hasError }"
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
        <table class="w-full text-[14px]" style="color: #e0e0e0;">
          <thead style="color: #f5f5f5;">
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
              style="border-color: rgba(255,255,255,0.08);"
            >
              <td class="px-3 py-3 align-top">
                <NuxtLink :to="`/${room.roomId}`" class="underline hover:no-underline" style="color: #b0bec5;">
                  {{ origin }}/{{ room.roomId }}
                </NuxtLink>
              </td>
              <td class="px-3 py-3 align-top" style="color: #cfd8dc;">
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
