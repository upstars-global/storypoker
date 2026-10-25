import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent, type PointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import AppIcon from '~/components/AppIcon'
import AppModal from '~/components/AppModal'
import AppModalPaper from '~/components/AppModalPaper'
import { Button } from '~/components/ui/button'
import { useRipple } from '~/hooks/useRipple'
import { useRoomStore, type RoomBackground } from '~/stores/room'
import {
  BACKGROUND_ACCEPT,
  BACKGROUND_MAX_ZOOM,
  BACKGROUND_MIN_OPACITY,
  DEFAULT_FRAMING,
  backgroundTint,
  clampFraming,
  clampOpacity,
  encodeBackground,
  framedSize,
  loadBackgroundImage,
  type Framing,
} from '~/utils/backgroundImage'

type RoomBackgroundModalProps = {
  currentUrl: string | null
  currentOpacity: number | null
  onSaved: (background: Partial<RoomBackground>) => void
  onClose: () => void
}

type Pending = { bitmap: ImageBitmap; objectUrl: string }

const KEY_STEP = 0.02

export default function RoomBackgroundModal({ currentUrl, currentOpacity, onSaved, onClose }: RoomBackgroundModalProps) {
  const { t } = useTranslation()
  const previewRipple = useRipple<HTMLButtonElement>()
  const chooseRipple = useRipple<HTMLButtonElement>()
  const removeRipple = useRipple<HTMLButtonElement>()
  const saveRipple = useRipple<HTMLButtonElement>()
  const fileInput = useRef<HTMLInputElement | null>(null)
  const frame = useRef<HTMLDivElement | null>(null)
  const drag = useRef<{ pointerId: number; x: number; y: number } | null>(null)
  const [pending, setPending] = useState<Pending | null>(null)
  const pendingRef = useRef<Pending | null>(null)
  const [framing, setFraming] = useState<Framing>({ ...DEFAULT_FRAMING })
  const framingRef = useRef<Framing>(framing)
  const [removeRequested, setRemoveRequested] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [opacity, setOpacity] = useState(() => clampOpacity(currentOpacity))

  const tint = backgroundTint(opacity)
  const savedPreviewUrl = removeRequested ? null : currentUrl
  const opacityChanged = opacity !== clampOpacity(currentOpacity)
  const hasChanges = Boolean(pending)
    || (removeRequested && Boolean(currentUrl))
    || (Boolean(savedPreviewUrl) && opacityChanged)

  let pendingImageStyle
  if (pending) {
    const size = framedSize(pending.bitmap.width, pending.bitmap.height, framing.zoom)
    pendingImageStyle = {
      width: `${size.width * 100}%`,
      height: `${size.height * 100}%`,
      left: `${((1 - size.width) / 2 + framing.offsetX) * 100}%`,
      top: `${((1 - size.height) / 2 + framing.offsetY) * 100}%`,
    }
  }

  function applyFraming(next: Framing) {
    framingRef.current = next
    setFraming(next)
  }

  function replacePending(next: Pending | null) {
    const current = pendingRef.current
    if (current) {
      URL.revokeObjectURL(current.objectUrl)
      current.bitmap.close()
    }
    pendingRef.current = next
    setPending(next)
    applyFraming({ ...DEFAULT_FRAMING })
  }

  function updateFraming(next: Framing) {
    const bitmap = pendingRef.current?.bitmap
    if (bitmap) applyFraming(clampFraming(next, bitmap.width, bitmap.height))
  }

  function setZoom(zoom: number) {
    updateFraming({ ...framingRef.current, zoom })
  }

  useEffect(() => () => {
    const current = pendingRef.current
    if (!current) return
    URL.revokeObjectURL(current.objectUrl)
    current.bitmap.close()
  }, [])

  const hasPending = Boolean(pending)
  useEffect(() => {
    const el = frame.current
    if (!el || !hasPending) return
    const onWheel = (event: WheelEvent) => {
      if (!pendingRef.current) return
      event.preventDefault()
      setZoom(framingRef.current.zoom * Math.exp(-event.deltaY * 0.0015))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  })

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!pendingRef.current) return
    drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY }
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const current = drag.current
    if (!current || current.pointerId !== event.pointerId || !frame.current) return
    const { clientWidth, clientHeight } = frame.current
    if (!clientWidth || !clientHeight) return
    const dx = (event.clientX - current.x) / clientWidth
    const dy = (event.clientY - current.y) / clientHeight
    drag.current = { ...current, x: event.clientX, y: event.clientY }
    const f = framingRef.current
    updateFraming({ ...f, offsetX: f.offsetX + dx, offsetY: f.offsetY + dy })
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    if (drag.current?.pointerId === event.pointerId) drag.current = null
  }

  function onFrameKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!pendingRef.current) return
    const { offsetX, offsetY, zoom } = framingRef.current
    const moves: Record<string, Framing> = {
      ArrowLeft: { zoom, offsetX: offsetX - KEY_STEP, offsetY },
      ArrowRight: { zoom, offsetX: offsetX + KEY_STEP, offsetY },
      ArrowUp: { zoom, offsetX, offsetY: offsetY - KEY_STEP },
      ArrowDown: { zoom, offsetX, offsetY: offsetY + KEY_STEP },
      '+': { zoom: zoom + 0.1, offsetX, offsetY },
      '=': { zoom: zoom + 0.1, offsetX, offsetY },
      '-': { zoom: zoom - 0.1, offsetX, offsetY },
    }
    const next = moves[event.key]
    if (!next) return
    event.preventDefault()
    updateFraming(next)
  }

  async function onFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target
    const file = input.files?.[0]
    input.value = ''
    if (!file) return
    setError(null)
    setProcessing(true)
    try {
      const bitmap = await loadBackgroundImage(file)
      replacePending({ bitmap, objectUrl: URL.createObjectURL(file) })
      setRemoveRequested(false)
    } catch (err: unknown) {
      const code = err instanceof Error ? err.message : ''
      setError(code === 'file-too-large'
        ? t('roomBackground.errorFileTooLarge')
        : code === 'unsupported-type'
          ? t('roomBackground.errorUnsupportedType')
          : t('roomBackground.errorDecodeFailed'))
    } finally {
      setProcessing(false)
    }
  }

  function removeImage() {
    replacePending(null)
    setRemoveRequested(true)
    setError(null)
  }

  async function save() {
    if (saving || !hasChanges) return
    setSaving(true)
    setError(null)
    const room = useRoomStore.getState()
    try {
      const current = pendingRef.current
      const background = current
        ? await room.uploadBackground(await encodeBackground(current.bitmap, framingRef.current), opacity)
        : removeRequested
          ? await room.removeBackground()
          : await room.setBackgroundOpacity(opacity)
      if (background) onSaved(background)
      onClose()
    } catch {
      setError(t('roomBackground.saveError'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppModal
      labelledby="room-background-modal-title"
      open
      onClose={onClose}
    >
      <AppModalPaper
        style={{ maxWidth: '560px', padding: '32px 40px 40px' }}
        onClose={onClose}
      >
        <h2
          id="room-background-modal-title"
          className="text-center text-mui-h2 font-bold text-primary"
        >
          {t('roomBackground.title')}
        </h2>

        <input
          ref={fileInput}
          type="file"
          accept={BACKGROUND_ACCEPT}
          className="hidden"
          data-testid="room-background-file"
          onChange={event => void onFileSelected(event)}
        />
        {pending
          ? (
              <div
                ref={frame}
                className="room-background-frame mt-6 w-full overflow-hidden rounded relative bg-skeleton"
                style={{ aspectRatio: '16 / 9' }}
                tabIndex={0}
                role="group"
                aria-label={t('roomBackground.adjustHint')}
                data-testid="room-background-frame"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onKeyDown={onFrameKeyDown}
              >
                <img
                  src={pending.objectUrl}
                  alt={t('roomBackground.preview')}
                  className="absolute max-w-none select-none pointer-events-none"
                  style={pendingImageStyle}
                  draggable={false}
                  data-testid="room-background-pending-image"
                />
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{ backgroundColor: tint }}
                  data-testid="room-background-tint"
                />
              </div>
            )
          : (
              <button
                ref={previewRipple}
                type="button"
                className="mt-6 w-full overflow-hidden rounded relative flex items-center justify-center bg-skeleton"
                style={{ aspectRatio: '16 / 9' }}
                aria-label={t('roomBackground.chooseFile')}
                data-testid="room-background-preview"
                onClick={() => fileInput.current?.click()}
              >
                {savedPreviewUrl && (
                  <img
                    src={savedPreviewUrl}
                    alt={t('roomBackground.preview')}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                )}
                {savedPreviewUrl
                  ? (
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{ backgroundColor: tint }}
                        data-testid="room-background-tint"
                      />
                    )
                  : (
                      <AppIcon
                        className="mui-svg-icon text-muted"
                        name="ic:baseline-wallpaper"
                        style={{ fontSize: '3rem' }}
                      />
                    )}
              </button>
            )}
        {pending && (
          <div className="mt-3 flex items-center gap-3">
            <label
              htmlFor="room-background-zoom"
              className="text-mui-caption text-muted"
            >
              {t('roomBackground.zoom')}
            </label>
            <input
              id="room-background-zoom"
              type="range"
              min="1"
              max={BACKGROUND_MAX_ZOOM}
              step="0.01"
              className="flex-1"
              value={framing.zoom}
              data-testid="room-background-zoom"
              onChange={event => setZoom(Number(event.target.value))}
            />
          </div>
        )}
        {(pending || savedPreviewUrl) && (
          <div className="mt-3 flex items-center gap-3">
            <label
              htmlFor="room-background-opacity"
              className="text-mui-caption text-muted"
            >
              {t('roomBackground.opacity')}
            </label>
            <input
              id="room-background-opacity"
              type="range"
              min={BACKGROUND_MIN_OPACITY}
              max="1"
              step="0.05"
              className="flex-1"
              value={opacity}
              data-testid="room-background-opacity"
              onChange={event => setOpacity(clampOpacity(Number(event.target.value)))}
            />
            <span
              className="text-mui-caption text-muted tabular-nums"
              style={{ minWidth: '3ch', textAlign: 'right' }}
            >
              {`${Math.round(opacity * 100)}%`}
            </span>
          </div>
        )}
        <p className="text-mui-caption mt-2 text-center text-muted">
          {pending ? t('roomBackground.adjustHint') : t('roomBackground.hint')}
        </p>

        <div className="mt-4 flex items-center justify-center gap-2">
          <Button
            ref={chooseRipple}
            type="button"
            variant="secondary"
            disabled={processing || saving}
            onClick={() => fileInput.current?.click()}
          >
            {t('roomBackground.chooseFile')}
          </Button>
          {(pending || savedPreviewUrl) && (
            <Button
              ref={removeRipple}
              type="button"
              variant="text"
              disabled={processing || saving}
              data-testid="room-background-remove"
              onClick={removeImage}
            >
              {t('roomBackground.remove')}
            </Button>
          )}
        </div>

        {error && (
          <p
            className="text-mui-caption mt-4 text-center text-danger"
            data-testid="room-background-error"
          >
            {error}
          </p>
        )}

        <div className="flex justify-center mt-8">
          <Button
            ref={saveRipple}
            type="button"
            style={{ minWidth: '120px' }}
            disabled={processing || saving || !hasChanges}
            data-testid="room-background-save"
            onClick={() => void save()}
          >
            {t('common.save')}
          </Button>
        </div>
      </AppModalPaper>
    </AppModal>
  )
}
