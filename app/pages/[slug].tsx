import { lazy, Suspense, useEffect, useRef, useState, type CSSProperties } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import AlignmentCard from '~/components/AlignmentCard'
import AppHeader from '~/components/AppHeader'
import AppModal from '~/components/AppModal'
import AppModalPaper from '~/components/AppModalPaper'
import AuthModal from '~/components/AuthModal'
import CardsArea from '~/components/CardsArea'
import ConfigureCardDeckModal, { type CardDeckPayload } from '~/components/ConfigureCardDeckModal'
import ConnectionBanner from '~/components/ConnectionBanner'
import HistoryModal from '~/components/HistoryModal'
import JoinOverlay from '~/components/JoinOverlay'
import PlayerEditModal, { type PlayerEditPayload } from '~/components/PlayerEditModal'
import PlayersList from '~/components/PlayersList'
import ResultsArea from '~/components/ResultsArea'
import RoomBackgroundModal from '~/components/RoomBackgroundModal'
import SlotMachine from '~/components/SlotMachine'
import Timer from '~/components/Timer'
import UserSettingsModal from '~/components/UserSettingsModal'
import { Button, buttonVariants } from '~/components/ui/button'
import { appUpdateStore } from '~/hooks/useAppUpdate'
import { useCountdown, type CountdownMode } from '~/hooks/useCountdown'
import { useRipple } from '~/hooks/useRipple'
import { getSupabase } from '~/lib/supabase-instance'
import { useAuthStore } from '~/stores/auth'
import { usePlayersStore } from '~/stores/players'
import { usePresenceStore } from '~/stores/presence'
import { useProfilesStore, type UserProfile } from '~/stores/profiles'
import { backgroundDisplayUrl, useRoomStore, type ResolvedRoom, type RoomBackground } from '~/stores/room'
import type { Player, RoomState } from '~/stores/types'
import { alignmentScore } from '~/utils/alignment'
import { backgroundTint } from '~/utils/backgroundImage'
import { DEFAULT_PRESET_ID, activeCardsForDeck } from '~/utils/cardDecks'
import { touchRecentRoom } from '~/utils/recentRooms'
import { shouldCelebrate } from '~/utils/resultCelebration'
import { cohortForShields, groupVotesByCohort, normalizeCohorts, resultCohortFor, type ResultGroup } from '~/utils/resultCohorts'
import { isValidRoomSlug, normalizeRoomSlug } from '~/utils/roomId'
import { roleTagForShields, roleTagOrder } from '~/utils/shields'
import { isRoundTimerStale, type AlarmSettings } from '~/utils/timerAlarm'

interface LastRoundSnapshot {
  votes: Record<string, number>
  groups: ResultGroup[] | null
  playerVotes: { id: string; name: string; vote: string }[]
  pollQuestion: string | null
  isVotingDeck: boolean
  activeCards: string[]
  deckPreset: string | null
}

interface HeaderSeed {
  roomName: string
  playerName: string
}

interface SlotPayload {
  playerId?: string
}

type SideWidget = 'timer' | 'slot'

const SIDE_WIDGET_KEY = 'sp-side-widget'

function readSideWidget(): SideWidget {
  try { return localStorage.getItem(SIDE_WIDGET_KEY) === 'slot' ? 'slot' : 'timer' } catch { return 'timer' }
}

const AlignmentTrendsModal = lazy(() => import('~/components/AlignmentTrendsModal'))

const EMPTY_BACKGROUND: RoomBackground = { background_url: null, background_updated_at: null, background_opacity: null }

function readHeaderSeed(urlParam: string): HeaderSeed {
  try {
    const raw = localStorage.getItem(`sp-room-header-${urlParam}`)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (typeof parsed?.roomName === 'string' && typeof parsed?.playerName === 'string') return parsed
    }
  } catch {}
  return { roomName: urlParam, playerName: '' }
}

function readStoredSession(roomId: string): { playerId: string; playerName: string } | null {
  const raw = localStorage.getItem(`storypoker_session_${roomId}`)
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

function deferred() {
  let resolve = () => {}
  const promise = new Promise<void>((done) => { resolve = done })
  return { promise, resolve }
}

async function fetchInitialData(roomId: string) {
  const supabase = getSupabase()
  const [{ data: pData }, { data: sData }] = await Promise.all([
    supabase.from('players').select('*').eq('room_id', roomId).order('created_at'),
    supabase.from('room_state').select('*').eq('room_id', roomId).single(),
  ])
  usePlayersStore.setState({ players: (pData ?? []) as Player[] })
  useRoomStore.setState({ roomState: (sData ?? null) as RoomState | null })
  const ids = ((pData ?? []) as Player[]).map(p => p.user_id).filter((id): id is string => Boolean(id))
  const userId = useAuthStore.getState().user?.id
  if (userId) ids.push(userId)
  if (ids.length) await useProfilesStore.getState().fetchMany(ids)
}

export default function RoomPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams()
  const [urlParam] = useState(() => params.slug ?? '')
  const saveRipple = useRipple<HTMLButtonElement>()

  const user = useAuthStore(state => state.user)
  const roomState = useRoomStore(state => state.roomState)
  const visiblePlayers = usePlayersStore(state => state.visiblePlayers)
  const pendingVotes = usePlayersStore(state => state.pendingVotes)
  const online = usePresenceStore(state => state.online)
  const connectionStatus = usePresenceStore(state => state.status)
  const {
    countdownTimerCounter,
    countdownTimerTotal,
    countdownActive,
    countdownRunning,
    startCountdown,
    playDecision,
  } = useCountdown()

  const roomIdRef = useRef('')
  const identitySettled = useRef<Promise<void>>(Promise.resolve())
  const currentPlayerIdRef = useRef<string | null>(null)
  const countdownChannel = useRef<RealtimeChannel | null>(null)
  const actionNoticeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const slotWinnerTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const slotSpinSafetyTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  const [roomId, setRoomId] = useState('')
  const [currentPlayerId, setCurrentPlayerIdState] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [showAuth, setShowAuth] = useState<'signin' | 'signup' | null>(null)
  const [showCardDeck, setShowCardDeck] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showAlignmentTrends, setShowAlignmentTrends] = useState(false)
  const [showAccountSettings, setShowAccountSettings] = useState(false)
  const [showRoomBackground, setShowRoomBackground] = useState(false)
  const [editTargetId, setEditTargetId] = useState<string | null>(null)
  const [showRenameRoom, setShowRenameRoom] = useState(false)
  const [roomNameInput, setRoomNameInput] = useState('')
  const [roomNameError, setRoomNameError] = useState<string | null>(null)
  const [currentSlug, setCurrentSlug] = useState<string | null>(null)
  const [currentRoomName, setCurrentRoomName] = useState<string | null>(null)
  const [roomBackground, setRoomBackground] = useState<RoomBackground>(EMPTY_BACKGROUND)
  const [headerSeed, setHeaderSeed] = useState<HeaderSeed>(() => readHeaderSeed(urlParam))
  const [kickTargetId, setKickTargetId] = useState<string | null>(null)
  const [lastRound, setLastRound] = useState<LastRoundSnapshot | null>(null)
  const [pendingSnapshot, setPendingSnapshot] = useState<LastRoundSnapshot | null>(null)
  const [showLastRound, setShowLastRound] = useState(false)
  const [actionNotice, setActionNotice] = useState<string | null>(null)
  const [revealInFlight, setRevealInFlight] = useState(false)
  const [spinningPlayerIds, setSpinningPlayerIds] = useState<Set<string>>(() => new Set())
  const [slotWinnerId, setSlotWinnerId] = useState<string | null>(null)
  const [sideWidget, setSideWidget] = useState<SideWidget>(readSideWidget)
  const [spinsUsed, setSpinsUsed] = useState(0)
  const [spinsRoundStartedAt, setSpinsRoundStartedAt] = useState(roomState?.round_started_at)

  function setCurrentPlayerId(id: string | null) {
    currentPlayerIdRef.current = id
    setCurrentPlayerIdState(id)
  }

  function voteOf(playerId: string): string | null {
    const pending = pendingVotes[playerId]
    if (pending !== undefined) return pending
    return visiblePlayers.find(p => p.id === playerId)?.vote ?? null
  }

  const roomBackgroundUrl = roomBackground.background_url
    ? backgroundDisplayUrl(roomBackground.background_url, roomBackground.background_updated_at)
    : null
  const roomBackgroundTint = backgroundTint(roomBackground.background_opacity)
  const roomBackgroundStyle: CSSProperties | undefined = roomBackgroundUrl
    ? {
        backgroundImage: `linear-gradient(${roomBackgroundTint}, ${roomBackgroundTint}), url("${roomBackgroundUrl}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }
    : undefined
  const roomTitle = currentRoomName ?? currentSlug ?? headerSeed.roomName

  const currentPlayer = visiblePlayers.find(p => p.id === currentPlayerId) ?? null
  const isModerator = currentPlayer?.is_moderator ?? false
  const isAuthorizedModerator = isModerator && !!user
  const onlineCount = visiblePlayers.filter(p => online.has(p.id)).length

  const lastRoundVoteMap: Record<string, string> = showLastRound && lastRound
    ? Object.fromEntries(lastRound.playerVotes.map(pv => [pv.id, pv.vote]))
    : {}

  const playersForUi = visiblePlayers
    .map(p => ({
      ...p,
      is_online: online.has(p.id),
      vote: showLastRound ? (lastRoundVoteMap[p.id] ?? null) : voteOf(p.id),
      votePending: pendingVotes[p.id] !== undefined,
    }))
    .sort((a, b) => {
      const oa = roleTagOrder(roleTagForShields(a.shields))
      const ob = roleTagOrder(roleTagForShields(b.shields))
      return oa - ob || a.name.localeCompare(b.name)
    })

  const hasVotes = playersForUi.filter(p => p.vote !== null).length >= 2

  const currentRoleTag = roleTagForShields(currentPlayer?.shields)
  const isProductRole = currentRoleTag === 'PO' || currentRoleTag === 'SM'
  const spinsPerRound = isProductRole ? 5 : 3
  const canSpinSlot = isProductRole || (
    roomState?.phase === 'voting'
    && !!currentPlayer
    && voteOf(currentPlayer.id) !== null
    && visiblePlayers.some(p => voteOf(p.id) === null)
  )

  if (spinsRoundStartedAt !== roomState?.round_started_at) {
    setSpinsRoundStartedAt(roomState?.round_started_at)
    setSpinsUsed(0)
  }

  const votedCount = visiblePlayers.filter(p => voteOf(p.id) !== null).length
  const canReset = !showLastRound && votedCount > 0 && votedCount < visiblePlayers.length

  const isPollDeck = roomState?.deck_preset === 'voting' || roomState?.deck_preset === 'vote_question'

  const voteCounts: Record<string, number> = roomState
    ? visiblePlayers.reduce<Record<string, number>>((acc, p) => {
        if (p.vote) acc[p.vote] = (acc[p.vote] ?? 0) + 1
        return acc
      }, {})
    : {}

  const resultCohorts = normalizeCohorts(roomState?.result_cohorts)

  const resultGroups: ResultGroup[] | null = roomState && visiblePlayers.some(p => p.vote && cohortForShields(p.shields))
    ? groupVotesByCohort(visiblePlayers, resultCohorts).map(group => ({ label: group.key, votes: group.votes }))
    : null

  const hiddenVotePlayerIds = (() => {
    const preset = roomState?.deck_preset
    if (!preset || isPollDeck || preset === 'goal_clarity') return new Set<string>()
    return new Set(visiblePlayers
      .filter((p) => {
        const cohort = cohortForShields(p.shields)
        return cohort !== null && resultCohortFor(cohort, resultCohorts) === null
      })
      .map(p => p.id))
  })()

  const activeCards = roomState
    ? activeCardsForDeck(roomState.deck_preset ?? DEFAULT_PRESET_ID, roomState.active_cards ?? [])
    : []

  const isConsensus = !isPollDeck && shouldCelebrate(voteCounts, resultGroups?.map(group => group.votes))

  const alignmentBlocks = (() => {
    let votes: Record<string, number>
    let groups: ResultGroup[] | null
    let deck: string[] | null | undefined
    if (showLastRound && lastRound && !lastRound.isVotingDeck) {
      votes = lastRound.votes
      groups = lastRound.groups
      deck = lastRound.activeCards
    } else if (roomState?.phase === 'revealed' && !isPollDeck) {
      votes = voteCounts
      groups = resultGroups
      deck = activeCards
    } else {
      return null
    }
    const blocks: { label: string; value: number }[] = []
    if (groups) {
      for (const group of groups) {
        const value = alignmentScore(group.votes, deck)
        if (value !== null) blocks.push({ label: group.label, value })
      }
    } else {
      const all = alignmentScore(votes, deck)
      if (all !== null) blocks.push({ label: t('results.general'), value: all })
    }
    return blocks.length ? blocks : null
  })()

  function lastRoundSnapshot(): LastRoundSnapshot {
    return {
      votes: { ...voteCounts },
      groups: resultGroups?.map(group => ({ label: group.label, votes: { ...group.votes } })) ?? null,
      playerVotes: visiblePlayers
        .filter(p => p.vote !== null)
        .map(p => ({ id: p.id, name: p.name, vote: p.vote as string })),
      pollQuestion: roomState?.poll_question ?? null,
      isVotingDeck: isPollDeck,
      activeCards: [...activeCards],
      deckPreset: roomState?.deck_preset ?? null,
    }
  }

  const live = useRef({ isConsensus, navigate, pathname: location.pathname, startCountdown, playDecision })

  useEffect(() => {
    live.current = { isConsensus, navigate, pathname: location.pathname, startCountdown, playDecision }
  })

  useEffect(() => {
    document.title = !notFound && roomTitle ? `${roomTitle} | Story Poker` : 'Story Poker'
  }, [location.pathname, roomTitle, notFound])

  useEffect(() => {
    let cancelled = false
    const settled = deferred()
    identitySettled.current = settled.promise
    const channels: RealtimeChannel[] = []
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void fetchInitialData(roomIdRef.current)
    }

    function stopSpinningPlayer(id: string) {
      setSpinningPlayerIds((current) => {
        if (!current.has(id)) return current
        const next = new Set(current)
        next.delete(id)
        return next
      })
      clearTimeout(slotSpinSafetyTimers.current.get(id))
      slotSpinSafetyTimers.current.delete(id)
    }

    function receiveSlotWin(payload?: SlotPayload) {
      if (!payload?.playerId) return
      setSlotWinnerId(payload.playerId)
      clearTimeout(slotWinnerTimer.current)
      slotWinnerTimer.current = setTimeout(() => setSlotWinnerId(null), 1600)
    }

    function receiveSlotSpinStart(payload?: SlotPayload) {
      const id = payload?.playerId
      if (!id) return
      setSpinningPlayerIds(current => new Set(current).add(id))
      clearTimeout(slotSpinSafetyTimers.current.get(id))
      slotSpinSafetyTimers.current.set(id, setTimeout(() => stopSpinningPlayer(id), 2800))
    }

    function revealAfterCountdown() {
      setRevealInFlight(true)
      void useRoomStore.getState().reveal().finally(() => setRevealInFlight(false))
    }

    function applyRoomUpdate(row: ResolvedRoom) {
      const id = roomIdRef.current
      setCurrentSlug(row.slug)
      setCurrentRoomName(row.name)
      setRoomBackground({
        background_url: row.background_url,
        background_updated_at: row.background_updated_at,
        background_opacity: row.background_opacity ?? null,
      })
      const currentParam = decodeURIComponent(live.current.pathname.slice(1))
      if (row.slug && currentParam !== row.slug) {
        void live.current.navigate(`/${row.slug}`, { replace: true })
      } else if (!row.slug && currentParam !== id) {
        void live.current.navigate(`/${id}`, { replace: true })
      }
    }

    function subscribeRealtime(id: string) {
      const supabase = getSupabase()
      channels.push(supabase
        .channel(`players:${id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${id}` },
          (payload: RealtimePostgresChangesPayload<Player>) => usePlayersStore.getState().applyChange(payload))
        .subscribe())
      channels.push(supabase
        .channel(`room_state:${id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'room_state', filter: `room_id=eq.${id}` },
          (payload: RealtimePostgresChangesPayload<RoomState>) => useRoomStore.getState().applyChange(payload))
        .subscribe())
      channels.push(supabase
        .channel(`rooms:${id}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${id}` },
          (payload: RealtimePostgresChangesPayload<ResolvedRoom>) => {
            if (payload.eventType !== 'UPDATE') return
            applyRoomUpdate(payload.new)
          })
        .subscribe())
      channels.push(supabase
        .channel(`user_profiles:${id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'user_profiles' },
          (payload: RealtimePostgresChangesPayload<UserProfile>) => useProfilesStore.getState().applyChange(payload))
        .subscribe())
      const countdown = supabase
        .channel(`countdown:${id}`, { config: { broadcast: { self: true } } })
        .on('broadcast', { event: 'start' }, ({ payload }: { payload?: { initiatorId?: string; mode?: string } }) => {
          const isInitiator = payload?.initiatorId === currentPlayerIdRef.current
          const mode: CountdownMode = payload?.mode === 'wet' || payload?.mode === 'silent' ? payload.mode : 'dry'
          live.current.startCountdown(
            mode,
            isInitiator ? revealAfterCountdown : undefined,
            () => live.current.isConsensus,
          )
        })
        .on('broadcast', { event: 'slot-win' }, ({ payload }: { payload?: SlotPayload }) => receiveSlotWin(payload))
        .on('broadcast', { event: 'slot-spin-start' }, ({ payload }: { payload?: SlotPayload }) => receiveSlotSpinStart(payload))
        .on('broadcast', { event: 'slot-spin-end' }, ({ payload }: { payload?: SlotPayload }) => {
          if (payload?.playerId) stopSpinningPlayer(payload.playerId)
        })
        .subscribe()
      channels.push(countdown)
      countdownChannel.current = countdown
    }

    async function restorePlayer(id: string): Promise<{ id: string; name: string } | null> {
      const players = usePlayersStore.getState()
      const session = readStoredSession(id)
      if (session) {
        try {
          const player = await players.rejoin(session.playerId)
          return { id: player.id, name: player.name }
        } catch {}
      }
      const existing = await players.findExistingPlayer(id, useAuthStore.getState().user?.id ?? null)
      if (existing) {
        try {
          const player = await players.rejoin(existing.id)
          return { id: player.id, name: player.name }
        } catch {}
      }
      return null
    }

    async function enterRoom() {
      await useAuthStore.getState().init()
      if (cancelled) return
      const resolved = await useRoomStore.getState().resolveRoom(urlParam)
      if (cancelled) return
      if (!resolved) {
        setNotFound(true)
        settled.resolve()
        return
      }
      if (resolved.slug && urlParam === resolved.id) {
        void live.current.navigate(`/${resolved.slug}`, { replace: true })
      }
      setCurrentSlug(resolved.slug)
      setCurrentRoomName(resolved.name)
      setRoomBackground({
        background_url: resolved.background_url,
        background_updated_at: resolved.background_updated_at,
        background_opacity: resolved.background_opacity,
      })
      const id = resolved.id
      roomIdRef.current = id
      setRoomId(id)
      useRoomStore.setState({ roomId: id })
      usePlayersStore.setState({ roomId: id })
      await fetchInitialData(id)
      if (cancelled) return

      const restored = await restorePlayer(id)
      if (cancelled) return
      if (restored) {
        setCurrentPlayerId(restored.id)
        touchRecentRoom(id, restored.id, restored.name)
        await usePresenceStore.getState().start(id, restored.id)
      } else {
        setShowJoin(true)
      }
      settled.resolve()
      if (cancelled) return

      subscribeRealtime(id)
      document.addEventListener('visibilitychange', onVisibility)
    }

    void enterRoom()

    const spinTimers = slotSpinSafetyTimers.current
    return () => {
      cancelled = true
      settled.resolve()
      document.removeEventListener('visibilitychange', onVisibility)
      for (const channel of channels) void channel.unsubscribe()
      countdownChannel.current = null
      clearTimeout(slotWinnerTimer.current)
      clearTimeout(actionNoticeTimer.current)
      for (const timer of spinTimers.values()) clearTimeout(timer)
      spinTimers.clear()
      void usePresenceStore.getState().stop()
    }
  }, [urlParam])

  useEffect(() => {
    appUpdateStore.getState().holdUpdate(countdownActive || revealInFlight)
  }, [countdownActive, revealInFlight])

  useEffect(() => () => appUpdateStore.getState().holdUpdate(false), [])

  const previousStatus = useRef(connectionStatus)
  useEffect(() => {
    const prev = previousStatus.current
    previousStatus.current = connectionStatus
    if (prev === 'reconnecting' && connectionStatus === 'online') void fetchInitialData(roomIdRef.current)
  }, [connectionStatus])

  const previousOnlineCount = useRef(onlineCount)
  useEffect(() => {
    const prev = previousOnlineCount.current
    previousOnlineCount.current = onlineCount
    const state = useRoomStore.getState().roomState
    if (onlineCount <= 1 || onlineCount <= prev || !state || !isRoundTimerStale(state, Date.now())) return
    useRoomStore.getState().resetTimer(state.round_started_at)
      .then(() => fetchInitialData(roomIdRef.current))
      .catch(error => console.error('[timer] stale round reset failed:', error))
  }, [onlineCount])

  const currentPlayerName = currentPlayer?.name
  const nextSeedRoomName = currentRoomName ?? currentSlug ?? urlParam
  if (currentPlayerName && (headerSeed.playerName !== currentPlayerName || headerSeed.roomName !== nextSeedRoomName)) {
    setHeaderSeed({ roomName: nextSeedRoomName, playerName: currentPlayerName })
  }
  useEffect(() => {
    if (!currentPlayerName) return
    try { localStorage.setItem(`sp-room-header-${urlParam}`, JSON.stringify(headerSeed)) } catch {}
  }, [headerSeed, currentPlayerName, urlParam])

  const phase = roomState?.phase
  const [renderedPhase, setRenderedPhase] = useState(phase)
  if (renderedPhase !== phase) {
    setRenderedPhase(phase)
    if (phase === 'revealed') {
      setPendingSnapshot(lastRoundSnapshot())
      setShowLastRound(false)
    }
    if (phase === 'voting' && renderedPhase === 'revealed') {
      setLastRound(pendingSnapshot)
      setShowLastRound(false)
    }
  }

  const previousPhase = useRef(phase)
  useEffect(() => {
    const prev = previousPhase.current
    previousPhase.current = phase
    if (prev === phase || phase !== 'revealed') return
    usePlayersStore.getState().clearPendingVotes()
    if (prev === 'voting' && live.current.isConsensus) live.current.playDecision()
  }, [phase])

  const playerUserIds = (visiblePlayers.map(p => p.user_id).filter(Boolean) as string[]).sort().join(',')
  useEffect(() => {
    if (playerUserIds) void useProfilesStore.getState().fetchMany(playerUserIds.split(','))
  }, [playerUserIds])

  async function showActionNotice(message: string) {
    clearTimeout(actionNoticeTimer.current)
    setActionNotice(null)
    await Promise.resolve()
    setActionNotice(message)
    actionNoticeTimer.current = setTimeout(() => setActionNotice(null), 5000)
  }

  async function handleJoin(payload: { name: string; shields: string[] }) {
    const id = roomIdRef.current
    const player = await usePlayersStore.getState().join(payload.name, useAuthStore.getState().user?.id ?? null, payload.shields)
    touchRecentRoom(id, player.id, player.name)
    setCurrentPlayerId(player.id)
    setShowJoin(false)
    await usePresenceStore.getState().start(id, player.id)
  }

  async function handleVote(card: string) {
    if (!currentPlayerIdRef.current) await identitySettled.current
    const playerId = currentPlayerIdRef.current
    if (!playerId) return
    const state = useRoomStore.getState().roomState
    const pollDeck = state?.deck_preset === 'voting' || state?.deck_preset === 'vote_question'
    if (pollDeck && !state?.poll_question) return
    const players = usePlayersStore.getState()
    const next = players.voteOf(playerId) === card ? null : card
    try {
      await players.castVote(playerId, next)
    } catch {
      await showActionNotice(t('room.voteFailed'))
    }
  }

  async function handleLeave(id: string) {
    await usePlayersStore.getState().leave(id)
    await usePresenceStore.getState().stop()
    await navigate('/')
  }

  function handleKick(id: string) {
    requestAnimationFrame(() => setKickTargetId(id))
  }

  function handleEdit(id: string) {
    requestAnimationFrame(() => setEditTargetId(id))
  }

  async function handleSaveEdit(payload: PlayerEditPayload) {
    const target = usePlayersStore.getState().visiblePlayers.find(p => p.id === editTargetId)
    if (!target) return
    const players = usePlayersStore.getState()
    try {
      if (payload.name !== target.name) {
        await players.rename(target.id, payload.name)
      }
      await players.setShields(target.id, payload.shields)
    } catch {
      await showActionNotice(t('room.saveFailed'))
    }
    setEditTargetId(null)
  }

  async function handleSaveCardDeck(payload: CardDeckPayload) {
    const room = useRoomStore.getState()
    if (payload.deckPreset !== room.roomState?.deck_preset) {
      await room.setDeckPreset(payload.deckPreset)
    }
    await room.saveCardDeck(payload.cards)
    if (payload.cohorts.join() !== resultCohorts.join()) {
      await room.setResultCohorts(payload.cohorts).catch(error => console.error('[deck] result cohorts save failed:', error))
    }
    setShowCardDeck(false)
  }

  async function confirmKick() {
    if (!kickTargetId) return
    await usePlayersStore.getState().kick(kickTargetId)
    setKickTargetId(null)
  }

  async function handleAuthSuccess() {
    const userId = useAuthStore.getState().user?.id
    if (currentPlayerIdRef.current && userId) {
      await usePlayersStore.getState().linkUser(currentPlayerIdRef.current, userId)
    }
  }

  function broadcastCountdownStart(mode: CountdownMode) {
    void countdownChannel.current?.send({ type: 'broadcast', event: 'start', payload: { initiatorId: currentPlayerIdRef.current, mode } })
  }

  function switchSideWidget() {
    const next: SideWidget = sideWidget === 'timer' ? 'slot' : 'timer'
    setSideWidget(next)
    try { localStorage.setItem(SIDE_WIDGET_KEY, next) } catch {}
  }

  function broadcastSlotEvent(event: 'slot-spin-start' | 'slot-spin-end' | 'slot-win') {
    const playerId = currentPlayerIdRef.current
    if (!playerId) return
    void countdownChannel.current?.send({ type: 'broadcast', event, payload: { playerId } })
  }

  function handleSlotSpin() {
    setSpinsUsed(used => used + 1)
    broadcastSlotEvent('slot-spin-start')
  }

  async function handleUpdateAlarm(settings: Partial<AlarmSettings>) {
    await useRoomStore.getState().setAlarm(settings).catch(error => console.error('[timer] alarm settings save failed:', error))
  }

  async function handleStartVoteQuestion(question: string, answers: string[]) {
    const room = useRoomStore.getState()
    await Promise.all([
      room.setPollQuestion(question),
      room.saveCardDeck(answers),
    ])
  }

  function openRenameRoom() {
    setRoomNameInput(currentRoomName ?? currentSlug ?? '')
    setRoomNameError(null)
    setShowRenameRoom(true)
  }

  async function submitRenameRoom() {
    setRoomNameError(null)
    const name = roomNameInput.trim()
    const room = useRoomStore.getState()
    if (!name) {
      await room.setRoomName(null, null)
      setCurrentRoomName(null)
      setCurrentSlug(null)
      setShowRenameRoom(false)
      await navigate(`/${roomIdRef.current}`, { replace: true })
      return
    }
    const slug = normalizeRoomSlug(name)
    if (!isValidRoomSlug(slug)) {
      setRoomNameError(t('room.slugError'))
      return
    }
    try {
      await room.setRoomName(name, slug)
    } catch (e) {
      if (e instanceof Error && (e as Error & { code?: string }).code === 'room_slug_taken') {
        setRoomNameError(t('room.slugTaken'))
        return
      }
      throw e
    }
    setCurrentRoomName(name)
    setCurrentSlug(slug)
    setShowRenameRoom(false)
    await navigate(`/${slug}`, { replace: true })
  }

  if (notFound) {
    return (
      <main
        id="main"
        tabIndex={-1}
        className="min-h-screen flex items-center justify-center p-4 bg-app outline-none"
      >
        <div className="mui-modal-paper text-center max-w-md w-full">
          <h2 className="text-mui-h2 font-bold text-primary">
            {t('room.notFoundTitle')}
          </h2>
          <p className="text-mui-body text-body mt-3">
            {t('room.notFoundDescription', { id: urlParam })}
          </p>
          <div className="flex justify-center mt-6">
            <Link
              to="/"
              className={buttonVariants({ size: 'md' })}
            >
              {t('room.notFoundBackHome')}
            </Link>
          </div>
        </div>
      </main>
    )
  }

  const editTargetPlayer = visiblePlayers.find(p => p.id === editTargetId) ?? null
  const kickTargetName = visiblePlayers.find(p => p.id === kickTargetId)?.name ?? ''

  return (
    <div
      className="min-h-screen flex flex-col"
      style={roomBackgroundStyle}
      data-testid="room-root"
    >
      <ConnectionBanner />
      <AppHeader
        onlineCount={onlineCount}
        isModerator={isModerator}
        canEditRoomBackground={isAuthorizedModerator}
        playerName={currentPlayer?.name ?? headerSeed.playerName}
        playerUserId={currentPlayer?.user_id ?? null}
        roomName={currentRoomName ?? currentSlug ?? headerSeed.roomName}
        countdownActive={countdownActive}
        countdownCounter={countdownTimerCounter}
        countdownTotal={countdownTimerTotal}
        onOpenSignIn={() => setShowAuth('signin')}
        onOpenSignUp={() => setShowAuth('signup')}
        onOpenCardDeck={() => setShowCardDeck(true)}
        onOpenRenameRoom={openRenameRoom}
        onOpenRoomBackground={() => setShowRoomBackground(true)}
        onOpenAccountSettings={() => setShowAccountSettings(true)}
        onOpenHistory={() => setShowHistory(true)}
        onOpenAlignmentTrends={() => setShowAlignmentTrends(true)}
        onSignOut={() => void useAuthStore.getState().signOut()}
      />

      <main
        id="main"
        tabIndex={-1}
        className="flex flex-1 flex-col md:flex-row gap-6 p-4 sm:p-6 md:p-8 max-w-[1400px] w-full mx-auto outline-none"
      >
        <div className="w-full md:w-1/3 lg:w-1/4 flex-shrink-0 flex flex-col gap-6">
          <PlayersList
            players={playersForUi}
            phase={showLastRound ? 'revealed' : (roomState?.phase ?? 'voting')}
            currentPlayerId={currentPlayerId}
            currentUserIsModerator={isModerator}
            currentUserIsAuthorizedModerator={isAuthorizedModerator}
            truncateVotes={roomState?.deck_preset === 'vote_question'}
            spinningPlayerIds={spinningPlayerIds}
            slotWinnerId={slotWinnerId}
            hiddenVotePlayerIds={hiddenVotePlayerIds}
            onEdit={handleEdit}
            onToggleModerator={(id, value) => void usePlayersStore.getState().toggleModerator(id, value)}
            onLeave={id => void handleLeave(id)}
            onKick={handleKick}
          />
          {alignmentBlocks && <AlignmentCard blocks={alignmentBlocks} />}
          {roomState && sideWidget === 'timer' && (
            <Timer
              roundStartedAt={roomState.round_started_at}
              phase={roomState.phase ?? 'voting'}
              pausedAt={roomState.paused_at ?? null}
              pausedElapsedMs={roomState.paused_elapsed_ms ?? 0}
              canControl={isModerator}
              alarmMinutes={roomState.alarm_minutes ?? null}
              alarmMuted={roomState.alarm_muted ?? null}
              onReset={() => void useRoomStore.getState().resetTimer()}
              onPause={() => void useRoomStore.getState().pauseTimer()}
              onResume={() => void useRoomStore.getState().resumeTimer()}
              onAdjust={ms => void useRoomStore.getState().adjustTimer(ms)}
              onSwitchWidget={switchSideWidget}
              onUpdateAlarm={settings => void handleUpdateAlarm(settings)}
            />
          )}
          {roomState && sideWidget === 'slot' && (
            <SlotMachine
              spinsLeft={spinsPerRound - spinsUsed}
              canSpin={canSpinSlot}
              onSpin={handleSlotSpin}
              onSpinEnd={() => broadcastSlotEvent('slot-spin-end')}
              onWin={() => broadcastSlotEvent('slot-win')}
              onSwitchWidget={switchSideWidget}
            />
          )}
        </div>

        <div className="flex-1 flex flex-col items-center justify-start">
          {roomState?.phase === 'voting' && showLastRound && lastRound && (
            <ResultsArea
              votes={lastRound.votes}
              groups={lastRound.groups}
              showNewRound={false}
              pollQuestion={lastRound.pollQuestion}
              disableCelebration
              showAlignment={!lastRound.isVotingDeck}
              activeCards={lastRound.activeCards}
              goalClarityScore={lastRound.deckPreset === 'goal_clarity'}
            />
          )}
          {roomState?.phase === 'revealed' && (
            <ResultsArea
              votes={voteCounts}
              groups={resultGroups}
              showNewRound={isModerator}
              pollQuestion={roomState.poll_question ?? null}
              disableCelebration={isPollDeck}
              showAlignment={!isPollDeck}
              activeCards={activeCards}
              goalClarityScore={roomState.deck_preset === 'goal_clarity'}
              onStartNewRound={() => void useRoomStore.getState().startNewRound()}
            />
          )}
          {roomState?.phase === 'voting' && (
            <CardsArea
              activeCards={activeCards}
              selectedVote={currentPlayer ? voteOf(currentPlayer.id) : null}
              isModerator={isModerator}
              hasVotes={hasVotes}
              canReset={canReset}
              countdownCounter={countdownTimerCounter}
              countdownRunning={countdownRunning}
              pollMode={roomState.deck_preset === 'voting'}
              voteQuestionMode={roomState.deck_preset === 'vote_question'}
              pollQuestion={roomState.poll_question ?? null}
              hasLastRound={!!lastRound}
              showLastRound={showLastRound}
              onVote={card => void handleVote(card)}
              onReveal={() => void useRoomStore.getState().reveal()}
              onReset={() => void useRoomStore.getState().resetVotes()}
              onStartCountdown={broadcastCountdownStart}
              onSetPollQuestion={question => void useRoomStore.getState().setPollQuestion(question)}
              onStartVoteQuestion={(question, answers) => void handleStartVoteQuestion(question, answers)}
              onToggleLastRound={() => setShowLastRound(value => !value)}
            />
          )}
          <p
            role="status"
            aria-live="polite"
            className="text-mui-body text-danger text-center min-h-6 mt-4"
            data-testid="action-notice"
          >
            {actionNotice}
          </p>
        </div>
      </main>

      {showJoin && (
        <JoinOverlay
          roomName={currentRoomName ?? undefined}
          onJoin={payload => void handleJoin(payload)}
          onClose={() => void navigate('/')}
        />
      )}

      {showAuth && (
        <AuthModal
          mode={showAuth}
          onClose={() => setShowAuth(null)}
          onSuccess={() => void handleAuthSuccess()}
        />
      )}

      {showCardDeck && roomState && (
        <ConfigureCardDeckModal
          deckPreset={roomState.deck_preset ?? DEFAULT_PRESET_ID}
          activeCards={activeCards}
          resultCohorts={resultCohorts}
          onClose={() => setShowCardDeck(false)}
          onSave={payload => void handleSaveCardDeck(payload)}
        />
      )}

      {showHistory && (
        <HistoryModal onClose={() => setShowHistory(false)} />
      )}
      {showAlignmentTrends && (
        <Suspense fallback={null}>
          <AlignmentTrendsModal
            roomName={currentRoomName ?? currentSlug ?? roomId}
            onClose={() => setShowAlignmentTrends(false)}
          />
        </Suspense>
      )}

      {editTargetPlayer && (
        <PlayerEditModal
          name={editTargetPlayer.name}
          shields={editTargetPlayer.shields ?? []}
          onClose={() => setEditTargetId(null)}
          onSave={payload => void handleSaveEdit(payload)}
        />
      )}

      {showAccountSettings && user && (
        <UserSettingsModal onClose={() => setShowAccountSettings(false)} />
      )}
      {showRoomBackground && isAuthorizedModerator && (
        <RoomBackgroundModal
          currentUrl={roomBackgroundUrl}
          currentOpacity={roomBackground.background_opacity}
          onSaved={background => setRoomBackground(current => ({ ...current, ...background }))}
          onClose={() => setShowRoomBackground(false)}
        />
      )}

      <AppModal
        labelledby="rename-room-modal-title"
        open={showRenameRoom}
        onClose={() => setShowRenameRoom(false)}
      >
        <AppModalPaper onClose={() => setShowRenameRoom(false)}>
          <h2
            id="rename-room-modal-title"
            className="mui-h5 mb-4"
          >
            {t('room.renameTitle')}
          </h2>
          <div className="mui-field">
            <input
              id="rename-room-name"
              value={roomNameInput}
              name="room-name"
              placeholder=" "
              className="mui-input w-full"
              onChange={event => setRoomNameInput(event.target.value)}
              onKeyUp={(event) => {
                if (event.key === 'Enter') void submitRenameRoom()
              }}
            />
            <label
              htmlFor="rename-room-name"
              className="mui-field-label"
            >
              {t('room.renameLabel')}
            </label>
          </div>
          {roomNameError
            ? (
                <p className="text-mui-caption mt-2 text-danger">
                  {roomNameError}
                </p>
              )
            : (
                <div className="text-mui-caption mt-2 flex flex-col gap-[2px] text-muted">
                  {roomNameInput.trim() && <span>{`URL: ${window.location.origin}/${normalizeRoomSlug(roomNameInput)}`}</span>}
                  <span>{`URL: ${window.location.origin}/${roomId}`}</span>
                </div>
              )}
          <div className="flex justify-end mt-6">
            <Button
              ref={saveRipple}
              style={{ minWidth: '120px' }}
              onClick={() => void submitRenameRoom()}
            >
              {t('common.save')}
            </Button>
          </div>
        </AppModalPaper>
      </AppModal>

      <AppModal
        labelledby="kick-player-modal-title"
        open={!!kickTargetId}
        onClose={() => setKickTargetId(null)}
      >
        <AppModalPaper onClose={() => setKickTargetId(null)}>
          <h2
            id="kick-player-modal-title"
            className="mui-h5 mb-4"
          >
            {t('room.kickTitle')}
          </h2>
          <p className="text-body">
            {t('room.kickConfirm', { name: kickTargetName })}
          </p>
          <div className="flex justify-end mt-6">
            <Button
              ref={saveRipple}
              style={{ minWidth: '120px' }}
              onClick={() => void confirmKick()}
            >
              {t('room.kickButton')}
            </Button>
          </div>
        </AppModalPaper>
      </AppModal>
    </div>
  )
}
