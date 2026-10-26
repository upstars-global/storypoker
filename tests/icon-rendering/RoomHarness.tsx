import { useEffect, useState } from 'react'
import AppHeader from '~/components/AppHeader'
import CardsArea from '~/components/CardsArea'
import JoinOverlay from '~/components/JoinOverlay'
import PlayersList from '~/components/PlayersList'
import SlotMachine from '~/components/SlotMachine'
import Timer from '~/components/Timer'
import { soundVolumeStore } from '~/hooks/useSoundVolume'
import { useTheme } from '~/hooks/useTheme'
import { useAuthStore } from '~/stores/auth'
import { useProfilesStore } from '~/stores/profiles'
import { DECK_PRESETS, DEFAULT_PRESET_ID } from '~/utils/cardDecks'
import {
  type HarnessRole,
  PAUSED_ELAPSED_MS,
  ROOM_NAME,
  ROOM_PAUSED_AT,
  ROOM_STARTED_AT,
  currentPlayerId,
  isModeratorRole,
  makePlayers,
} from './fixture'

const params = new URLSearchParams(window.location.search)
const role = (params.get('role') ?? 'guest') as HarnessRole
const paused = params.get('paused') === '1'
const initialCountdown = Number(params.get('countdown') ?? 0)
const countdownRunning = params.get('countdown') !== null
const initialWidget = params.get('widget') === 'slot' ? 'slot' : 'timer'

const HARNESS_USER_ID = 'icon-harness-user'
const isModerator = isModeratorRole(role)
const activeCards = DECK_PRESETS.find(preset => preset.id === DEFAULT_PRESET_ID)!.defaultActive
const playersForUi = makePlayers().map(player => ({ ...player, is_online: false, votePending: false }))

if (role === 'authorized-moderator') {
  useAuthStore.setState({ user: { id: HARNESS_USER_ID, email: 'harness@example.test' } as never })
  useProfilesStore.setState(state => ({
    profiles: {
      ...state.profiles,
      [HARNESS_USER_ID]: {
        user_id: HARNESS_USER_ID,
        avatar_style: 'bottts',
        avatar_seed: 'icon-harness',
        avatar_url: null,
      },
    },
  }))
}

function noop() {}

export default function RoomHarness() {
  const { init } = useTheme()
  const [showJoin, setShowJoin] = useState(role === 'guest')
  const [sideWidget, setSideWidget] = useState<'timer' | 'slot'>(initialWidget)
  const [pausedAt, setPausedAt] = useState<string | null>(paused ? ROOM_PAUSED_AT : null)

  useEffect(() => {
    init()
    soundVolumeStore.getState().initVolume()
  }, [init])

  return (
    <div className="min-h-screen bg-app text-body">
      <div data-testid="icon-harness-ready" className="sr-only">
        ready
      </div>

      <AppHeader
        onlineCount={0}
        isModerator={isModerator}
        playerName={role === 'guest' ? '' : 'Player 01'}
        playerUserId={role === 'authorized-moderator' ? HARNESS_USER_ID : null}
        roomName={ROOM_NAME}
        countdownActive={false}
        countdownCounter={0}
        countdownTotal={0}
      />

      <main
        id="main"
        tabIndex={-1}
        className="flex flex-1 flex-col md:flex-row gap-6 p-4 sm:p-6 md:p-8 max-w-[1400px] w-full mx-auto outline-none"
      >
        <div data-testid="side-column" className="w-full md:w-1/3 lg:w-1/4 flex-shrink-0 flex flex-col gap-6">
          <PlayersList
            players={playersForUi}
            phase="voting"
            currentPlayerId={currentPlayerId(role)}
            currentUserIsModerator={isModerator}
            currentUserIsAuthorizedModerator={role === 'authorized-moderator'}
            truncateVotes={false}
            slotWinnerId={null}
            onEdit={noop}
            onToggleModerator={noop}
            onLeave={noop}
            onKick={noop}
          />
          {sideWidget === 'timer' ? (
            <Timer
              roundStartedAt={ROOM_STARTED_AT}
              phase="voting"
              pausedAt={pausedAt}
              pausedElapsedMs={pausedAt ? PAUSED_ELAPSED_MS : 0}
              canControl={isModerator}
              onSwitchWidget={() => setSideWidget('slot')}
              onReset={noop}
              onPause={() => setPausedAt(ROOM_PAUSED_AT)}
              onResume={() => setPausedAt(null)}
              onAdjust={noop}
              onUpdateAlarm={noop}
            />
          ) : (
            <SlotMachine
              spinsLeft={3}
              canSpin
              onWin={noop}
              onSpin={noop}
              onSpinEnd={noop}
              onSwitchWidget={() => setSideWidget('timer')}
            />
          )}
        </div>

        <div data-testid="cards-column" className="flex-1 flex flex-col items-center justify-start">
          <CardsArea
            activeCards={activeCards}
            selectedVote={null}
            isModerator={isModerator}
            hasVotes={false}
            canReset={false}
            countdownCounter={initialCountdown}
            countdownRunning={countdownRunning}
            pollMode={false}
            voteQuestionMode={false}
            pollQuestion={null}
            hasLastRound={false}
            onVote={noop}
            onReveal={noop}
            onReset={noop}
            onStartCountdown={noop}
            onSetPollQuestion={noop}
            onStartVoteQuestion={noop}
            onToggleLastRound={noop}
          />
        </div>
      </main>

      {showJoin && <JoinOverlay roomName={ROOM_NAME} onJoin={noop} onClose={() => setShowJoin(false)} />}
    </div>
  )
}
