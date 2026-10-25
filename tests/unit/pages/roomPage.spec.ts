import { describe, it, expect, afterEach, vi } from 'vitest'
import { flushPromises, shallowMount, type VueWrapper } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { createMemoryHistory, createRouter } from 'vue-router'
import type { User } from '@supabase/supabase-js'
import RoomPage from '~/pages/[slug].vue'
import AppHeader from '~/components/AppHeader.vue'
import AlignmentCard from '~/components/AlignmentCard.vue'
import CardsArea from '~/components/CardsArea.vue'
import HistoryModal from '~/components/HistoryModal.vue'
import PlayersList from '~/components/PlayersList.vue'
import ResultsArea from '~/components/ResultsArea.vue'
import { getSupabase, setSupabase, resetSupabase } from '~/lib/supabase-instance'
import { useAuthStore } from '~/stores/auth'
import { useRoomStore, type ResolvedRoom } from '~/stores/room'
import { usePlayersStore } from '~/stores/players'
import { usePresenceStore } from '~/stores/presence'
import { useProfilesStore } from '~/stores/profiles'
import { useAppUpdate } from '~/composables/useAppUpdate'
import type { Player, RoomState } from '~/stores/types'
import { asSupabase } from '../../support/helpers/fakeSupabase'

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  missingWarn: false,
  fallbackWarn: false,
  messages: { en: {} },
})

function fakeRoom(overrides: Partial<ResolvedRoom> = {}): ResolvedRoom {
  return {
    id: 'r1',
    slug: null,
    name: 'Team',
    background_url: null,
    background_updated_at: null,
    background_opacity: null,
    ...overrides,
  }
}

function fakeState(overrides: Partial<RoomState> = {}): RoomState {
  return {
    room_id: 'r1',
    phase: 'voting',
    deck_preset: 'scrum',
    active_cards: ['1', '2', '3', '5', '8'],
    round_started_at: '2026-10-21T00:00:00Z',
    paused_at: null,
    paused_elapsed_ms: 0,
    poll_question: null,
    ...overrides,
  }
}

function fakePlayer(id: string, shields: string[], vote: string | null, overrides: Partial<Player> = {}): Player {
  return {
    id,
    room_id: 'r1',
    name: id,
    is_moderator: false,
    vote,
    user_id: null,
    shields,
    created_at: '2026-10-21T00:00:00Z',
    left_at: null,
    ...overrides,
  }
}

const me = fakePlayer('me', ['dev'], null, { is_moderator: true, user_id: 'u1' })

const estimators = [
  me,
  fakePlayer('alice', ['dev'], '3'),
  fakePlayer('carol', ['dev'], '5'),
  fakePlayer('bob', ['qa'], '5'),
]

function fakeClient(players: Player[], state: RoomState) {
  const query = (data: unknown) => {
    const builder = {
      select: () => builder,
      eq: () => builder,
      order: () => Promise.resolve({ data }),
      single: () => Promise.resolve({ data }),
    }
    return builder
  }
  const channel = {
    on: (type: string, filter: { event?: string }, handler: BroadcastHandler) => {
      if (type === 'broadcast' && filter.event) broadcastHandlers.set(filter.event, handler)
      return channel
    },
    subscribe: () => channel,
    unsubscribe: vi.fn(),
    send: vi.fn(),
  }
  return asSupabase({
    from: (table: string) => query(table === 'players' ? players : state),
    channel: () => channel,
  })
}

type BroadcastHandler = (message: { payload?: Record<string, unknown> }) => void
const broadcastHandlers = new Map<string, BroadcastHandler>()

let wrapper: VueWrapper | null = null

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  resetSupabase()
  localStorage.clear()
})

async function mountRoom(options: {
  players?: Player[]
  state?: RoomState
  room?: ResolvedRoom | null
  user?: User | null
} = {}) {
  const players = options.players ?? estimators
  const state = options.state ?? fakeState({ phase: 'revealed' })
  const user = options.user === undefined ? ({ id: 'u1' } as User) : options.user
  setSupabase(fakeClient(players, state))

  const authStore = useAuthStore()
  vi.spyOn(authStore, 'init').mockImplementation(async () => { authStore.user = user })
  vi.spyOn(useRoomStore(), 'resolveRoom').mockResolvedValue(options.room === undefined ? fakeRoom() : options.room)
  const playersStore = usePlayersStore()
  vi.spyOn(playersStore, 'findExistingPlayer').mockResolvedValue(me)
  vi.spyOn(playersStore, 'rejoin').mockResolvedValue(me)
  vi.spyOn(usePresenceStore(), 'start').mockResolvedValue()
  vi.spyOn(usePresenceStore(), 'stop').mockResolvedValue()
  vi.spyOn(useProfilesStore(), 'fetchMany').mockResolvedValue()

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/:slug', component: RoomPage },
    ],
  })
  await router.push('/r1')
  await router.isReady()

  wrapper = shallowMount(RoomPage, {
    global: { plugins: [router, i18n], directives: { wave: {} } },
  })
  await flushPromises()
  await flushPromises()
  return wrapper
}

function blockLabels(page: VueWrapper) {
  return page.findComponent(AlignmentCard).props('blocks').map((block: { label: string }) => block.label)
}

describe('room page timer', () => {
  afterEach(() => vi.useRealTimers())

  async function setOnline(ids: string[]) {
    usePresenceStore().online = new Set(ids)
    await flushPromises()
  }

  it('restarts a voting round timer past the cap once a second player is online', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-24T09:00:00Z'))
    const resetTimer = vi.spyOn(useRoomStore(), 'resetTimer').mockResolvedValue()
    await mountRoom({ state: fakeState({ phase: 'voting' }) })
    await setOnline(['me'])
    expect(resetTimer).not.toHaveBeenCalled()
    const from = vi.spyOn(getSupabase(), 'from')
    await setOnline(['me', 'alice'])
    expect(resetTimer).toHaveBeenCalledTimes(1)
    expect(resetTimer).toHaveBeenCalledWith('2026-10-21T00:00:00Z')
    expect(from).toHaveBeenCalledWith('room_state')
  })

  it('does not restart on room state changes while nobody new comes online', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-21T00:30:00Z'))
    const resetTimer = vi.spyOn(useRoomStore(), 'resetTimer').mockResolvedValue()
    await mountRoom({ state: fakeState({ phase: 'voting' }) })
    await setOnline(['me', 'alice'])
    vi.setSystemTime(new Date('2026-10-21T01:30:00Z'))
    useRoomStore().roomState = fakeState({ phase: 'voting', paused_at: '2026-10-21T01:30:00Z' })
    await flushPromises()
    await setOnline(['me'])
    expect(resetTimer).not.toHaveBeenCalled()
    await setOnline(['me', 'alice', 'bob'])
    expect(resetTimer).toHaveBeenCalledTimes(1)
  })

  it('keeps a fresh voting round timer and a revealed round untouched', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-21T00:30:00Z'))
    const resetTimer = vi.spyOn(useRoomStore(), 'resetTimer').mockResolvedValue()
    await mountRoom({ state: fakeState({ phase: 'voting' }) })
    await setOnline(['me', 'alice'])
    wrapper?.unmount()
    await setOnline([])
    vi.setSystemTime(new Date('2026-10-24T09:00:00Z'))
    await mountRoom({ state: fakeState({ phase: 'revealed' }) })
    await setOnline(['me', 'alice'])
    expect(resetTimer).not.toHaveBeenCalled()
  })
})

describe('room page results', () => {
  it('splits revealed votes into cohort groups for ResultsArea and AlignmentCard', async () => {
    const page = await mountRoom()
    expect(page.findComponent(ResultsArea).props('groups')).toEqual([
      { label: 'DEV', votes: { '3': 1, '5': 1 } },
      { label: 'QA', votes: { '5': 1 } },
    ])
    expect(page.findComponent(ResultsArea).props('votes')).toEqual({ '3': 1, '5': 2 })
    expect(blockLabels(page)).toContain('DEV')
    expect(blockLabels(page)).not.toContain('results.general')
  })

  it('falls back to a single all-votes circle when no voter has a cohort', async () => {
    const page = await mountRoom({
      players: [me, fakePlayer('dan', ['po'], '3'), fakePlayer('erin', ['sm'], '5')],
    })
    expect(page.findComponent(ResultsArea).props('groups')).toBeNull()
    expect(blockLabels(page)).toEqual(['results.general'])
  })

  it('counts a voter without a role as DEV', async () => {
    const page = await mountRoom({
      players: [me, fakePlayer('frank', [], '3'), fakePlayer('bob', ['qa'], '5')],
    })
    expect(page.findComponent(ResultsArea).props('groups')).toEqual([
      { label: 'DEV', votes: { '3': 1 } },
      { label: 'QA', votes: { '5': 1 } },
    ])
  })

  it('hides votes of players whose cohort is not shown', async () => {
    const page = await mountRoom({ state: fakeState({ phase: 'revealed', result_cohorts: ['QA'] }) })
    expect(Array.from(page.findComponent(PlayersList).props('hiddenVotePlayerIds') ?? []).sort()).toEqual(['alice', 'carol', 'me'])
  })

  it('keeps the revealed groups for the last-round view after a new round starts', async () => {
    const page = await mountRoom({ state: fakeState({ phase: 'voting' }) })
    const roomStore = useRoomStore()
    const playersStore = usePlayersStore()

    roomStore.roomState = fakeState({ phase: 'revealed' })
    await flushPromises()
    playersStore.players = estimators.map(p => ({ ...p, vote: null }))
    roomStore.roomState = fakeState({ phase: 'voting' })
    await flushPromises()
    expect(page.findComponent(ResultsArea).exists()).toBe(false)

    page.findComponent(CardsArea).vm.$emit('toggle-last-round')
    await flushPromises()
    const lastRound = page.findComponent(ResultsArea)
    expect(lastRound.props('groups')).toEqual([
      { label: 'DEV', votes: { '3': 1, '5': 1 } },
      { label: 'QA', votes: { '5': 1 } },
    ])
    expect(lastRound.props('showNewRound')).toBe(false)
    expect(blockLabels(page)).toContain('DEV')
  })

  it('opens HistoryModal from the header', async () => {
    const page = await mountRoom()
    expect(page.findComponent(HistoryModal).exists()).toBe(false)
    page.findComponent(AppHeader).vm.$emit('open-history')
    await flushPromises()
    expect(page.findComponent(HistoryModal).exists()).toBe(true)
  })
})

describe('room page background permission', () => {
  it('lets any signed-in moderator edit the background', async () => {
    const page = await mountRoom()
    expect(page.findComponent(AppHeader).props('canEditRoomBackground')).toBe(true)
  })

  it('blocks a signed-in player who is not a moderator', async () => {
    const page = await mountRoom({ players: [{ ...me, is_moderator: false }] })
    expect(page.findComponent(AppHeader).props('canEditRoomBackground')).toBe(false)
  })

  it('blocks an anonymous moderator', async () => {
    const page = await mountRoom({ user: null })
    expect(page.findComponent(AppHeader).props('canEditRoomBackground')).toBe(false)
  })
})

describe('room page not found', () => {
  it('shows the not-found view when the room does not resolve', async () => {
    const page = await mountRoom({ room: null })
    expect(page.find('[data-testid="room-root"]').exists()).toBe(false)
    expect(page.text()).toContain('room.notFoundTitle')
  })
})

describe('room page update hold', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('applies a pending update only after the countdown reveal is saved', async () => {
    const page = await mountRoom({ state: fakeState() })
    let finishReveal = () => {}
    vi.spyOn(useRoomStore(), 'reveal').mockReturnValue(new Promise<void>((resolve) => { finishReveal = resolve }))
    vi.useFakeTimers()
    broadcastHandlers.get('start')?.({ payload: { initiatorId: me.id, mode: 'silent' } })
    await page.vm.$nextTick()

    const apply = vi.fn()
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    useAppUpdate().scheduleUpdate(apply)
    await vi.advanceTimersByTimeAsync(10_000)
    expect(useRoomStore().reveal).toHaveBeenCalledOnce()
    expect(apply).not.toHaveBeenCalled()

    finishReveal()
    await vi.advanceTimersByTimeAsync(0)
    expect(apply).toHaveBeenCalledOnce()
  })
})
