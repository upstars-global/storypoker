import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import AppIcon from '~/components/AppIcon'
import AppModal from '~/components/AppModal'
import AppModalPaper from '~/components/AppModalPaper'
import { Button } from '~/components/ui/button'
import { AVATAR_STYLES, avatarDisplayUrl, useDylanAvatar, type AvatarStyle } from '~/hooks/useDylanAvatar'
import { useRipple } from '~/hooks/useRipple'
import { useAuthStore } from '~/stores/auth'
import { useProfilesStore } from '~/stores/profiles'
import { AVATAR_ACCEPT, processAvatarImage } from '~/utils/avatarImage'

type UserSettingsModalProps = {
  onClose: () => void
}

type StyleChoice = AvatarStyle | 'custom'

const STYLE_CHOICES: StyleChoice[] = [...AVATAR_STYLES, 'custom']

function randomSeed(): string {
  return Math.random().toString(36).slice(2, 10)
}

function StyleButton({ active, label, onSelect }: { active: boolean; label: string; onSelect: () => void }) {
  const ripple = useRipple<HTMLButtonElement>()
  return (
    <Button
      ref={ripple}
      variant={active ? 'default' : 'secondary'}
      style={{ minWidth: '120px' }}
      onClick={onSelect}
    >
      {label}
    </Button>
  )
}

export default function UserSettingsModal({ onClose }: UserSettingsModalProps) {
  const { t } = useTranslation()
  const user = useAuthStore(state => state.user)
  const profile = useProfilesStore(state => (user ? state.profiles[user.id] ?? null : null))
  const { avatarDataUri } = useDylanAvatar()
  const prevRipple = useRipple<HTMLButtonElement>()
  const nextRipple = useRipple<HTMLButtonElement>()
  const pickRipple = useRipple<HTMLButtonElement>()
  const chooseRipple = useRipple<HTMLButtonElement>()
  const removeRipple = useRipple<HTMLButtonElement>()
  const saveRipple = useRipple<HTMLButtonElement>()
  const fileInput = useRef<HTMLInputElement | null>(null)
  const pendingUrlRef = useRef<string | null>(null)

  const [style, setStyle] = useState<StyleChoice>(() => (profile?.avatar_url ? 'custom' : (profile?.avatar_style ?? 'bottts')))
  const [history, setHistory] = useState<string[]>(() => [profile?.avatar_seed ?? user?.email ?? randomSeed()])
  const [cursor, setCursor] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [touched, setTouched] = useState(false)
  const [pendingBlob, setPendingBlob] = useState<Blob | null>(null)
  const [pendingObjectUrl, setPendingObjectUrl] = useState<string | null>(null)
  const [removeRequested, setRemoveRequested] = useState(false)
  const [seenProfile, setSeenProfile] = useState(profile)

  if (seenProfile !== profile) {
    setSeenProfile(profile)
    if (profile && !touched) {
      setStyle(profile.avatar_url ? 'custom' : profile.avatar_style)
      setHistory([profile.avatar_seed])
      setCursor(0)
    }
  }

  const seed = history[cursor] ?? ''
  const dicebearStyle: AvatarStyle = style === 'custom' ? (profile?.avatar_style ?? 'bottts') : style
  const savedAvatarUrl = profile?.avatar_url ? avatarDisplayUrl(profile.avatar_url, profile.updated_at) : ''
  const previewUri = style === 'custom'
    ? (pendingObjectUrl ?? (removeRequested ? '' : savedAvatarUrl))
    : (seed ? avatarDataUri(seed, false, dicebearStyle) : '')
  const hasCustomImage = Boolean(pendingBlob || (!removeRequested && profile?.avatar_url))
  const canSave = style !== 'custom' || hasCustomImage || removeRequested

  function styleLabel(s: StyleChoice): string {
    if (s === 'dylan') return t('userSettings.styleDylan')
    if (s === 'miniavs') return t('userSettings.styleMiniavs')
    if (s === 'custom') return t('userSettings.styleCustom')
    return t('userSettings.styleRobots')
  }

  function selectStyle(next: StyleChoice) {
    if (style === next) return
    setTouched(true)
    setStyle(next)
    setError(null)
  }

  function prev() {
    if (cursor > 0) {
      setTouched(true)
      setCursor(cursor - 1)
    }
  }

  function next() {
    setTouched(true)
    const nextCursor = cursor + 1
    setCursor(nextCursor)
    if (nextCursor >= history.length) setHistory([...history, randomSeed()])
  }

  function setPendingUrl(url: string | null) {
    if (pendingUrlRef.current) URL.revokeObjectURL(pendingUrlRef.current)
    pendingUrlRef.current = url
    setPendingObjectUrl(url)
  }

  useEffect(() => () => {
    if (pendingUrlRef.current) URL.revokeObjectURL(pendingUrlRef.current)
  }, [])

  async function onFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target
    const file = input.files?.[0]
    input.value = ''
    if (!file) return
    setError(null)
    try {
      const blob = await processAvatarImage(file)
      setTouched(true)
      setPendingBlob(blob)
      setPendingUrl(URL.createObjectURL(blob))
      setRemoveRequested(false)
    } catch (err: unknown) {
      const code = err instanceof Error ? err.message : ''
      setError(code === 'file-too-large'
        ? t('userSettings.errorFileTooLarge')
        : code === 'unsupported-type'
          ? t('userSettings.errorUnsupportedType')
          : t('userSettings.errorDecodeFailed'))
    }
  }

  function removeImage() {
    setPendingUrl(null)
    setTouched(true)
    setPendingBlob(null)
    setRemoveRequested(true)
  }

  async function save() {
    if (!user || saving || !canSave) return
    const userId = user.id
    const profiles = useProfilesStore.getState()
    setSaving(true)
    setError(null)
    try {
      if (style === 'custom' && hasCustomImage) {
        let avatarUrl = profile?.avatar_url ?? null
        if (pendingBlob) {
          try {
            avatarUrl = await profiles.uploadAvatar(userId, pendingBlob)
          } catch {
            setError(t('userSettings.errorUploadFailed'))
            return
          }
        }
        await profiles.upsert({
          user_id: userId,
          avatar_style: dicebearStyle,
          avatar_seed: seed,
          avatar_url: avatarUrl,
        })
      } else {
        const hadStoredAvatar = Boolean(profile?.avatar_url)
        await profiles.upsert({
          user_id: userId,
          avatar_style: dicebearStyle,
          avatar_seed: seed,
          avatar_url: null,
        })
        if (hadStoredAvatar) {
          await profiles.removeAvatar(userId).catch(() => undefined)
        }
      }
      onClose()
    } catch {
      setError(t('userSettings.saveError'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppModal
      labelledby="user-settings-modal-title"
      open
      onClose={onClose}
    >
      <AppModalPaper
        style={{ maxWidth: '560px', padding: '32px 40px 40px' }}
        onClose={onClose}
      >
        <h2
          id="user-settings-modal-title"
          className="text-center text-mui-h2 font-bold text-primary"
        >
          {t('userSettings.title')}
        </h2>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {STYLE_CHOICES.map(s => (
            <StyleButton
              key={s}
              active={style === s}
              label={styleLabel(s)}
              onSelect={() => selectStyle(s)}
            />
          ))}
        </div>

        {style !== 'custom'
          ? (
              <div className="mt-6 flex items-center justify-center gap-4">
                <Button
                  ref={prevRipple}
                  variant="secondary"
                  style={{ minWidth: 'inherit' }}
                  aria-label={t('userSettings.previousAvatar')}
                  disabled={cursor === 0}
                  onClick={prev}
                >
                  <AppIcon
                    className="mui-svg-icon"
                    name="ic:baseline-navigate-before"
                    style={{ fontSize: '1.25rem' }}
                  />
                </Button>
                {previewUri && (
                  <img
                    src={previewUri}
                    alt={t('userSettings.avatarPreview')}
                    className="rounded-full"
                    style={{ width: '144px', height: '144px' }}
                  />
                )}
                <Button
                  ref={nextRipple}
                  variant="secondary"
                  style={{ minWidth: 'inherit' }}
                  aria-label={t('userSettings.nextAvatar')}
                  onClick={next}
                >
                  <AppIcon
                    className="mui-svg-icon"
                    name="ic:baseline-navigate-next"
                    style={{ fontSize: '1.25rem' }}
                  />
                </Button>
              </div>
            )
          : (
              <div className="mt-6 flex flex-col items-center gap-4">
                <input
                  ref={fileInput}
                  type="file"
                  accept={AVATAR_ACCEPT}
                  className="hidden"
                  onChange={event => void onFileSelected(event)}
                />
                <button
                  ref={pickRipple}
                  type="button"
                  className="rounded-full overflow-hidden flex items-center justify-center bg-skeleton"
                  style={{ width: '144px', height: '144px' }}
                  aria-label={t('userSettings.chooseFile')}
                  onClick={() => fileInput.current?.click()}
                >
                  {previewUri
                    ? (
                        <img
                          src={previewUri}
                          alt={t('userSettings.avatarPreview')}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      )
                    : (
                        <AppIcon
                          className="mui-svg-icon text-muted"
                          name="ic:baseline-add-a-photo"
                          style={{ fontSize: '3rem' }}
                        />
                      )}
                </button>
                <div className="flex items-center gap-2">
                  <Button
                    ref={chooseRipple}
                    variant="secondary"
                      onClick={() => fileInput.current?.click()}
                  >
                    {t('userSettings.chooseFile')}
                  </Button>
                  {hasCustomImage && (
                    <Button
                      ref={removeRipple}
                      variant="text"
                      onClick={removeImage}
                    >
                      {t('userSettings.removeImage')}
                    </Button>
                  )}
                </div>
              </div>
            )}

        {error && (
          <p className="text-mui-caption mt-4 text-center text-danger">
            {error}
          </p>
        )}

        <div className="flex justify-center mt-8">
          <Button
            ref={saveRipple}
            style={{ minWidth: '120px' }}
            disabled={saving || !canSave}
            onClick={() => void save()}
          >
            {t('common.save')}
          </Button>
        </div>
      </AppModalPaper>
    </AppModal>
  )
}
