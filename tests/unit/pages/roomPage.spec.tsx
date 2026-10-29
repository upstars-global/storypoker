import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import type { User } from '@supabase/supabase-js'
import { i18n } from '~/i18n'
import RoomPage from '~/pages/[slug]'
import AppHeader from '~/components/AppHeader'
import AlignmentCard from '~/components/AlignmentCard'
import CardsArea from '~/components/CardsArea'
import ConfigureCardDeckModal from '~/components/ConfigureCardDeckModal'
import PlayerEditModal from '~/components/PlayerEditModal'
import JoinOverlay from '~/components/JoinOverlay'
import PlayersList from '~/components/PlayersList'
import ResultsArea from '~/components/ResultsArea'
import SlotMachine from '~/components/SlotMachine'
import Timer from '~/components/Timer'
import { resetSupabase, setSupabase } from '~/lib/supabase-instance'
import { appUpdateStore } from '~/hooks/useAppUpdate'
import { useAuthStore } from '~/stores/auth'
import { usePlayersStore } from '~/stores/players'
import { usePresenceStore } from '~/stores/presence'
import { useProfilesStore } from '~/stores/profiles'
import { useRoomStore, type ResolvedRoom } from '~/stores/room'
import type { Player, RoomState } from '~/stores/types'
import { alignmentScore } from '~/utils/alignment'
import { asSupabase } from '../../support/helpers/fakeSupabase'
import { resetStores } from '../../support/helpers/resetStores'

vi.mock('~/components/AppHeader', () => ({ default: vi.fn(() => <header data-testid="app-header" />) }))
vi.mock('~/components/AlignmentCard', () => ({ default: vi.fn(() => <div data-testid="alignment-card" />) }))
vi.mock('~/components/CardsArea', () => ({ default: vi.fn(() => <div data-testid="cards-area" />) }))
vi.mock('~/components/JoinOverlay', () => ({ default: vi.fn(() => <div data-testid="join-overlay" />) }))
vi.mock('~/components/PlayersList', () => ({ default: vi.fn(() => <div data-testid="players-list" />) }))
vi.mock('~/components/ResultsArea', () => ({ default: vi.fn(() => <div data-testid="results-area" />) }))
vi.mock('~/components/ConfigureCardDeckModal', () => ({ default: vi.fn(() => <div data-testid="card-deck-modal" />) }))
vi.mock('~/components/PlayerEditModal', () => ({ default: vi.fn(() => <div data-testid="player-edit-modal" />) }))
vi.mock('~/components/HistoryModal', () => ({ default: vi.fn(() => <div data-testid="history-modal" />) }))
vi.mock('~/components/Timer', () => ({ default: vi.fn(() => <div data-testid="timer-widget" />) }))
vi.mock('~/components/SlotMachine', () => ({ default: vi.fn(() => <div data-testid="slot-machine" />) }))

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

type BroadcastHandler = (message: { payload?: Record<string, unknown> }) => void
const broadcastHandlers = new Map<string, BroadcastHandler>()

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
  const from = vi.fn((table: string) => query(table === 'players' ? players : state))
  return { client: asSupabase({ from, channel: () => channel }), from, send: channel.send, unsubscribe: channel.unsubscribe }
}

function LocationProbe() {
  const location = useLocation()
  return <output data-testid="location">{location.pathname}</output>
}

const mocks = {
  rejoin: vi.fn(),
  findExistingPlayer: vi.fn(),
  linkUser: vi.fn(),
  presenceStart: vi.fn(),
  presenceStop: vi.fn(),
  fetchMany: vi.fn(),
  resolveRoom: vi.fn(),
  from: vi.fn(),
  send: vi.fn(),
  unsubscribe: vi.fn(),
}

async function flush() {
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0))
  })
}

async function mountRoom(options: {
  players?: Player[]
  state?: RoomState
  room?: ResolvedRoom | null
  user?: User | null
  path?: string
  rejoin?: (id: string) => Promise<Player>
  existing?: Player | null
} = {}) {
  const players = options.players ?? estimators
  const state = options.state ?? fakeState({ phase: 'revealed' })
  const user = options.user === undefined ? ({ id: 'u1' } as User) : options.user
  const { client, from, send, unsubscribe } = fakeClient(players, state)
  setSupabase(client)
  mocks.from = from
  mocks.send = send
  mocks.unsubscribe = unsubscribe

  mocks.resolveRoom = vi.fn().mockResolvedValue(options.room === undefined ? fakeRoom() : options.room)
  mocks.rejoin = vi.fn(options.rejoin ?? (async () => me))
  mocks.findExistingPlayer = vi.fn().mockResolvedValue(options.existing === undefined ? me : options.existing)
  mocks.linkUser = vi.fn().mockResolvedValue(undefined)
  mocks.presenceStart = vi.fn().mockResolvedValue(undefined)
  mocks.presenceStop = vi.fn().mockResolvedValue(undefined)
  mocks.fetchMany = vi.fn().mockResolvedValue(undefined)

  useAuthStore.setState({ init: vi.fn(async () => { useAuthStore.setState({ user }) }) })
  useRoomStore.setState({ resolveRoom: mocks.resolveRoom })
  usePlayersStore.setState({ rejoin: mocks.rejoin, findExistingPlayer: mocks.findExistingPlayer, linkUser: mocks.linkUser })
  usePresenceStore.setState({ start: mocks.presenceStart, stop: mocks.presenceStop })
  useProfilesStore.setState({ fetchMany: mocks.fetchMany })

  const result = render(
    <MemoryRouter initialEntries={[options.path ?? '/r1']}>
      <Routes>
        <Route path="/" element={<LocationProbe />} />
        <Route path="/:slug" element={<><RoomPage /><LocationProbe /></>} />
      </Routes>
    </MemoryRouter>,
  )
  await flush()
  await flush()
  return result
}

function lastProps<P>(component: (props: P) => unknown): P {
  const call = vi.mocked(component).mock.lastCall
  if (!call) throw new Error('component was not rendered')
  return call[0]
}

function blockLabels() {
  return lastProps(AlignmentCard).blocks.map(block => block.label)
}

async function setOnline(ids: string[]) {
  await act(async () => {
    usePresenceStore.setState({ online: new Set(ids) })
  })
  await flush()
}

beforeEach(async () => {
  vi.clearAllMocks()
  broadcastHandlers.clear()
  resetSupabase()
  await resetStores()
  localStorage.clear()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
  resetSupabase()
  localStorage.clear()
})

describe('room page session restore', () => {
  it('a Vue-format session from localStorage returns the player under the same playerId', async () => {
    const vuePlayer = fakePlayer('vue-p7', ['qa'], null, { name: 'Vue Player' })
    localStorage.setItem('storypoker_session_r1', JSON.stringify({
      playerId: 'vue-p7',
      playerName: 'Vue Player',
      lastVisitedAt: '2026-10-20T08:00:00.000Z',
    }))
    await mountRoom({ players: [...estimators, vuePlayer], rejoin: async () => vuePlayer })

    expect(mocks.rejoin).toHaveBeenCalledWith('vue-p7')
    expect(mocks.findExistingPlayer).not.toHaveBeenCalled()
    expect(mocks.presenceStart).toHaveBeenCalledWith('r1', 'vue-p7')
    expect(lastProps(PlayersList).currentPlayerId).toBe('vue-p7')
    expect(screen.queryByTestId('join-overlay')).toBeNull()
    expect(JSON.parse(localStorage.getItem('storypoker_session_r1')!)).toMatchObject({
      playerId: 'vue-p7',
      playerName: 'Vue Player',
    })
  })

  it('falls back to an existing player of the signed-in user without a session', async () => {
    await mountRoom()
    expect(mocks.findExistingPlayer).toHaveBeenCalledWith('r1', 'u1')
    expect(mocks.rejoin).toHaveBeenCalledWith('me')
    expect(mocks.presenceStart).toHaveBeenCalledWith('r1', 'me')
    expect(lastProps(PlayersList).currentPlayerId).toBe('me')
  })

  it('shows the join overlay when no player can be restored', async () => {
    localStorage.setItem('storypoker_session_r1', JSON.stringify({ playerId: 'gone', playerName: 'Gone' }))
    await mountRoom({ existing: null, rejoin: async () => { throw new Error('missing') } })
    expect(mocks.rejoin).toHaveBeenCalledWith('gone')
    expect(mocks.presenceStart).not.toHaveBeenCalled()
    expect(screen.getByTestId('join-overlay')).toBeTruthy()
    expect(lastProps(JoinOverlay).roomName).toBe('Team')
  })

  it('redirects a room id URL to its alias', async () => {
    await mountRoom({ room: fakeRoom({ slug: 'team' }) })
    expect(screen.getByTestId('location').textContent).toBe('/team')
  })
})

describe('room page timer', () => {
  it('restarts a voting round timer past the cap once a second player is online', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-24T09:00:00Z'))
    const resetTimer = vi.fn().mockResolvedValue(undefined)
    await mountRoom({ state: fakeState({ phase: 'voting' }) })
    useRoomStore.setState({ resetTimer })
    await setOnline(['me'])
    expect(resetTimer).not.toHaveBeenCalled()
    mocks.from.mockClear()
    await setOnline(['me', 'alice'])
    expect(resetTimer).toHaveBeenCalledTimes(1)
    expect(resetTimer).toHaveBeenCalledWith('2026-10-21T00:00:00Z')
    expect(mocks.from).toHaveBeenCalledWith('room_state')
  })

  it('does not restart on room state changes while nobody new comes online', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-21T00:30:00Z'))
    const resetTimer = vi.fn().mockResolvedValue(undefined)
    await mountRoom({ state: fakeState({ phase: 'voting' }) })
    useRoomStore.setState({ resetTimer })
    await setOnline(['me', 'alice'])
    vi.setSystemTime(new Date('2026-10-21T01:30:00Z'))
    await act(async () => {
      useRoomStore.setState({ roomState: fakeState({ phase: 'voting', paused_at: '2026-10-21T01:30:00Z' }) })
    })
    await setOnline(['me'])
    expect(resetTimer).not.toHaveBeenCalled()
    await setOnline(['me', 'alice', 'bob'])
    expect(resetTimer).toHaveBeenCalledTimes(1)
  })

  it('keeps a fresh voting round timer and a revealed round untouched', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-21T00:30:00Z'))
    const resetTimer = vi.fn().mockResolvedValue(undefined)
    await mountRoom({ state: fakeState({ phase: 'voting' }) })
    useRoomStore.setState({ resetTimer })
    await setOnline(['me', 'alice'])
    cleanup()
    await setOnline([])
    vi.setSystemTime(new Date('2026-10-24T09:00:00Z'))
    await mountRoom({ state: fakeState({ phase: 'revealed' }) })
    useRoomStore.setState({ resetTimer })
    await setOnline(['me', 'alice'])
    expect(resetTimer).not.toHaveBeenCalled()
  })
})

describe('room page side widget', () => {
  const voting = fakeState({ phase: 'voting' })

  function slotEvents() {
    return mocks.send.mock.calls.map(([message]) => message).filter(message => String(message.event).startsWith('slot-'))
  }

  it('shows the timer by default with the room timer state and moderator controls', async () => {
    await mountRoom({ state: fakeState({ phase: 'voting', paused_at: '2026-10-21T00:05:00Z', paused_elapsed_ms: 1000, alarm_minutes: 7, alarm_muted: true }) })
    expect(screen.queryByTestId('slot-machine')).toBeNull()
    expect(lastProps(Timer)).toMatchObject({
      roundStartedAt: '2026-10-21T00:00:00Z',
      phase: 'voting',
      pausedAt: '2026-10-21T00:05:00Z',
      pausedElapsedMs: 1000,
      canControl: true,
      alarmMinutes: 7,
      alarmMuted: true,
    })
  })

  it('routes timer controls and alarm changes to the room store', async () => {
    await mountRoom({ state: voting })
    const room = {
      resetTimer: vi.fn().mockResolvedValue(undefined),
      pauseTimer: vi.fn().mockResolvedValue(undefined),
      resumeTimer: vi.fn().mockResolvedValue(undefined),
      adjustTimer: vi.fn().mockResolvedValue(undefined),
      setAlarm: vi.fn().mockResolvedValue(undefined),
    }
    useRoomStore.setState(room)
    const timer = lastProps(Timer)
    timer.onReset()
    timer.onPause()
    timer.onResume()
    timer.onAdjust(-30000)
    timer.onUpdateAlarm({ minutes: 10 })
    expect(room.resetTimer).toHaveBeenCalledWith()
    expect(room.pauseTimer).toHaveBeenCalledOnce()
    expect(room.resumeTimer).toHaveBeenCalledOnce()
    expect(room.adjustTimer).toHaveBeenCalledWith(-30000)
    expect(room.setAlarm).toHaveBeenCalledWith({ minutes: 10 })
  })

  it('switches to the slot machine, remembers it and opens with it next time', async () => {
    await mountRoom({ state: voting })
    await act(async () => {
      lastProps(Timer).onSwitchWidget()
    })
    expect(screen.queryByTestId('timer-widget')).toBeNull()
    expect(screen.getByTestId('slot-machine')).toBeTruthy()
    expect(localStorage.getItem('sp-side-widget')).toBe('slot')
    cleanup()

    await mountRoom({ state: voting })
    expect(screen.getByTestId('slot-machine')).toBeTruthy()
    await act(async () => {
      lastProps(SlotMachine).onSwitchWidget()
    })
    expect(screen.getByTestId('timer-widget')).toBeTruthy()
    expect(localStorage.getItem('sp-side-widget')).toBe('timer')
  })

  it('counts spins down per round, broadcasts them and resets on a new round', async () => {
    localStorage.setItem('sp-side-widget', 'slot')
    await mountRoom({ state: voting })
    expect(lastProps(SlotMachine).spinsLeft).toBe(3)
    await act(async () => {
      lastProps(SlotMachine).onSpin()
    })
    expect(lastProps(SlotMachine).spinsLeft).toBe(2)
    lastProps(SlotMachine).onSpinEnd()
    lastProps(SlotMachine).onWin()
    expect(slotEvents()).toEqual([
      { type: 'broadcast', event: 'slot-spin-start', payload: { playerId: 'me' } },
      { type: 'broadcast', event: 'slot-spin-end', payload: { playerId: 'me' } },
      { type: 'broadcast', event: 'slot-win', payload: { playerId: 'me' } },
    ])
    await act(async () => {
      useRoomStore.setState({ roomState: fakeState({ phase: 'voting', round_started_at: '2026-10-21T01:00:00Z' }) })
    })
    expect(lastProps(SlotMachine).spinsLeft).toBe(3)
  })

  it('gives PO and SM five spins and lets them spin regardless of votes', async () => {
    localStorage.setItem('sp-side-widget', 'slot')
    const po = fakePlayer('me', ['po'], null, { is_moderator: true })
    await mountRoom({ state: fakeState({ phase: 'revealed' }), players: [po, fakePlayer('alice', ['dev'], null)], rejoin: async () => po, existing: po })
    expect(lastProps(SlotMachine)).toMatchObject({ spinsLeft: 5, canSpin: true })
  })

  it('lets other players spin only after their own vote while someone has not voted', async () => {
    localStorage.setItem('sp-side-widget', 'slot')
    await mountRoom({ state: voting })
    expect(lastProps(SlotMachine).canSpin).toBe(false)
    await act(async () => {
      usePlayersStore.setState({ players: estimators.map(p => (p.id === 'me' ? { ...p, vote: '3' } : p.id === 'bob' ? { ...p, vote: null } : p)) })
    })
    expect(lastProps(SlotMachine).canSpin).toBe(true)
    await act(async () => {
      usePlayersStore.setState({ players: estimators.map(p => (p.id === 'me' ? { ...p, vote: '3' } : p)) })
    })
    expect(lastProps(SlotMachine).canSpin).toBe(false)
    await act(async () => {
      useRoomStore.setState({ roomState: fakeState({ phase: 'revealed' }) })
    })
    expect(lastProps(SlotMachine).canSpin).toBe(false)
  })
})

describe('room page results', () => {
  it('splits revealed votes into cohort groups for ResultsArea and AlignmentCard', async () => {
    await mountRoom()
    expect(lastProps(ResultsArea).groups).toEqual([
      { label: 'DEV', votes: { '3': 1, '5': 1 } },
      { label: 'QA', votes: { '5': 1 } },
    ])
    expect(lastProps(ResultsArea).votes).toEqual({ '3': 1, '5': 2 })
    const deck = ['1', '2', '3', '5', '8']
    expect(lastProps(AlignmentCard).blocks).toEqual([{ label: 'DEV', value: alignmentScore({ '3': 1, '5': 1 }, deck) }])
  })

  it('falls back to a single all-votes circle when no voter has a cohort', async () => {
    await mountRoom({
      players: [me, fakePlayer('dan', ['custom:Design'], '3'), fakePlayer('erin', ['custom:UX'], '5')],
    })
    expect(lastProps(ResultsArea).groups).toBeNull()
    expect(blockLabels()).toEqual([i18n.t('results.general')])
  })

  it('shows PO and SM in their own circles', async () => {
    await mountRoom({
      players: [me, fakePlayer('dan', ['po'], '3'), fakePlayer('erin', ['sm'], '5')],
    })
    expect(lastProps(ResultsArea).groups).toEqual([
      { label: 'PO', votes: { '3': 1 } },
      { label: 'SM', votes: { '5': 1 } },
    ])
  })

  it('counts a voter without a role as DEV', async () => {
    await mountRoom({
      players: [me, fakePlayer('frank', [], '3'), fakePlayer('bob', ['qa'], '5')],
    })
    expect(lastProps(ResultsArea).groups).toEqual([
      { label: 'DEV', votes: { '3': 1 } },
      { label: 'QA', votes: { '5': 1 } },
    ])
  })

  it('hides votes of players whose cohort is not shown', async () => {
    await mountRoom({ state: fakeState({ phase: 'revealed', result_cohorts: ['QA'] }) })
    expect(Array.from(lastProps(PlayersList).hiddenVotePlayerIds ?? []).sort()).toEqual(['alice', 'carol', 'me'])
  })

  it('keeps the revealed groups for the last-round view after a new round starts', async () => {
    await mountRoom({ state: fakeState({ phase: 'voting' }) })

    await act(async () => {
      useRoomStore.setState({ roomState: fakeState({ phase: 'revealed' }) })
    })
    await act(async () => {
      usePlayersStore.setState({ players: estimators.map(p => ({ ...p, vote: null })) })
      useRoomStore.setState({ roomState: fakeState({ phase: 'voting' }) })
    })
    expect(screen.queryByTestId('results-area')).toBeNull()

    await act(async () => {
      lastProps(CardsArea).onToggleLastRound()
    })
    const lastRound = lastProps(ResultsArea)
    expect(lastRound.groups).toEqual([
      { label: 'DEV', votes: { '3': 1, '5': 1 } },
      { label: 'QA', votes: { '5': 1 } },
    ])
    expect(lastRound.showNewRound).toBe(false)
    expect(blockLabels()).toContain('DEV')
  })

  it('plays the decision sound when a round is revealed with consensus', async () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
    await mountRoom({
      state: fakeState({ phase: 'voting' }),
      players: [me, fakePlayer('alice', ['dev'], '5'), fakePlayer('carol', ['dev'], '5')],
    })
    expect(play).not.toHaveBeenCalled()
    await act(async () => {
      useRoomStore.setState({ roomState: fakeState({ phase: 'revealed' }) })
    })
    expect(play).toHaveBeenCalledTimes(1)
  })

  it('opens HistoryModal from the header', async () => {
    await mountRoom()
    expect(screen.queryByTestId('history-modal')).toBeNull()
    await act(async () => {
      lastProps(AppHeader).onOpenHistory?.()
    })
    expect(screen.getByTestId('history-modal')).toBeTruthy()
  })

  it('saves a changed deck preset, cards and cohorts from the deck modal', async () => {
    await mountRoom({ state: fakeState({ phase: 'voting' }) })
    const setDeckPreset = vi.fn().mockResolvedValue(undefined)
    const saveCardDeck = vi.fn().mockResolvedValue(undefined)
    const setResultCohorts = vi.fn().mockResolvedValue(undefined)
    useRoomStore.setState({ setDeckPreset, saveCardDeck, setResultCohorts })
    await act(async () => {
      lastProps(AppHeader).onOpenCardDeck?.()
    })
    expect(lastProps(ConfigureCardDeckModal)).toMatchObject({ deckPreset: 'scrum', activeCards: ['1', '2', '3', '5', '8'] })
    await act(async () => {
      lastProps(ConfigureCardDeckModal).onSave({ deckPreset: 'fibonacci', cards: ['1', '2'], cohorts: ['DEV', 'BE', 'QA'] })
    })
    expect(setDeckPreset).toHaveBeenCalledWith('fibonacci')
    expect(saveCardDeck).toHaveBeenCalledWith(['1', '2'])
    expect(setResultCohorts).toHaveBeenCalledWith(['DEV', 'BE', 'QA'])
    expect(screen.queryByTestId('card-deck-modal')).toBeNull()
  })

  it('renames and re-roles a player from the edit modal', async () => {
    await mountRoom()
    const rename = vi.fn().mockResolvedValue(undefined)
    const setShields = vi.fn().mockResolvedValue(undefined)
    usePlayersStore.setState({ rename, setShields })
    await act(async () => {
      lastProps(PlayersList).onEdit('alice')
      await new Promise(resolve => requestAnimationFrame(resolve))
    })
    expect(lastProps(PlayerEditModal)).toMatchObject({ name: 'alice', shields: ['dev'] })
    await act(async () => {
      lastProps(PlayerEditModal).onSave({ name: 'Alice', shields: ['qa'] })
    })
    expect(rename).toHaveBeenCalledWith('alice', 'Alice')
    expect(setShields).toHaveBeenCalledWith('alice', ['qa'])
    expect(screen.queryByTestId('player-edit-modal')).toBeNull()
  })
})

describe('room page account link', () => {
  const anonymousMe = { ...me, user_id: null }

  it('links a restored anonymous player to the signed-in user', async () => {
    await mountRoom({ players: [anonymousMe], rejoin: async () => anonymousMe, existing: anonymousMe })
    expect(mocks.linkUser).toHaveBeenCalledOnce()
    expect(mocks.linkUser).toHaveBeenCalledWith('me', 'u1')
  })

  it('leaves a player that already has a user untouched', async () => {
    await mountRoom()
    expect(mocks.linkUser).not.toHaveBeenCalled()
  })

  it('does not link without a signed-in user', async () => {
    await mountRoom({ user: null, players: [anonymousMe], rejoin: async () => anonymousMe, existing: anonymousMe })
    expect(mocks.linkUser).not.toHaveBeenCalled()
  })
})

describe('room page background permission', () => {
  it('lets any signed-in moderator edit the background', async () => {
    await mountRoom()
    expect(lastProps(AppHeader).canEditRoomBackground).toBe(true)
  })

  it('blocks a signed-in player who is not a moderator', async () => {
    await mountRoom({ players: [{ ...me, is_moderator: false }], rejoin: async () => ({ ...me, is_moderator: false }) })
    expect(lastProps(AppHeader).canEditRoomBackground).toBe(false)
  })

  it('blocks an anonymous moderator', async () => {
    await mountRoom({ user: null })
    expect(lastProps(AppHeader).canEditRoomBackground).toBe(false)
  })
})

describe('room page not found', () => {
  it('shows the not-found view when the room does not resolve', async () => {
    const { container } = await mountRoom({ room: null })
    expect(container.querySelector('[data-testid="room-root"]')).toBeNull()
    expect(container.textContent).toContain(i18n.t('room.notFoundTitle'))
  })
})

describe('room page update hold', () => {
  it('applies a pending update only after the countdown reveal is saved', async () => {
    await mountRoom({ state: fakeState() })
    let finishReveal = () => {}
    const reveal = vi.fn(() => new Promise<void>((resolve) => { finishReveal = resolve }))
    useRoomStore.setState({ reveal })
    vi.useFakeTimers()
    await act(async () => {
      broadcastHandlers.get('start')?.({ payload: { initiatorId: me.id, mode: 'silent' } })
    })

    const apply = vi.fn()
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    appUpdateStore.getState().scheduleUpdate(apply)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000)
    })
    expect(reveal).toHaveBeenCalledOnce()
    expect(apply).not.toHaveBeenCalled()

    await act(async () => {
      finishReveal()
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(apply).toHaveBeenCalledOnce()
  })
})

describe('room page unmount', () => {
  it('unsubscribes, stops presence, drops the visibility listener and releases the update hold', async () => {
    const holdUpdate = vi.spyOn(appUpdateStore.getState(), 'holdUpdate')
    const { unmount } = await mountRoom()
    expect(mocks.presenceStart).toHaveBeenCalled()
    const queriesBefore = mocks.from.mock.calls.length

    unmount()
    await flush()

    expect(mocks.unsubscribe).toHaveBeenCalled()
    expect(mocks.presenceStop).toHaveBeenCalled()
    expect(holdUpdate).toHaveBeenLastCalledWith(false)
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    document.dispatchEvent(new Event('visibilitychange'))
    await flush()
    expect(mocks.from.mock.calls.length).toBe(queriesBefore)
  })
})
