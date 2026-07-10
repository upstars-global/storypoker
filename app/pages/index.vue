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
import { roundAlignment } from '~/utils/roundStats'
import type { RoundHistory } from '~/stores/types'
import { getSupabase } from '~/lib/supabase-instance'
import AppHeader from '~/components/AppHeader.vue'
import AuthModal from '~/components/AuthModal.vue'
import UserSettingsModal from '~/components/UserSettingsModal.vue'

const name = shallowRef('')
const hasError = shallowRef(false)
const nameInput = ref<HTMLInputElement | null>(null)
const router = useRouter()
const roomStore = useRoomStore()
const playersStore = usePlayersStore()
const authStore = useAuthStore()

interface RecentRoomDisplay extends RecentRoomEntry {
  playerNames: string[]
  slug: string | null
  name: string | null
  roundsCount: number
  alignment: number | null
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
  nameInput.value?.focus()
  await authStore.init()
  if (user.value?.id) await profilesStore.fetchOne(user.value.id)
  const local = listRecentRooms()
  if (local.length === 0) return

  const supabase = getSupabase()
  const ids = local.map(r => r.roomId)
  const [{ data: playersData }, { data: roomsData }, { data: historyData }] = await Promise.all([
    supabase.from('players').select('id, room_id, name, shields').in('room_id', ids).is('left_at', null),
    supabase.from('rooms').select('id, slug, name').in('id', ids),
    supabase.from('round_history').select('*').in('room_id', ids),
  ])

  const namesByRoom: Record<string, string[]> = {}
  const shieldsByPlayer = new Map<string, string[]>()
  for (const row of playersData ?? []) {
    if (!row.room_id) continue
    const names = namesByRoom[row.room_id] ?? []
    names.push(row.name)
    namesByRoom[row.room_id] = names
    shieldsByPlayer.set(row.id, row.shields ?? [])
  }

  const slugByRoom: Record<string, { slug: string | null; name: string | null }> = {}
  for (const row of roomsData ?? []) {
    slugByRoom[row.id] = { slug: row.slug ?? null, name: row.name ?? null }
  }

  const roundsByRoom: Record<string, RoundHistory[]> = {}
  for (const row of (historyData ?? []) as RoundHistory[]) {
    if (!row.room_id) continue
    const rounds = roundsByRoom[row.room_id] ?? []
    rounds.push(row)
    roundsByRoom[row.room_id] = rounds
  }

  function avgAlignment(rounds: RoundHistory[]): number | null {
    const scores: number[] = []
    for (const round of rounds) {
      const score = roundAlignment(round, shieldsByPlayer)
      if (score !== null) scores.push(score)
    }
    if (!scores.length) return null
    return Math.round(scores.reduce((s, v) => s + v, 0) / scores.length)
  }

  recentRooms.value = local.map(r => {
    const rounds = roundsByRoom[r.roomId] ?? []
    return {
      ...r,
      playerNames: namesByRoom[r.roomId] ?? [],
      slug: slugByRoom[r.roomId]?.slug ?? null,
      name: slugByRoom[r.roomId]?.name ?? null,
      roundsCount: rounds.length,
      alignment: avgAlignment(rounds),
    }
  })
})

function alignmentColor(a: number): string {
  if (a >= 60) return '#43a047'
  if (a >= 40) return '#fbc02d'
  return '#e64a19'
}

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
          <div
            class="mui-field w-full max-w-[360px] text-left"
            style="--field-label-bg: var(--bg-app);"
          >
            <input
              id="home-name"
              ref="nameInput"
              v-model="name"
              type="text"
              name="name"
              autocomplete="off"
              placeholder=" "
              class="mui-input h-[51px] w-full"
              :class="{ 'is-error': hasError }"
              data-testid="home-name-input"
              @keyup.enter="createRoom"
            >
            <label
              for="home-name"
              class="mui-field-label"
            >
              {{ $t('home.nameLabel') }}
            </label>
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

      <section
        v-if="recentRooms.length"
        class="w-full max-w-[920px] mt-[60px]"
      >
        <table class="w-full text-mui-table text-body">
          <thead class="text-primary">
            <tr class="text-left">
              <th class="px-3 py-3 font-medium">
                {{ $t('home.recentRooms') }}
              </th>
              <th class="px-3 py-3 font-medium">
                {{ $t('home.players') }}
              </th>
              <th class="px-3 py-3 font-medium whitespace-nowrap">
                {{ $t('home.rounds') }}
              </th>
              <th class="px-3 py-3 font-medium whitespace-nowrap">
                {{ $t('home.alignment') }}
              </th>
              <th class="px-3 py-3 font-medium text-right whitespace-nowrap">
                {{ $t('home.lastVisited') }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="room in recentRooms"
              :key="room.roomId"
              class="border-t"
            >
              <td class="px-3 py-3 align-top">
                <RouterLink
                  :to="`/${room.slug ?? room.roomId}`"
                  class="underline hover:no-underline text-primary"
                >
                  {{ room.name ?? room.slug ?? room.roomId }}
                </RouterLink>
              </td>
              <td class="px-3 py-3 align-top">
                <span v-if="room.playerNames.length">{{ room.playerNames.join(', ') }}</span>
                <span
                  v-else
                  class="text-muted"
                >—</span>
              </td>
              <td class="px-3 py-3 align-top whitespace-nowrap tabular-nums">
                <span v-if="room.roundsCount">{{ room.roundsCount }}</span>
                <span
                  v-else
                  class="text-muted"
                >—</span>
              </td>
              <td class="px-3 py-3 align-top whitespace-nowrap tabular-nums">
                <span
                  v-if="room.alignment !== null"
                  class="font-semibold"
                  :style="{ color: alignmentColor(room.alignment) }"
                >{{ room.alignment }}</span>
                <span
                  v-else
                  class="text-muted"
                >—</span>
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
