import { describe, it, expect, beforeEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import { setSupabase, resetSupabase } from '~/lib/supabase-instance'
import { createI18n } from 'vue-i18n'
import type { User } from '@supabase/supabase-js'
import UserSettingsModal from '~/components/UserSettingsModal.vue'
import { useAuthStore } from '~/stores/auth'
import { useProfilesStore, type UserProfile } from '~/stores/profiles'
import { processAvatarImage } from '~/utils/avatarImage'

vi.mock('~/utils/avatarImage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/utils/avatarImage')>()
  return { ...actual, processAvatarImage: vi.fn() }
})

const processAvatarImageMock = vi.mocked(processAvatarImage)

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  missingWarn: false,
  fallbackWarn: false,
  messages: { en: {} },
})

const STYLE_LABELS = [
  'userSettings.styleRobots',
  'userSettings.styleDylan',
  'userSettings.styleMiniavs',
  'userSettings.styleCustom',
]

const UPLOADED_PATH = 'u1/avatar.webp'

let pinia: Pinia

function mountModal() {
  return mount(UserSettingsModal, {
    global: {
      plugins: [pinia, i18n],
      directives: { wave: {} },
      stubs: { AppIcon: true },
    },
    attachTo: document.body,
  })
}

type Wrapper = VueWrapper<InstanceType<typeof UserSettingsModal>>

function findByText(wrapper: Wrapper, text: string) {
  return wrapper.findAll('button').find(button => button.text() === text)
}

function byText(wrapper: Wrapper, text: string) {
  const button = findByText(wrapper, text)
  if (!button) throw new Error(`button "${text}" not found`)
  return button
}

function saveButton(wrapper: Wrapper) {
  return byText(wrapper, 'common.save')
}

function activeStyleLabel(wrapper: Wrapper) {
  const active = wrapper.findAll('button')
    .find(button => STYLE_LABELS.includes(button.text()) && !button.classes('mui-btn-secondary'))
  return active?.text() ?? null
}

function signIn(id = 'u1', email = 'user@test.dev') {
  useAuthStore().user = { id, email } as User
}

function storeProfile(profile: UserProfile) {
  useProfilesStore().profiles[profile.user_id] = profile
}

function stubProfileActions() {
  const store = useProfilesStore()
  return {
    upsert: vi.spyOn(store, 'upsert').mockResolvedValue(undefined),
    uploadAvatar: vi.spyOn(store, 'uploadAvatar').mockResolvedValue(UPLOADED_PATH),
    removeAvatar: vi.spyOn(store, 'removeAvatar').mockResolvedValue(undefined),
  }
}

async function chooseFile(wrapper: Wrapper) {
  const blob = new Blob(['processed'], { type: 'image/webp' })
  processAvatarImageMock.mockResolvedValue(blob)
  const input = wrapper.get('input[type="file"]')
  Object.defineProperty(input.element, 'files', {
    value: [new File(['raw'], 'avatar.png', { type: 'image/png' })],
    configurable: true,
  })
  await input.trigger('change')
  await flushPromises()
  return blob
}

async function clickSave(wrapper: Wrapper) {
  await saveButton(wrapper).trigger('click')
  await flushPromises()
}

describe('UserSettingsModal save flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    pinia = createPinia()
    setActivePinia(pinia)
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

  it('saves a DiceBear style with a null avatar url and closes', async () => {
    signIn()
    storeProfile({ user_id: 'u1', avatar_style: 'bottts', avatar_seed: 'seed-1', avatar_url: null })
    const { upsert, uploadAvatar, removeAvatar } = stubProfileActions()
    const wrapper = mountModal()

    await byText(wrapper, 'userSettings.styleDylan').trigger('click')
    await clickSave(wrapper)

    expect(upsert).toHaveBeenCalledWith({
      user_id: 'u1',
      avatar_style: 'dylan',
      avatar_seed: 'seed-1',
      avatar_url: null,
    })
    expect(uploadAvatar).not.toHaveBeenCalled()
    expect(removeAvatar).not.toHaveBeenCalled()
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('uploads the processed blob and saves the returned url for a new custom image', async () => {
    signIn()
    storeProfile({ user_id: 'u1', avatar_style: 'bottts', avatar_seed: 'seed-1', avatar_url: null })
    const { upsert, uploadAvatar } = stubProfileActions()
    const wrapper = mountModal()

    await byText(wrapper, 'userSettings.styleCustom').trigger('click')
    const blob = await chooseFile(wrapper)
    await clickSave(wrapper)

    expect(uploadAvatar).toHaveBeenCalledWith('u1', blob)
    expect(upsert).toHaveBeenCalledWith({
      user_id: 'u1',
      avatar_style: 'bottts',
      avatar_seed: 'seed-1',
      avatar_url: UPLOADED_PATH,
    })
    expect(wrapper.emitted('close')).toHaveLength(1)
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
    const wrapper = mountModal()

    await clickSave(wrapper)

    expect(uploadAvatar).not.toHaveBeenCalled()
    expect(removeAvatar).not.toHaveBeenCalled()
    expect(upsert).toHaveBeenCalledWith({
      user_id: 'u1',
      avatar_style: 'dylan',
      avatar_seed: 'seed-1',
      avatar_url: 'u1/avatar.webp',
    })
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('reports an upload failure without writing the profile or closing', async () => {
    signIn()
    storeProfile({ user_id: 'u1', avatar_style: 'bottts', avatar_seed: 'seed-1', avatar_url: null })
    const { upsert, uploadAvatar } = stubProfileActions()
    uploadAvatar.mockRejectedValue(new Error('denied'))
    const wrapper = mountModal()

    await byText(wrapper, 'userSettings.styleCustom').trigger('click')
    await chooseFile(wrapper)
    await clickSave(wrapper)

    expect(wrapper.text()).toContain('userSettings.errorUploadFailed')
    expect(upsert).not.toHaveBeenCalled()
    expect(wrapper.emitted('close')).toBeUndefined()
    expect(saveButton(wrapper).attributes('disabled')).toBeUndefined()
  })

  it('reports a profile write failure without closing', async () => {
    signIn()
    storeProfile({ user_id: 'u1', avatar_style: 'bottts', avatar_seed: 'seed-1', avatar_url: null })
    const { upsert } = stubProfileActions()
    upsert.mockRejectedValue(new Error('denied'))
    const wrapper = mountModal()

    await clickSave(wrapper)

    expect(wrapper.text()).toContain('userSettings.saveError')
    expect(wrapper.emitted('close')).toBeUndefined()
    expect(saveButton(wrapper).attributes('disabled')).toBeUndefined()
  })

  it('recovers by re-uploading when the profile write fails after a successful upload', async () => {
    signIn()
    storeProfile({ user_id: 'u1', avatar_style: 'bottts', avatar_seed: 'seed-1', avatar_url: null })
    const { upsert, uploadAvatar } = stubProfileActions()
    upsert.mockRejectedValueOnce(new Error('denied'))
    const wrapper = mountModal()

    await byText(wrapper, 'userSettings.styleCustom').trigger('click')
    const blob = await chooseFile(wrapper)
    await clickSave(wrapper)

    expect(uploadAvatar).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('userSettings.saveError')
    expect(wrapper.emitted('close')).toBeUndefined()

    await clickSave(wrapper)

    expect(uploadAvatar).toHaveBeenCalledTimes(2)
    expect(uploadAvatar).toHaveBeenLastCalledWith('u1', blob)
    expect(upsert).toHaveBeenLastCalledWith({
      user_id: 'u1',
      avatar_style: 'bottts',
      avatar_seed: 'seed-1',
      avatar_url: UPLOADED_PATH,
    })
    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})

describe('UserSettingsModal image removal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    pinia = createPinia()
    setActivePinia(pinia)
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
    const wrapper = mountModal()

    await byText(wrapper, 'userSettings.removeImage').trigger('click')
    await clickSave(wrapper)

    expect(order).toEqual(['upsert', 'removeAvatar'])
    expect(upsert).toHaveBeenCalledWith({
      user_id: 'u1',
      avatar_style: 'dylan',
      avatar_seed: 'seed-1',
      avatar_url: null,
    })
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('still completes the save when deleting the stored object fails', async () => {
    signIn()
    storeCustomProfile()
    const { upsert, removeAvatar } = stubProfileActions()
    removeAvatar.mockRejectedValue(new Error('not found'))
    const wrapper = mountModal()

    await byText(wrapper, 'userSettings.removeImage').trigger('click')
    await clickSave(wrapper)

    expect(upsert).toHaveBeenCalledWith({
      user_id: 'u1',
      avatar_style: 'dylan',
      avatar_seed: 'seed-1',
      avatar_url: null,
    })
    expect(wrapper.text()).not.toContain('userSettings.saveError')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})

describe('UserSettingsModal save gating', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    pinia = createPinia()
    setActivePinia(pinia)
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

  it('blocks saving a custom style with no image and unblocks after a file or a removal', async () => {
    signIn()
    storeProfile({ user_id: 'u1', avatar_style: 'bottts', avatar_seed: 'seed-1', avatar_url: null })
    stubProfileActions()
    const wrapper = mountModal()

    await byText(wrapper, 'userSettings.styleCustom').trigger('click')
    expect(saveButton(wrapper).attributes('disabled')).toBeDefined()
    expect(findByText(wrapper, 'userSettings.removeImage')).toBeUndefined()

    await chooseFile(wrapper)
    expect(saveButton(wrapper).attributes('disabled')).toBeUndefined()

    await byText(wrapper, 'userSettings.removeImage').trigger('click')
    expect(saveButton(wrapper).attributes('disabled')).toBeUndefined()
  })
})

describe('UserSettingsModal profile sync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    pinia = createPinia()
    setActivePinia(pinia)
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

  it('adopts a profile that loads after mount while the user is idle', async () => {
    signIn()
    const { upsert } = stubProfileActions()
    const wrapper = mountModal()

    storeProfile({ user_id: 'u1', avatar_style: 'miniavs', avatar_seed: 'from-db', avatar_url: null })
    await nextTick()

    expect(activeStyleLabel(wrapper)).toBe('userSettings.styleMiniavs')

    await clickSave(wrapper)
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
    const wrapper = mountModal()

    await byText(wrapper, 'userSettings.styleDylan').trigger('click')
    storeProfile({ user_id: 'u1', avatar_style: 'miniavs', avatar_seed: 'from-db', avatar_url: null })
    await nextTick()

    expect(activeStyleLabel(wrapper)).toBe('userSettings.styleDylan')

    await clickSave(wrapper)
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
    const wrapper = mountModal()

    const initialPreview = wrapper.get('img').attributes('src')
    await wrapper.get('button[aria-label="userSettings.nextAvatar"]').trigger('click')
    const browsedPreview = wrapper.get('img').attributes('src')
    expect(browsedPreview).not.toBe(initialPreview)

    storeProfile({ user_id: 'u1', avatar_style: 'bottts', avatar_seed: 'from-db', avatar_url: null })
    await nextTick()

    expect(wrapper.get('img').attributes('src')).toBe(browsedPreview)

    await clickSave(wrapper)
    expect(upsert).toHaveBeenCalledTimes(1)
    expect(upsert.mock.calls[0]![0].avatar_seed).not.toBe('from-db')
  })
})
