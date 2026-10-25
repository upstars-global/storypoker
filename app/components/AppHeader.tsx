import { useRef, useState, type ChangeEvent, type CSSProperties } from 'react'
import { Link } from 'react-router'
import AppIcon from '~/components/AppIcon'
import uk from '~/i18n/locales/uk.json'

const VOLUME_STORAGE_KEY = 'sp-volume'
const DEFAULT_VOLUME = 0
const UNMUTE_VOLUME = 0.1

const VOLUME_LEVEL_ICONS = [
  'tabler:number-0-small', 'tabler:number-1-small', 'tabler:number-2-small', 'tabler:number-3-small',
  'tabler:number-4-small', 'tabler:number-5-small', 'tabler:number-6-small', 'tabler:number-7-small',
  'tabler:number-8-small', 'tabler:number-9-small', 'tabler:number-10-small',
]

const ICON_BUTTON_HOVER = { '--hover-bg': 'rgba(255,255,255,0.08)' } as CSSProperties

function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_VOLUME
  return Math.min(1, Math.max(0, value))
}

function storedVolume(): number {
  let stored: string | null = null
  try { stored = localStorage.getItem(VOLUME_STORAGE_KEY) } catch {}
  return stored === null ? DEFAULT_VOLUME : clampVolume(Number(stored))
}

function useHeaderVolume() {
  const [volume, setVolumeState] = useState(storedVolume)
  const volumeBeforeMute = useRef(volume > 0 ? volume : UNMUTE_VOLUME)

  function setVolume(value: number) {
    const next = clampVolume(value)
    setVolumeState(next)
    if (next > 0) volumeBeforeMute.current = next
    try { localStorage.setItem(VOLUME_STORAGE_KEY, String(next)) } catch {}
  }

  function toggleMute() {
    setVolume(volume > 0 ? 0 : volumeBeforeMute.current || UNMUTE_VOLUME)
  }

  return { volume, setVolume, toggleMute }
}

type AppHeaderProps = {
  title?: string
}

export default function AppHeader({ title = 'Story Poker' }: AppHeaderProps) {
  const { volume, setVolume, toggleMute } = useHeaderVolume()
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
            aria-label={uk.header.volume}
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
              aria-label={uk.header.volume}
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
      </div>
    </header>
  )
}
