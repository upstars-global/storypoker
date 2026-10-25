import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useParams } from 'react-router'
import type { User } from '@supabase/supabase-js'
import { i18n } from '~/i18n'
import HomePage from '~/pages/index'
import { resetSupabase, setSupabase } from '~/lib/supabase-instance'
import { useAuthStore } from '~/stores/auth'
import { usePlayersStore } from '~/stores/players'
import { useProfilesStore } from '~/stores/profiles'
import { useRoomStore } from '~/stores/room'
import type { Player, RoundHistory } from '~/stores/types'
import { asSupabase } from '../../support/helpers/fakeSupabase'
import { resetStores } from '../../support/helpers/resetStores'

type Tables = Record<string, object[]>

function fakeTables(tables: Tables) {
  const from = vi.fn((table: string) => {
    const result = { data: tables[table] ?? [] }
    const filtered = () => Object.assign(Promise.resolve(result), { is: () => Promise.resolve(result) })
    return { select: () => ({ in: filtered }) }
  })
  setSupabase(asSupabase({ from }))
  return from
}

function seedSession(roomId: string, playerName: string, lastVisitedAt?: string) {
  localStorage.setItem(`storypoker_session_${roomId}`, JSON.stringify({ playerId: `p-${roomId}`, playerName, lastVisitedAt }))
}

function RoomRoute() {
  const { slug } = useParams()
  return <div data-testid="room-page">{slug}</div>
}

async function mountHome() {
  await act(async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/:slug" element={<RoomRoute />} />
        </Routes>
      </MemoryRouter>,
    )
  })
}

function nameInput() {
  return screen.getByTestId('home-name-input') as HTMLInputElement
}

function round(roomId: string, votes: string[]): RoundHistory {
  return {
    id: `r-${roomId}-${votes.join('')}`,
    room_id: roomId,
    started_at: '2026-10-01T10:00:00.000Z',
    revealed_at: '2026-10-01T10:05:00.000Z',
    votes: votes.map((vote, i) => ({ player_id: `v${i}`, name: `V${i}`, vote })),
    active_cards: null,
    deck_preset: 'scrum',
    created_at: null,
  }
}

const user = { id: 'u1', email: 'a@b.co' } as User

beforeEach(async () => {
  resetSupabase()
  await resetStores()
  localStorage.clear()
  useAuthStore.setState({ init: vi.fn().mockResolvedValue(undefined) })
  useProfilesStore.setState({ fetchOne: vi.fn().mockResolvedValue(null) })
})

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
  localStorage.clear()
})

describe('home page', () => {
  it('focuses the name field and shows no recent rooms without sessions', async () => {
    const from = fakeTables({})
    await mountHome()
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(i18n.t('home.title'))
    expect(document.activeElement).toBe(nameInput())
    expect(nameInput().id).toBe('home-name')
    expect(screen.getByText(i18n.t('home.nameLabel')).getAttribute('for')).toBe('home-name')
    expect(screen.queryByRole('table')).toBeNull()
    expect(from).not.toHaveBeenCalled()
  })

  it('fetches the profile of the signed-in user', async () => {
    fakeTables({})
    const fetchOne = vi.fn().mockResolvedValue(null)
    useAuthStore.setState({ user })
    useProfilesStore.setState({ fetchOne })
    await mountHome()
    expect(fetchOne).toHaveBeenCalledWith('u1')
  })

  it('lists recent rooms from storypoker_session_* entries, newest first', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date('2026-10-25T12:00:00.000Z'))
    seedSession('aaaaaaaa', 'Ann', '2026-10-25T09:00:00.000Z')
    seedSession('bbbbbbbb', 'Bob', '2026-10-25T11:58:00.000Z')
    seedSession('cccccccc', 'Cid')
    localStorage.setItem('unrelated', 'x')
    const players: Partial<Player>[] = [
      { id: 'p1', room_id: 'bbbbbbbb', name: 'Bob', shields: [] },
      { id: 'p2', room_id: 'bbbbbbbb', name: 'Eve', shields: [] },
    ]
    fakeTables({
      players,
      rooms: [
        { id: 'bbbbbbbb', slug: 'sprint', name: 'Sprint Planning' },
        { id: 'aaaaaaaa', slug: 'grooming', name: null },
      ],
      round_history: [round('bbbbbbbb', ['5', '5']), round('bbbbbbbb', ['3', '3'])],
    })
    try {
      await mountHome()
    } finally {
      vi.useRealTimers()
    }

    const table = screen.getByRole('table')
    const headers = within(table).getAllByRole('columnheader').map(th => th.textContent)
    expect(headers).toEqual(['recentRooms', 'players', 'rounds', 'alignment', 'lastVisited'].map(k => i18n.t(`home.${k}`)))

    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows.map(r => within(r).getByRole('link').textContent)).toEqual(['Sprint Planning', 'grooming', 'cccccccc'])
    expect(rows.map(r => within(r).getByRole('link').getAttribute('href'))).toEqual(['/sprint', '/grooming', '/cccccccc'])

    const first = within(rows[0]!).getAllByRole('cell').map(c => c.textContent)
    expect(first).toEqual(['Sprint Planning', 'Bob, Eve', '2', '100', '2 minutes ago'])
    const alignment = within(rows[0]!).getAllByRole('cell')[3]!.firstElementChild as HTMLElement
    expect(alignment.className).toBe('font-semibold')
    expect(alignment.style.color).toBe('#43a047')

    const last = within(rows[2]!).getAllByRole('cell')
    expect(last.map(c => c.textContent)).toEqual(['cccccccc', '-', '-', '-', '-'])
    expect(last[1]!.firstElementChild!.className).toBe('text-muted')
  })

  it('flags an empty name and does not create a room', async () => {
    fakeTables({})
    const create = vi.fn()
    useRoomStore.setState({ create })
    await mountHome()
    fireEvent.change(nameInput(), { target: { value: '   ' } })
    await act(async () => {
      fireEvent.click(screen.getByTestId('home-create-room'))
    })
    expect(nameInput().classList.contains('is-error')).toBe(true)
    expect(create).not.toHaveBeenCalled()
  })

  it('creates a room, joins as moderator, records the session and opens the room', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date('2026-10-25T12:00:00.000Z'))
    fakeTables({})
    const create = vi.fn().mockResolvedValue('abcd2345')
    const join = vi.fn().mockImplementation(async (name: string) => {
      expect(usePlayersStore.getState().roomId).toBe('abcd2345')
      return { id: 'player-1', name }
    })
    const toggleModerator = vi.fn().mockResolvedValue(undefined)
    useAuthStore.setState({ user })
    useRoomStore.setState({ create })
    usePlayersStore.setState({ join, toggleModerator })
    try {
      await mountHome()
      fireEvent.change(nameInput(), { target: { value: '  Ann  ' } })
      await act(async () => {
        fireEvent.click(screen.getByTestId('home-create-room'))
      })
    } finally {
      vi.useRealTimers()
    }
    expect(join).toHaveBeenCalledWith('Ann', 'u1')
    expect(toggleModerator).toHaveBeenCalledWith('player-1', true)
    expect(JSON.parse(localStorage.getItem('storypoker_session_abcd2345')!)).toEqual({
      playerId: 'player-1',
      playerName: 'Ann',
      lastVisitedAt: '2026-10-25T12:00:00.000Z',
    })
    expect(screen.getByTestId('room-page').textContent).toBe('abcd2345')
  })

  it('creates a room on Enter in the name field', async () => {
    fakeTables({})
    const create = vi.fn().mockResolvedValue('abcd2345')
    useRoomStore.setState({ create })
    usePlayersStore.setState({
      join: vi.fn().mockResolvedValue({ id: 'player-1', name: 'Ann' }),
      toggleModerator: vi.fn().mockResolvedValue(undefined),
    })
    await mountHome()
    fireEvent.change(nameInput(), { target: { value: 'Ann' } })
    await act(async () => {
      fireEvent.keyUp(nameInput(), { key: 'Enter' })
    })
    expect(create).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('room-page').textContent).toBe('abcd2345')
  })

  it('attaches the ripple to the create button', async () => {
    fakeTables({})
    await mountHome()
    const button = screen.getByTestId('home-create-room')
    expect(button.getAttribute('data-slot')).toBe('button')
    fireEvent.pointerDown(button, { clientX: 1, clientY: 1 })
    expect(button.querySelector('[data-ripple-container]')).not.toBeNull()
  })
})
