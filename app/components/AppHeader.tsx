import { useEffect, useState, type ChangeEvent, type CSSProperties } from 'react'
import { Link } from 'react-router'
import { Menu as MenuPrimitive } from '@base-ui/react/menu'
import {
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
} from '~/components/ui/dropdown-menu'
import { useTranslation } from 'react-i18next'
import AppIcon from '~/components/AppIcon'
import { AppMenu, AppMenuItem } from '~/components/AppMenu'
import { persistLocale } from '~/i18n'
import { useDylanAvatar } from '~/hooks/useDylanAvatar'
import { useRipple } from '~/hooks/useRipple'
import { useSoundVolume } from '~/hooks/useSoundVolume'
import { PALETTES, useTheme } from '~/hooks/useTheme'
import { useAuthStore } from '~/stores/auth'
import { useProfilesStore } from '~/stores/profiles'

const VOLUME_LEVEL_ICONS = [
  'tabler:number-0-small', 'tabler:number-1-small', 'tabler:number-2-small', 'tabler:number-3-small',
  'tabler:number-4-small', 'tabler:number-5-small', 'tabler:number-6-small', 'tabler:number-7-small',
  'tabler:number-8-small', 'tabler:number-9-small', 'tabler:number-10-small',
]

const ICON_BUTTON_HOVER = { '--hover-bg': 'rgba(255,255,255,0.08)' } as CSSProperties

const LOCALES = ['uk', 'en'] as const

type AppHeaderProps = {
  onlineCount?: number
  isModerator?: boolean
  canEditRoomBackground?: boolean
  playerName?: string
  playerUserId?: string | null
  roomName?: string
  title?: string
  countdownActive?: boolean
  countdownCounter?: number
  countdownTotal?: number
  onOpenSignIn?: () => void
  onOpenSignUp?: () => void
  onOpenCardDeck?: () => void
  onOpenRenameRoom?: () => void
  onOpenRoomBackground?: () => void
  onOpenAccountSettings?: () => void
  onOpenHistory?: () => void
  onOpenAlignmentTrends?: () => void
  onSignOut?: () => void
}

export default function AppHeader({
  isModerator = false,
  canEditRoomBackground = false,
  playerName = '',
  playerUserId = null,
  roomName = '',
  title = 'Story Poker',
  countdownActive = false,
  countdownCounter = 0,
  countdownTotal = 0,
  onOpenSignIn,
  onOpenSignUp,
  onOpenCardDeck,
  onOpenRenameRoom,
  onOpenRoomBackground,
  onOpenAccountSettings,
  onOpenHistory,
  onOpenAlignmentTrends,
  onSignOut,
}: AppHeaderProps) {
  const { t, i18n } = useTranslation()
  const user = useAuthStore(state => state.user)
  const profileUserId = playerUserId ?? user?.id ?? null
  const profile = useProfilesStore(state => (profileUserId ? state.profiles[profileUserId] ?? null : null))
  const { avatarSrcFor } = useDylanAvatar()
  const [fetchedUserId, setFetchedUserId] = useState<string | null>(null)
  const [countdownBarWidth, setCountdownBarWidth] = useState(0)
  const userId = user?.id ?? null
  const profileFetched = !userId || fetchedUserId === userId
  const fallbackSeed = playerName || user?.email || ''
  const myAvatarUri = !profile && !fallbackSeed ? '' : avatarSrcFor(profile, fallbackSeed, false).src
  const headerLabel = roomName ? playerName : (user?.email ?? '').split('@')[0]

  useEffect(() => {
    if (!userId) return
    let active = true
    void useProfilesStore.getState().fetchOne(userId).catch(() => null).then(() => {
      if (active) setFetchedUserId(userId)
    })
    return () => {
      active = false
    }
  }, [userId])

  useEffect(() => {
    if (!countdownActive) return
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => setCountdownBarWidth(100))
    })
    return () => {
      cancelAnimationFrame(frame)
      setCountdownBarWidth(0)
    }
  }, [countdownActive])

  const { volume, setVolume, toggleMute } = useSoundVolume()
  const { isLight, palette, toggle: toggleTheme, setPalette } = useTheme()
  const homeRipple = useRipple<HTMLAnchorElement>()
  const volumePercent = Math.round(volume * 100)
  const volumeLevel = Math.round(volume * 10)
  const volumeLevelIcon = VOLUME_LEVEL_ICONS[volumeLevel]!
  const volumeIcon = volumePercent === 0
    ? 'lucide:volume-x'
    : volumePercent <= 50 ? 'lucide:volume-1' : 'lucide:volume-2'

  function onVolumeInput(event: ChangeEvent<HTMLInputElement>) {
    setVolume(Number(event.target.value) / 100)
  }

  return (
    <header
      className="sticky top-0 z-40 w-full flex items-center px-4 sm:px-6 bg-appbar text-white shadow-4"
      style={{ minHeight: '56px' }}
    >
      <Link
        ref={homeRipple}
        to="/"
        className="mui-icon-btn text-appbar-emphasis"
        style={ICON_BUTTON_HOVER}
      >
        <AppIcon
          name="app:fibonacci"
          style={{ fontSize: '1.75rem', transform: 'rotate(-90deg)' }}
        />
      </Link>
      <span className="mx-1.5 text-appbar-subtle">•</span>
      {roomName
        ? <h1 className="mui-h6 text-lg text-appbar-emphasis">{roomName}</h1>
        : <span className="mui-h6 text-lg px-2 text-white">{title}</span>}
      <div className="flex-1" />

      <div className="flex items-center gap-2">
        {headerLabel && (
          <span className="text-sm text-appbar-emphasis">
            {headerLabel}
          </span>
        )}
        <AppMenu
          label={t('header.currentUserAccount')}
          testId="account-menu-button"
          triggerClassName="mui-icon-btn text-white"
          triggerStyle={ICON_BUTTON_HOVER}
          minWidth="240px"
          trigger={myAvatarUri
            ? (
                <img
                  src={myAvatarUri}
                  className="w-7 h-7 rounded-full"
                  alt={playerName}
                  style={{ opacity: profileFetched ? 1 : 0, transition: 'opacity 0.15s' }}
                />
              )
            : (
                <AppIcon
                  className="mui-svg-icon"
                  name="ic:baseline-account-circle"
                  style={{ fontSize: '1.5rem' }}
                />
              )}
        >
          <DropdownMenuGroup>
            <div className="flex items-center gap-2 px-2">
              <AppMenuItem
                className="w-auto shrink-0 px-2"
                role="menuitemcheckbox"
                aria-checked={volumePercent === 0}
                closeOnClick={false}
                data-testid="volume-button"
                onClick={toggleMute}
              >
                <AppIcon className="mui-menu-icon" name={volumeIcon} />
                <span className="sr-only">{t('header.volume')}</span>
              </AppMenuItem>
              <div className="relative flex w-24 shrink-0 items-center py-2">
                <MenuPrimitive.Item
                  closeOnClick={false}
                  label={t('header.volume')}
                  role="slider"
                  render={(
                    <input
                      type="range"
                      className="mui-slider w-full min-w-0"
                      style={{ '--fill': `${volumePercent}%` } as CSSProperties}
                      min="0"
                      max="100"
                      step="10"
                      value={volumePercent}
                      aria-label={t('header.volume')}
                      aria-valuetext={String(volumeLevel)}
                      data-testid="volume-slider"
                      onChange={onVolumeInput}
                      onKeyDown={(event) => {
                        if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) event.stopPropagation()
                      }}
                    />
                  )}
                />
                <span
                  className="mui-slider-knob"
                  style={{ left: `calc(12px + (100% - 24px) * ${volume})` }}
                  aria-hidden="true"
                >
                  <AppIcon name="tabler:percentage-100" />
                  <AppIcon className="mui-slider-value" name={volumeLevelIcon} />
                </span>
              </div>
            </div>
            <AppMenuItem
              className="whitespace-nowrap"
              data-testid="theme-toggle-button"
              onClick={event => toggleTheme(event)}
            >
              <AppIcon
                className="mui-menu-icon"
                name={isLight ? 'ic:baseline-light-mode' : 'ic:baseline-dark-mode'}
              />
              {isLight ? t('header.darkTheme') : t('header.lightTheme')}
            </AppMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger
              openOnHover={false}
              data-testid="palette-menu-trigger"
            >
              <AppIcon className="mui-menu-icon" name="ic:baseline-palette" />
              <span className="flex-1">{t('header.themePalette')}</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuContent
              side="right"
              sideOffset={4}
              data-testid="palette-submenu"
              style={{ minWidth: '180px' }}
            >
              <DropdownMenuGroup>
                {PALETTES.map(p => (
                  <AppMenuItem
                    key={p.id}
                    className="whitespace-nowrap"
                    role="menuitemradio"
                    aria-checked={palette === p.id}
                    data-testid={`palette-option-${p.id}`}
                    onClick={() => setPalette(p.id)}
                  >
                    <span className="inline-flex items-center gap-1">
                      {p.swatches.map((color, i) => (
                        <span
                          key={i}
                          className="inline-block rounded-full"
                          style={{ width: '12px', height: '12px', backgroundColor: color }}
                        />
                      ))}
                    </span>
                    <span className="flex-1">{t(`theme.${p.id}`)}</span>
                    {palette === p.id && (
                      <AppIcon
                        className="mui-menu-icon"
                        name="ic:baseline-check"
                      />
                    )}
                  </AppMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          {roomName && (
            <>
              <AppMenuItem
                className="whitespace-nowrap"
                onClick={onOpenHistory}
              >
                <AppIcon
                  className="mui-menu-icon"
                  name="ic:baseline-history"
                />
                {t('header.history')}
              </AppMenuItem>
              <AppMenuItem
                className="whitespace-nowrap"
                onClick={onOpenAlignmentTrends}
              >
                <AppIcon
                  className="mui-menu-icon"
                  name="ic:baseline-trending-up"
                />
                {t('header.alignmentTrends')}
              </AppMenuItem>
            </>
          )}
          {isModerator && (
            <>
              <hr className="mui-divider" />
              {user && (
                <AppMenuItem
                  className="whitespace-nowrap"
                  onClick={onOpenRenameRoom}
                >
                  <AppIcon
                    className="mui-menu-icon"
                    name="ic:baseline-edit"
                  />
                  {t('header.renameRoom')}
                </AppMenuItem>
              )}
              {canEditRoomBackground && (
                <AppMenuItem
                  className="whitespace-nowrap"
                  data-testid="room-background-menu-item"
                  onClick={onOpenRoomBackground}
                >
                  <AppIcon
                    className="mui-menu-icon"
                    name="ic:baseline-wallpaper"
                  />
                  {t('header.roomBackground')}
                </AppMenuItem>
              )}
              <AppMenuItem
                className="whitespace-nowrap"
                onClick={onOpenCardDeck}
              >
                <AppIcon
                  className="mui-menu-icon"
                  name="ic:baseline-settings"
                />
                {t('header.configureCardDeck')}
              </AppMenuItem>
            </>
          )}
          {(roomName || isModerator) && <hr className="mui-divider" />}
          {LOCALES.map(code => (
            <AppMenuItem
              key={code}
              className="whitespace-nowrap"
              role="menuitemradio"
              aria-checked={i18n.language === code}
              data-testid={`language-option-${code}`}
              onClick={() => void persistLocale(code)}
            >
              <AppIcon
                className="mui-menu-icon"
                name={i18n.language === code ? 'ic:baseline-check' : 'ic:baseline-language'}
              />
              <span className="flex-1">{t(`header.languages.${code}`)}</span>
            </AppMenuItem>
          ))}
          <hr className="mui-divider" />
          {user
            ? (
                <>
                  <AppMenuItem
                    className="whitespace-nowrap"
                    onClick={onOpenAccountSettings}
                  >
                    <AppIcon
                      className="mui-menu-icon"
                      name="lucide:id-card"
                    />
                    {t('header.accountSettings')}
                  </AppMenuItem>
                  <AppMenuItem
                    className="whitespace-nowrap"
                    data-testid="auth-sign-out-menu-item"
                    onClick={onSignOut}
                  >
                    <AppIcon
                      className="mui-menu-icon"
                      name="ic:baseline-logout"
                    />
                    {t('common.signOut')}
                  </AppMenuItem>
                </>
              )
            : (
                <>
                  <AppMenuItem
                    className="whitespace-nowrap"
                    data-testid="auth-sign-in-menu-item"
                    onClick={onOpenSignIn}
                  >
                    <AppIcon
                      className="mui-menu-icon"
                      name="ic:baseline-login"
                    />
                    {t('common.signIn')}
                  </AppMenuItem>
                  <AppMenuItem
                    className="whitespace-nowrap"
                    onClick={onOpenSignUp}
                  >
                    <AppIcon
                      className="mui-menu-icon"
                      name="ic:baseline-person-add"
                    />
                    {t('common.signUp')}
                  </AppMenuItem>
                </>
              )}
        </AppMenu>
      </div>

      {countdownActive && (
        <>
          <div
            className="absolute inset-x-0 bottom-0 h-1.5"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.16)' }}
            data-testid="countdown-bar"
          >
            <div
              className="h-full"
              style={{
                width: `${countdownBarWidth}%`,
                backgroundColor: 'var(--success)',
                transition: `width ${countdownTotal}s linear`,
              }}
            />
          </div>
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-mui-h2 font-bold tabular-nums text-white pointer-events-none"
            data-testid="countdown-number"
          >
            {countdownCounter}
          </div>
        </>
      )}
    </header>
  )
}
