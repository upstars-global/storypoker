import type { ChangeEvent, CSSProperties } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import AppIcon from '~/components/AppIcon'
import { AppMenu, AppMenuItem } from '~/components/AppMenu'
import { persistLocale } from '~/i18n'
import { useRipple } from '~/hooks/useRipple'
import { useSoundVolume } from '~/hooks/useSoundVolume'
import { PALETTES, useTheme } from '~/hooks/useTheme'

const VOLUME_LEVEL_ICONS = [
  'tabler:number-0-small', 'tabler:number-1-small', 'tabler:number-2-small', 'tabler:number-3-small',
  'tabler:number-4-small', 'tabler:number-5-small', 'tabler:number-6-small', 'tabler:number-7-small',
  'tabler:number-8-small', 'tabler:number-9-small', 'tabler:number-10-small',
]

const ICON_BUTTON_HOVER = { '--hover-bg': 'rgba(255,255,255,0.08)' } as CSSProperties

const LOCALES = ['uk', 'en'] as const

type AppHeaderProps = {
  title?: string
}

export default function AppHeader({ title = 'Story Poker' }: AppHeaderProps) {
  const { t, i18n } = useTranslation()
  const { volume, setVolume, toggleMute } = useSoundVolume()
  const { isLight, palette, toggle: toggleTheme, setPalette } = useTheme()
  const homeRipple = useRipple<HTMLAnchorElement>()
  const volumeRipple = useRipple<HTMLButtonElement>()
  const themeRipple = useRipple<HTMLButtonElement>()
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
      <span className="mui-h6 text-lg px-2 text-white">{title}</span>
      <div className="flex-1" />

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2">
          <button
            ref={volumeRipple}
            type="button"
            className="mui-icon-btn text-appbar-emphasis"
            style={ICON_BUTTON_HOVER}
            aria-label={t('header.volume')}
            aria-pressed={volumePercent === 0}
            data-testid="volume-button"
            onClick={toggleMute}
          >
            <AppIcon
              name={volumeIcon}
              style={{ fontSize: '1.5rem' }}
            />
          </button>
          <div
            className="relative inline-flex items-center"
            style={{ width: '96px' }}
          >
            <input
              type="range"
              className="mui-slider w-full"
              style={{ '--fill': `${volumePercent}%` } as CSSProperties}
              min="0"
              max="100"
              step="10"
              value={volumePercent}
              aria-label={t('header.volume')}
              aria-valuetext={String(volumeLevel)}
              data-testid="volume-slider"
              onChange={onVolumeInput}
            />
            <span
              className="mui-slider-knob"
              style={{ left: `calc(12px + (100% - 24px) * ${volume})` }}
              aria-hidden="true"
            >
              <AppIcon name="tabler:percentage-100" />
              <AppIcon
                className="mui-slider-value"
                name={volumeLevelIcon}
              />
            </span>
          </div>
        </div>
        <AppMenu
          label={t('header.themePalette')}
          testId="palette-menu-button"
          triggerClassName="mui-icon-btn text-appbar-emphasis"
          triggerStyle={ICON_BUTTON_HOVER}
          minWidth="200px"
          trigger={(
            <AppIcon
              name="ic:baseline-palette"
              style={{ fontSize: '1.5rem' }}
            />
          )}
        >
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
        </AppMenu>
        <button
          ref={themeRipple}
          type="button"
          className="mui-icon-btn text-appbar-emphasis"
          style={ICON_BUTTON_HOVER}
          aria-label={isLight ? t('header.darkTheme') : t('header.lightTheme')}
          data-testid="theme-toggle-button"
          onClick={event => toggleTheme(event)}
        >
          <AppIcon
            name={isLight ? 'ic:baseline-light-mode' : 'ic:baseline-dark-mode'}
            style={{ fontSize: '1.5rem' }}
          />
        </button>
        <AppMenu
          label={t('header.currentUserAccount')}
          testId="account-menu-button"
          triggerClassName="mui-icon-btn text-white"
          triggerStyle={ICON_BUTTON_HOVER}
          minWidth="240px"
          trigger={(
            <AppIcon
              className="mui-svg-icon"
              name="ic:baseline-account-circle"
              style={{ fontSize: '1.5rem' }}
            />
          )}
        >
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
        </AppMenu>
      </div>
    </header>
  )
}
