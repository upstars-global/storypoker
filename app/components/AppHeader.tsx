import { useRef, useState, type ChangeEvent, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import AppIcon from '~/components/AppIcon'
import { persistLocale } from '~/i18n'
import { useClickOutside } from '~/hooks/useClickOutside'
import { useMenuKeyboard } from '~/hooks/useMenuKeyboard'
import { useSoundVolume } from '~/hooks/useSoundVolume'
import { PALETTES, useTheme, type PaletteId } from '~/hooks/useTheme'

const VOLUME_LEVEL_ICONS = [
  'tabler:number-0-small', 'tabler:number-1-small', 'tabler:number-2-small', 'tabler:number-3-small',
  'tabler:number-4-small', 'tabler:number-5-small', 'tabler:number-6-small', 'tabler:number-7-small',
  'tabler:number-8-small', 'tabler:number-9-small', 'tabler:number-10-small',
]

const ICON_BUTTON_HOVER = { '--hover-bg': 'rgba(255,255,255,0.08)' } as CSSProperties

const LOCALES = ['uk', 'en'] as const

type HeaderMenuProps = {
  label: string
  testId: string
  buttonClassName: string
  minWidth: string
  trigger: ReactNode
  children: (close: () => void) => ReactNode
}

function HeaderMenu({ label, testId, buttonClassName, minWidth, trigger, children }: HeaderMenuProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const listRef = useRef<HTMLUListElement | null>(null)
  useClickOutside(rootRef, () => setOpen(false))
  const { onKeydown, onFocusout } = useMenuKeyboard(open, setOpen, buttonRef, listRef)

  function onRootKeydown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Escape') return
    event.stopPropagation()
    setOpen(false)
  }

  return (
    <div
      ref={rootRef}
      style={{ position: 'relative' }}
      onKeyDown={onRootKeydown}
    >
      <button
        ref={buttonRef}
        type="button"
        className={buttonClassName}
        style={ICON_BUTTON_HOVER}
        aria-label={label}
        aria-expanded={open}
        data-testid={testId}
        onClick={() => setOpen(!open)}
      >
        {trigger}
      </button>
      {open && (
        <ul
          ref={listRef}
          className="mui-menu z-50"
          role="menu"
          style={{ position: 'absolute', right: 0, top: 'calc(100% + 4px)', minWidth }}
          onBlur={onFocusout}
          onKeyDown={onKeydown}
        >
          {children(() => setOpen(false))}
        </ul>
      )}
    </div>
  )
}

type AppHeaderProps = {
  title?: string
}

export default function AppHeader({ title = 'Story Poker' }: AppHeaderProps) {
  const { t, i18n } = useTranslation()
  const { volume, setVolume, toggleMute } = useSoundVolume()
  const { isLight, palette, toggle: toggleTheme, setPalette } = useTheme()
  const volumePercent = Math.round(volume * 100)
  const volumeLevel = Math.round(volume * 10)
  const volumeLevelIcon = VOLUME_LEVEL_ICONS[volumeLevel]!
  const volumeIcon = volumePercent === 0
    ? 'lucide:volume-x'
    : volumePercent <= 50 ? 'lucide:volume-1' : 'lucide:volume-2'

  function onVolumeInput(event: ChangeEvent<HTMLInputElement>) {
    setVolume(Number(event.target.value) / 100)
  }

  function pickPalette(id: PaletteId, close: () => void) {
    setPalette(id)
    close()
  }

  function pickLocale(code: string, close: () => void) {
    void persistLocale(code)
    close()
  }

  return (
    <header
      className="sticky top-0 z-40 w-full flex items-center px-4 sm:px-6 bg-appbar text-white shadow-4"
      style={{ minHeight: '56px' }}
    >
      <Link
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
        <HeaderMenu
          label={t('header.themePalette')}
          testId="palette-menu-button"
          buttonClassName="mui-icon-btn text-appbar-emphasis"
          minWidth="200px"
          trigger={(
            <AppIcon
              name="ic:baseline-palette"
              style={{ fontSize: '1.5rem' }}
            />
          )}
        >
          {close => PALETTES.map(p => (
            <li
              key={p.id}
              className="mui-menu-item whitespace-nowrap"
              role="menuitemradio"
              aria-checked={palette === p.id}
              tabIndex={-1}
              data-testid={`palette-option-${p.id}`}
              onClick={() => pickPalette(p.id, close)}
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
            </li>
          ))}
        </HeaderMenu>
        <button
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
        <HeaderMenu
          label={t('header.currentUserAccount')}
          testId="account-menu-button"
          buttonClassName="mui-icon-btn text-white"
          minWidth="240px"
          trigger={(
            <AppIcon
              className="mui-svg-icon"
              name="ic:baseline-account-circle"
              style={{ fontSize: '1.5rem' }}
            />
          )}
        >
          {close => LOCALES.map(code => (
            <li
              key={code}
              className="mui-menu-item whitespace-nowrap"
              role="menuitemradio"
              aria-checked={i18n.language === code}
              tabIndex={-1}
              data-testid={`language-option-${code}`}
              onClick={() => pickLocale(code, close)}
            >
              <AppIcon
                className="mui-menu-icon"
                name={i18n.language === code ? 'ic:baseline-check' : 'ic:baseline-language'}
              />
              <span className="flex-1">{t(`header.languages.${code}`)}</span>
            </li>
          ))}
        </HeaderMenu>
      </div>
    </header>
  )
}
