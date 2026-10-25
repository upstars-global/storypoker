import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import AppHeader from '~/components/AppHeader'
import AuthModal from '~/components/AuthModal'
import { Button } from '~/components/ui/button'
import { useRipple } from '~/hooks/useRipple'
import { getSupabase } from '~/lib/supabase-instance'
import { useAuthStore } from '~/stores/auth'
import { usePlayersStore } from '~/stores/players'
import { useProfilesStore } from '~/stores/profiles'
import { useRoomStore } from '~/stores/room'
import type { RoundHistory } from '~/stores/types'
import { listRecentRooms, touchRecentRoom, type RecentRoomEntry } from '~/utils/recentRooms'
import { relativeTime } from '~/utils/relativeTime'
import { roundAlignment } from '~/utils/roundStats'

interface RecentRoomDisplay extends RecentRoomEntry {
  playerNames: string[]
  slug: string | null
  name: string | null
  roundsCount: number
  alignment: number | null
}

const FIELD_LABEL_BG = { '--field-label-bg': 'var(--bg-app)' } as React.CSSProperties

function alignmentColor(a: number): string {
  if (a >= 60) return '#43a047'
  if (a >= 40) return '#fbc02d'
  return '#e64a19'
}

async function loadRecentRooms(): Promise<RecentRoomDisplay[]> {
  const local = listRecentRooms()
  if (local.length === 0) return []

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

  return local.map(r => {
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
}

function Muted() {
  return <span className="text-muted">-</span>
}

export default function HomePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const ripple = useRipple<HTMLButtonElement>()
  const nameInput = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('')
  const [hasError, setHasError] = useState(false)
  const [recentRooms, setRecentRooms] = useState<RecentRoomDisplay[]>([])
  const [showAuth, setShowAuth] = useState<'signin' | 'signup' | null>(null)
  const headerPlayerName = recentRooms[0]?.playerName ?? ''

  useEffect(() => {
    let active = true
    nameInput.current?.focus()
    void (async () => {
      await useAuthStore.getState().init()
      const userId = useAuthStore.getState().user?.id
      if (userId) await useProfilesStore.getState().fetchOne(userId)
      const rooms = await loadRecentRooms()
      if (active && rooms.length) setRecentRooms(rooms)
    })()
    return () => {
      active = false
    }
  }, [])

  async function createRoom() {
    const trimmed = name.trim()
    if (!trimmed) {
      setHasError(true)
      return
    }
    setHasError(false)
    const auth = useAuthStore.getState()
    await auth.init()
    const roomId = await useRoomStore.getState().create()
    usePlayersStore.setState({ roomId })
    const players = usePlayersStore.getState()
    const player = await players.join(trimmed, useAuthStore.getState().user?.id ?? null)
    await players.toggleModerator(player.id, true)
    touchRecentRoom(roomId, player.id, player.name)
    void navigate(`/${roomId}`)
  }

  return (
    <div className="min-h-screen flex flex-col bg-app text-body">
      <AppHeader
        onlineCount={0}
        isModerator={false}
        playerName={headerPlayerName}
        onOpenSignIn={() => setShowAuth('signin')}
        onOpenSignUp={() => setShowAuth('signup')}
        onSignOut={() => void useAuthStore.getState().signOut()}
      />
      {showAuth && (
        <AuthModal
          mode={showAuth}
          onClose={() => setShowAuth(null)}
        />
      )}

      <main
        id="main"
        tabIndex={-1}
        className="flex flex-1 flex-col items-center px-4 pt-[26px] pb-[40px] outline-none"
      >
        <section className="w-full max-w-[460px] text-center">
          <h2 className="m-0 text-mui-h2 font-bold text-primary">
            {t('home.title')}
          </h2>
          <p className="mt-[11px] whitespace-nowrap text-mui-body font-normal text-body">
            {t('home.subtitle')}
          </p>
          <div className="mt-[19px] flex flex-col items-center">
            <div
              className="mui-field w-full max-w-[360px] text-left"
              style={FIELD_LABEL_BG}
            >
              <input
                id="home-name"
                ref={nameInput}
                value={name}
                type="text"
                name="name"
                autoComplete="off"
                placeholder=" "
                className={hasError ? 'mui-input h-[51px] w-full is-error' : 'mui-input h-[51px] w-full'}
                data-testid="home-name-input"
                onChange={event => setName(event.target.value)}
                onKeyUp={event => {
                  if (event.key === 'Enter') void createRoom()
                }}
              />
              <label
                htmlFor="home-name"
                className="mui-field-label"
              >
                {t('home.nameLabel')}
              </label>
            </div>
            <Button
              ref={ripple}
              className="mt-[30px]"
              data-testid="home-create-room"
              onClick={() => void createRoom()}
            >
              {t('home.createRoom')}
            </Button>
          </div>
        </section>

        {recentRooms.length > 0 && (
          <section className="w-full max-w-[920px] mt-[60px]">
            <table className="w-full text-mui-table text-body">
              <thead className="text-primary">
                <tr className="text-left">
                  <th className="px-3 py-3 font-medium">
                    {t('home.recentRooms')}
                  </th>
                  <th className="px-3 py-3 font-medium">
                    {t('home.players')}
                  </th>
                  <th className="px-3 py-3 font-medium whitespace-nowrap">
                    {t('home.rounds')}
                  </th>
                  <th className="px-3 py-3 font-medium whitespace-nowrap">
                    {t('home.alignment')}
                  </th>
                  <th className="px-3 py-3 font-medium text-right whitespace-nowrap">
                    {t('home.lastVisited')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentRooms.map(room => (
                  <tr
                    key={room.roomId}
                    className="border-t"
                  >
                    <td className="px-3 py-3 align-top">
                      <Link
                        to={`/${room.slug ?? room.roomId}`}
                        className="underline hover:no-underline text-primary"
                      >
                        {room.name ?? room.slug ?? room.roomId}
                      </Link>
                    </td>
                    <td className="px-3 py-3 align-top">
                      {room.playerNames.length ? <span>{room.playerNames.join(', ')}</span> : <Muted />}
                    </td>
                    <td className="px-3 py-3 align-top whitespace-nowrap tabular-nums">
                      {room.roundsCount ? <span>{room.roundsCount}</span> : <Muted />}
                    </td>
                    <td className="px-3 py-3 align-top whitespace-nowrap tabular-nums">
                      {room.alignment !== null
                        ? (
                            <span
                              className="font-semibold"
                              style={{ color: alignmentColor(room.alignment) }}
                            >
                              {room.alignment}
                            </span>
                          )
                        : <Muted />}
                    </td>
                    <td className="px-3 py-3 align-top text-right whitespace-nowrap text-muted">
                      {room.lastVisitedAt ? relativeTime(room.lastVisitedAt) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </main>
    </div>
  )
}
