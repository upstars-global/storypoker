import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import RoomBackgroundModal from '~/components/RoomBackgroundModal.vue'
import { useRoomStore } from '~/stores/room'
import { encodeBackground, loadBackgroundImage } from '~/utils/backgroundImage'

vi.mock('~/utils/backgroundImage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/utils/backgroundImage')>()
  return { ...actual, loadBackgroundImage: vi.fn(), encodeBackground: vi.fn() }
})

const loadMock = vi.mocked(loadBackgroundImage)
const encodeMock = vi.mocked(encodeBackground)

function fakeBitmap(width = 1600, height = 900) {
  return { width, height, close: vi.fn() } as unknown as ImageBitmap
}

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  missingWarn: false,
  fallbackWarn: false,
  messages: { en: {} },
})

let pinia: Pinia

function mountModal(currentUrl: string | null = null, currentOpacity: number | null = null) {
  return mount(RoomBackgroundModal, {
    props: { currentUrl, currentOpacity },
    global: { plugins: [pinia, i18n], directives: { wave: {} }, stubs: { AppIcon: true } },
    attachTo: document.body,
  })
}

async function chooseFile(wrapper: ReturnType<typeof mountModal>) {
  const input = wrapper.get('[data-testid="room-background-file"]')
  Object.defineProperty(input.element, 'files', {
    value: [new File(['raw'], 'bg.jpg', { type: 'image/jpeg' })],
    configurable: true,
  })
  await input.trigger('change')
  await flushPromises()
}

const SAVED = { background_url: 'r1/background.webp', background_updated_at: '2026-10-12T10:00:00Z' }

describe('RoomBackgroundModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    pinia = createPinia()
    setActivePinia(pinia)
    URL.createObjectURL = vi.fn(() => 'blob:preview')
    URL.revokeObjectURL = vi.fn()
  })

  it('keeps save disabled until something changes', () => {
    const wrapper = mountModal()
    expect(wrapper.get('[data-testid="room-background-save"]').attributes('disabled')).toBeDefined()
  })

  it('uploads the framed crop, emits it and closes', async () => {
    const bitmap = fakeBitmap()
    loadMock.mockResolvedValue(bitmap)
    const blob = new Blob(['processed'], { type: 'image/webp' })
    encodeMock.mockResolvedValue(blob)
    const upload = vi.spyOn(useRoomStore(), 'uploadBackground').mockResolvedValue(SAVED)
    const wrapper = mountModal()
    await chooseFile(wrapper)
    expect(wrapper.get('[data-testid="room-background-pending-image"]').attributes('src')).toBe('blob:preview')
    await wrapper.get('[data-testid="room-background-zoom"]').setValue('2')
    await wrapper.get('[data-testid="room-background-save"]').trigger('click')
    await flushPromises()
    expect(encodeMock).toHaveBeenCalledWith(bitmap, { zoom: 2, offsetX: 0, offsetY: 0 })
    expect(upload).toHaveBeenCalledWith(blob, 0.65)
    expect(wrapper.emitted('saved')).toEqual([[SAVED]])
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('saves only the opacity when the image is unchanged', async () => {
    const setOpacity = vi.spyOn(useRoomStore(), 'setBackgroundOpacity').mockResolvedValue({ background_opacity: 0.4 })
    const wrapper = mountModal('https://cdn/r1/background.webp', 0.8)
    expect(wrapper.get('[data-testid="room-background-save"]').attributes('disabled')).toBeDefined()
    await wrapper.get('[data-testid="room-background-opacity"]').setValue('0.4')
    expect(wrapper.get('[data-testid="room-background-opacity"]').element.parentElement!.textContent).toContain('40%')
    await wrapper.get('[data-testid="room-background-save"]').trigger('click')
    await flushPromises()
    expect(setOpacity).toHaveBeenCalledWith(0.4)
    expect(wrapper.emitted('saved')).toEqual([[{ background_opacity: 0.4 }]])
  })

  it('hides the opacity slider without an image', () => {
    expect(mountModal().find('[data-testid="room-background-opacity"]').exists()).toBe(false)
  })

  it('removes the current background', async () => {
    const cleared = { background_url: null, background_updated_at: '2026-10-12T10:00:00Z' }
    const remove = vi.spyOn(useRoomStore(), 'removeBackground').mockResolvedValue(cleared)
    const wrapper = mountModal('https://cdn/r1/background.webp')
    await wrapper.get('[data-testid="room-background-remove"]').trigger('click')
    expect(wrapper.find('[data-testid="room-background-preview"] img').exists()).toBe(false)
    await wrapper.get('[data-testid="room-background-save"]').trigger('click')
    await flushPromises()
    expect(remove).toHaveBeenCalled()
    expect(wrapper.emitted('saved')).toEqual([[cleared]])
  })

  it('pans the zoomed image by dragging within the frame bounds', async () => {
    loadMock.mockResolvedValue(fakeBitmap())
    encodeMock.mockResolvedValue(new Blob())
    vi.spyOn(useRoomStore(), 'uploadBackground').mockResolvedValue(SAVED)
    const wrapper = mountModal()
    await chooseFile(wrapper)
    await wrapper.get('[data-testid="room-background-zoom"]').setValue('2')
    const frame = wrapper.get('[data-testid="room-background-frame"]')
    Object.defineProperty(frame.element, 'clientWidth', { value: 400 })
    Object.defineProperty(frame.element, 'clientHeight', { value: 225 })
    await frame.trigger('pointerdown', { pointerId: 1, clientX: 100, clientY: 100 })
    await frame.trigger('pointermove', { pointerId: 1, clientX: 140, clientY: 55 })
    await frame.trigger('pointermove', { pointerId: 1, clientX: 2000, clientY: 55 })
    await frame.trigger('pointerup', { pointerId: 1 })
    expect(wrapper.get('[data-testid="room-background-pending-image"]').attributes('style')).toContain('left: 0%')
    await wrapper.get('[data-testid="room-background-save"]').trigger('click')
    await flushPromises()
    expect(encodeMock).toHaveBeenCalledWith(expect.anything(), { zoom: 2, offsetX: 0.5, offsetY: -0.2 })
  })

  it('moves the image with arrow keys', async () => {
    loadMock.mockResolvedValue(fakeBitmap())
    const wrapper = mountModal()
    await chooseFile(wrapper)
    await wrapper.get('[data-testid="room-background-zoom"]').setValue('2')
    await wrapper.get('[data-testid="room-background-frame"]').trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.get('[data-testid="room-background-pending-image"]').attributes('style')).toContain('left: -48%')
  })

  it('shows a localized error for oversized files and keeps the modal open', async () => {
    loadMock.mockRejectedValue(new Error('file-too-large'))
    const wrapper = mountModal()
    await chooseFile(wrapper)
    expect(wrapper.get('[data-testid="room-background-error"]').text()).toBe('roomBackground.errorFileTooLarge')
    expect(wrapper.get('[data-testid="room-background-save"]').attributes('disabled')).toBeDefined()
  })

  it('reports a save failure without closing', async () => {
    loadMock.mockResolvedValue(fakeBitmap())
    encodeMock.mockResolvedValue(new Blob(['processed']))
    vi.spyOn(useRoomStore(), 'uploadBackground').mockRejectedValue(new Error('denied'))
    const wrapper = mountModal()
    await chooseFile(wrapper)
    await wrapper.get('[data-testid="room-background-save"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="room-background-error"]').text()).toBe('roomBackground.saveError')
    expect(wrapper.emitted('close')).toBeUndefined()
  })
})
