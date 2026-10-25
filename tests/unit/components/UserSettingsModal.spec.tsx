import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { User } from '@supabase/supabase-js'
import { i18n } from '~/i18n'
import UserSettingsModal from '~/components/UserSettingsModal'
import { resetSupabase, setSupabase } from '~/lib/supabase-instance'
import { useAuthStore } from '~/stores/auth'
import { useProfilesStore, type UserProfile } from '~/stores/profiles'
import { processAvatarImage } from '~/utils/avatarImage'
import { resetStores } from '../../support/helpers/resetStores'

vi.mock('~/utils/avatarImage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/utils/avatarImage')>()
  return { ...actual, processAvatarImage: vi.fn() }
})

const processAvatarImageMock = vi.mocked(processAvatarImage)

const STYLE_KEYS = [
  'userSettings.styleRobots',
  'userSettings.styleDylan',
  'userSettings.styleMiniavs',
  'userSettings.styleCustom',
]

const UPLOADED_PATH = 'u1/avatar.webp'

function label(key: string) {
  return i18n.t(key)
}

function mountModal() {
  const onClose = vi.fn()
  render(<UserSettingsModal onClose={onClose} />)
  return { onClose }
}

function findByText(key: string) {
  return screen.queryAllByRole('button').find(button => button.textContent?.trim() === label(key))
}

function byText(key: string) {
  const button = findByText(key)
  if (!button) throw new Error(`button "${key}" not found`)
  return button as HTMLButtonElement
}

function saveButton() {
  return byText('common.save')
}

function isSecondary(button: HTMLElement) {
  return button.className.includes('bg-(--bg-appbar)')
}

function activeStyleLabel() {
  const labels = STYLE_KEYS.map(label)
  const active = screen.getAllByRole('button')
    .find(button => labels.includes(button.textContent?.trim() ?? '') && !isSecondary(button))
  return active?.textContent?.trim() ?? null
}

function signIn(id = 'u1', email = 'user@test.dev') {
  useAuthStore.setState({ user: { id, email } as User })
}

function storeProfile(profile: UserProfile) {
  useProfilesStore.setState(state => ({ profiles: { ...state.profiles, [profile.user_id]: profile } }))
}

function stubProfileActions() {
  const actions = {
    upsert: vi.fn<(profile: UserProfile) => Promise<void>>().mockResolvedValue(undefined),
    uploadAvatar: vi.fn<(userId: string, blob: Blob) => Promise<string>>().mockResolvedValue(UPLOADED_PATH),
    removeAvatar: vi.fn<(userId: string) => Promise<void>>().mockResolvedValue(undefined),
  }
  useProfilesStore.setState(actions)
  return actions
}

async function flush() {
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0))
  })
}

async function click(el: HTMLElement) {
  await act(async () => {
    fireEvent.click(el)
  })
}

async function chooseFile() {
  const blob = new Blob(['processed'], { type: 'image/webp' })
  processAvatarImageMock.mockResolvedValue(blob)
  const input = document.querySelector<HTMLInputElement>('input[type="file"]')!
  Object.defineProperty(input, 'files', {
    value: [new File(['raw'], 'avatar.png', { type: 'image/png' })],
    configurable: true,
  })
  await act(async () => {
    fireEvent.change(input)
  })
  await flush()
  return blob
}

async function clickSave() {
  await click(saveButton())
  await flush()
}

function previewSrc() {
  return screen.getByRole('img').getAttribute('src')
}

beforeEach(async () => {
  vi.clearAllMocks()
  await resetStores()
  resetSupabase()
  setSupabase({
    storage: {
      from: () => ({
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://cdn.test/avatars/${path}` } }),
      }),
    },
  } as never)
  URL.createObjectURL = vi.fn(() => 'blob:preview')
  URL.revokeObjectURL = vi.fn()
})

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

describe('UserSettingsModal save flow', () => {
  it('saves a DiceBear style with a null avatar url and closes', async () => {
    signIn()
    storeProfile({ user_id: 'u1', avatar_style: 'bottts', avatar_seed: 'seed-1', avatar_url: null })
    const { upsert, uploadAvatar, removeAvatar } = stubProfileActions()
    const { onClose } = mountModal()

    await click(byText('userSettings.styleDylan'))
    await clickSave()

    expect(upsert).toHaveBeenCalledWith({
      user_id: 'u1',
      avatar_style: 'dylan',
      avatar_seed: 'seed-1',
      avatar_url: null,
    })
    expect(uploadAvatar).not.toHaveBeenCalled()
    expect(removeAvatar).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('uploads the processed blob and saves the returned url for a new custom image', async () => {
    signIn()
    storeProfile({ user_id: 'u1', avatar_style: 'bottts', avatar_seed: 'seed-1', avatar_url: null })
    const { upsert, uploadAvatar } = stubProfileActions()
    const { onClose } = mountModal()

    await click(byText('userSettings.styleCustom'))
    const blob = await chooseFile()
    await clickSave()

    expect(uploadAvatar).toHaveBeenCalledWith('u1', blob)
    expect(upsert).toHaveBeenCalledWith({
      user_id: 'u1',
      avatar_style: 'bottts',
      avatar_seed: 'seed-1',
      avatar_url: UPLOADED_PATH,
    })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('keeps the stored url without re-uploading when no new file was picked', async () => {
    signIn()
    storeProfile({
      user_id: 'u1',
      avatar_style: 'dylan',
      avatar_seed: 'seed-1',
      avatar_url: 'u1/avatar.webp',
      updated_at: '2026-08-01T00:00:00Z',
    })
    const { upsert, uploadAvatar, removeAvatar } = stubProfileActions()
    const { onClose } = mountModal()

    await clickSave()

    expect(uploadAvatar).not.toHaveBeenCalled()
    expect(removeAvatar).not.toHaveBeenCalled()
    expect(upsert).toHaveBeenCalledWith({
      user_id: 'u1',
      avatar_style: 'dylan',
      avatar_seed: 'seed-1',
      avatar_url: 'u1/avatar.webp',
    })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('reports an upload failure without writing the profile or closing', async () => {
    signIn()
    storeProfile({ user_id: 'u1', avatar_style: 'bottts', avatar_seed: 'seed-1', avatar_url: null })
    const { upsert, uploadAvatar } = stubProfileActions()
    uploadAvatar.mockRejectedValue(new Error('denied'))
    const { onClose } = mountModal()

    await click(byText('userSettings.styleCustom'))
    await chooseFile()
    await clickSave()

    expect(document.body.textContent).toContain(label('userSettings.errorUploadFailed'))
    expect(upsert).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
    expect(saveButton().disabled).toBe(false)
  })

  it('reports a profile write failure without closing', async () => {
    signIn()
    storeProfile({ user_id: 'u1', avatar_style: 'bottts', avatar_seed: 'seed-1', avatar_url: null })
    const { upsert } = stubProfileActions()
    upsert.mockRejectedValue(new Error('denied'))
    const { onClose } = mountModal()

    await clickSave()

    expect(document.body.textContent).toContain(label('userSettings.saveError'))
    expect(onClose).not.toHaveBeenCalled()
    expect(saveButton().disabled).toBe(false)
  })

  it('recovers by re-uploading when the profile write fails after a successful upload', async () => {
    signIn()
    storeProfile({ user_id: 'u1', avatar_style: 'bottts', avatar_seed: 'seed-1', avatar_url: null })
    const { upsert, uploadAvatar } = stubProfileActions()
    upsert.mockRejectedValueOnce(new Error('denied'))
    const { onClose } = mountModal()

    await click(byText('userSettings.styleCustom'))
    const blob = await chooseFile()
    await clickSave()

    expect(uploadAvatar).toHaveBeenCalledTimes(1)
    expect(document.body.textContent).toContain(label('userSettings.saveError'))
    expect(onClose).not.toHaveBeenCalled()

    await clickSave()

    expect(uploadAvatar).toHaveBeenCalledTimes(2)
    expect(uploadAvatar).toHaveBeenLastCalledWith('u1', blob)
    expect(upsert).toHaveBeenLastCalledWith({
      user_id: 'u1',
      avatar_style: 'bottts',
      avatar_seed: 'seed-1',
      avatar_url: UPLOADED_PATH,
    })
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

describe('UserSettingsModal image removal', () => {
  function storeCustomProfile() {
    storeProfile({
      user_id: 'u1',
      avatar_style: 'dylan',
      avatar_seed: 'seed-1',
      avatar_url: 'u1/avatar.webp',
      updated_at: '2026-08-01T00:00:00Z',
    })
  }

  it('writes the profile before deleting the stored object', async () => {
    signIn()
    storeCustomProfile()
    const order: string[] = []
    const { upsert, removeAvatar } = stubProfileActions()
    upsert.mockImplementation(async () => {
      order.push('upsert')
    })
    removeAvatar.mockImplementation(async () => {
      order.push('removeAvatar')
    })
    const { onClose } = mountModal()

    await click(byText('userSettings.removeImage'))
    await clickSave()

    expect(order).toEqual(['upsert', 'removeAvatar'])
    expect(upsert).toHaveBeenCalledWith({
      user_id: 'u1',
      avatar_style: 'dylan',
      avatar_seed: 'seed-1',
      avatar_url: null,
    })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('still completes the save when deleting the stored object fails', async () => {
    signIn()
    storeCustomProfile()
    const { upsert, removeAvatar } = stubProfileActions()
    removeAvatar.mockRejectedValue(new Error('not found'))
    const { onClose } = mountModal()

    await click(byText('userSettings.removeImage'))
    await clickSave()

    expect(upsert).toHaveBeenCalledWith({
      user_id: 'u1',
      avatar_style: 'dylan',
      avatar_seed: 'seed-1',
      avatar_url: null,
    })
    expect(document.body.textContent).not.toContain(label('userSettings.saveError'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

describe('UserSettingsModal save gating', () => {
  it('blocks saving a custom style with no image and unblocks after a file or a removal', async () => {
    signIn()
    storeProfile({ user_id: 'u1', avatar_style: 'bottts', avatar_seed: 'seed-1', avatar_url: null })
    stubProfileActions()
    mountModal()

    await click(byText('userSettings.styleCustom'))
    expect(saveButton().disabled).toBe(true)
    expect(findByText('userSettings.removeImage')).toBeUndefined()

    await chooseFile()
    expect(saveButton().disabled).toBe(false)

    await click(byText('userSettings.removeImage'))
    expect(saveButton().disabled).toBe(false)
  })
})

describe('UserSettingsModal profile sync', () => {
  it('adopts a profile that loads after mount while the user is idle', async () => {
    signIn()
    const { upsert } = stubProfileActions()
    mountModal()

    await act(async () => {
      storeProfile({ user_id: 'u1', avatar_style: 'miniavs', avatar_seed: 'from-db', avatar_url: null })
    })

    expect(activeStyleLabel()).toBe(label('userSettings.styleMiniavs'))

    await clickSave()
    expect(upsert).toHaveBeenCalledWith({
      user_id: 'u1',
      avatar_style: 'miniavs',
      avatar_seed: 'from-db',
      avatar_url: null,
    })
  })

  it('keeps user edits when a profile loads after the style was changed', async () => {
    signIn()
    const { upsert } = stubProfileActions()
    mountModal()

    await click(byText('userSettings.styleDylan'))
    await act(async () => {
      storeProfile({ user_id: 'u1', avatar_style: 'miniavs', avatar_seed: 'from-db', avatar_url: null })
    })

    expect(activeStyleLabel()).toBe(label('userSettings.styleDylan'))

    await clickSave()
    expect(upsert).toHaveBeenCalledWith({
      user_id: 'u1',
      avatar_style: 'dylan',
      avatar_seed: 'user@test.dev',
      avatar_url: null,
    })
  })

  it('keeps a browsed seed when a profile loads after the user changed it', async () => {
    signIn()
    const { upsert } = stubProfileActions()
    mountModal()

    const initialPreview = previewSrc()
    await click(screen.getByRole('button', { name: label('userSettings.nextAvatar') }))
    const browsedPreview = previewSrc()
    expect(browsedPreview).not.toBe(initialPreview)

    await act(async () => {
      storeProfile({ user_id: 'u1', avatar_style: 'bottts', avatar_seed: 'from-db', avatar_url: null })
    })

    expect(previewSrc()).toBe(browsedPreview)

    await clickSave()
    expect(upsert).toHaveBeenCalledTimes(1)
    expect(upsert.mock.calls[0]![0].avatar_seed).not.toBe('from-db')
  })
})
