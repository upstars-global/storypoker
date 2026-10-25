import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { i18n } from '~/i18n'
import RoomBackgroundModal from '~/components/RoomBackgroundModal'
import { useRoomStore } from '~/stores/room'
import { encodeBackground, loadBackgroundImage } from '~/utils/backgroundImage'
import { resetStores } from '../../support/helpers/resetStores'

vi.mock('~/utils/backgroundImage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/utils/backgroundImage')>()
  return { ...actual, loadBackgroundImage: vi.fn(), encodeBackground: vi.fn() }
})

const loadMock = vi.mocked(loadBackgroundImage)
const encodeMock = vi.mocked(encodeBackground)

function fakeBitmap(width = 1600, height = 900) {
  return { width, height, close: vi.fn() } as unknown as ImageBitmap
}

function mountModal(currentUrl: string | null = null, currentOpacity: number | null = null) {
  const onSaved = vi.fn()
  const onClose = vi.fn()
  render(
    <RoomBackgroundModal
      currentUrl={currentUrl}
      currentOpacity={currentOpacity}
      onSaved={onSaved}
      onClose={onClose}
    />,
  )
  return { onSaved, onClose }
}

function byTestId<T extends HTMLElement = HTMLElement>(id: string): T {
  const el = document.querySelector<T>(`[data-testid="${id}"]`)
  if (!el) throw new Error(`${id} not found`)
  return el
}

async function flush() {
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0))
  })
}

async function chooseFile() {
  const input = byTestId<HTMLInputElement>('room-background-file')
  Object.defineProperty(input, 'files', {
    value: [new File(['raw'], 'bg.jpg', { type: 'image/jpeg' })],
    configurable: true,
  })
  await act(async () => {
    fireEvent.change(input)
  })
  await flush()
}

async function setRange(id: string, value: string) {
  await act(async () => {
    fireEvent.change(byTestId<HTMLInputElement>(id), { target: { value } })
  })
}

async function clickSave() {
  await act(async () => {
    fireEvent.click(byTestId('room-background-save'))
  })
  await flush()
}

const SAVED = { background_url: 'r1/background.webp', background_updated_at: '2026-10-12T10:00:00Z' }

beforeEach(async () => {
  vi.clearAllMocks()
  await resetStores()
  URL.createObjectURL = vi.fn(() => 'blob:preview')
  URL.revokeObjectURL = vi.fn()
})

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

describe('RoomBackgroundModal', () => {
  it('keeps save disabled until something changes', () => {
    mountModal()
    expect(byTestId<HTMLButtonElement>('room-background-save').disabled).toBe(true)
  })

  it('uploads the framed crop, emits it and closes', async () => {
    const bitmap = fakeBitmap()
    loadMock.mockResolvedValue(bitmap)
    const blob = new Blob(['processed'], { type: 'image/webp' })
    encodeMock.mockResolvedValue(blob)
    const upload = vi.fn().mockResolvedValue(SAVED)
    useRoomStore.setState({ uploadBackground: upload })
    const { onSaved, onClose } = mountModal()
    await chooseFile()
    expect(byTestId('room-background-pending-image').getAttribute('src')).toBe('blob:preview')
    await setRange('room-background-zoom', '2')
    await clickSave()
    expect(encodeMock).toHaveBeenCalledWith(bitmap, { zoom: 2, offsetX: 0, offsetY: 0 })
    expect(upload).toHaveBeenCalledWith(blob, 0.65)
    expect(onSaved.mock.calls).toEqual([[SAVED]])
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('saves only the opacity when the image is unchanged', async () => {
    const setOpacity = vi.fn().mockResolvedValue({ background_opacity: 0.4 })
    useRoomStore.setState({ setBackgroundOpacity: setOpacity })
    const { onSaved } = mountModal('https://cdn/r1/background.webp', 0.8)
    expect(byTestId<HTMLButtonElement>('room-background-save').disabled).toBe(true)
    await setRange('room-background-opacity', '0.4')
    expect(byTestId('room-background-opacity').parentElement!.textContent).toContain('40%')
    await clickSave()
    expect(setOpacity).toHaveBeenCalledWith(0.4)
    expect(onSaved.mock.calls).toEqual([[{ background_opacity: 0.4 }]])
  })

  it('hides the opacity slider without an image', () => {
    mountModal()
    expect(document.querySelector('[data-testid="room-background-opacity"]')).toBeNull()
  })

  it('removes the current background', async () => {
    const cleared = { background_url: null, background_updated_at: '2026-10-12T10:00:00Z' }
    const remove = vi.fn().mockResolvedValue(cleared)
    useRoomStore.setState({ removeBackground: remove })
    const { onSaved } = mountModal('https://cdn/r1/background.webp')
    await act(async () => {
      fireEvent.click(byTestId('room-background-remove'))
    })
    expect(byTestId('room-background-preview').querySelector('img')).toBeNull()
    await clickSave()
    expect(remove).toHaveBeenCalled()
    expect(onSaved.mock.calls).toEqual([[cleared]])
  })

  it('pans the zoomed image by dragging within the frame bounds', async () => {
    loadMock.mockResolvedValue(fakeBitmap())
    encodeMock.mockResolvedValue(new Blob())
    useRoomStore.setState({ uploadBackground: vi.fn().mockResolvedValue(SAVED) })
    mountModal()
    await chooseFile()
    await setRange('room-background-zoom', '2')
    const frame = byTestId('room-background-frame')
    Object.defineProperty(frame, 'clientWidth', { value: 400 })
    Object.defineProperty(frame, 'clientHeight', { value: 225 })
    await act(async () => {
      fireEvent.pointerDown(frame, { pointerId: 1, clientX: 100, clientY: 100 })
      fireEvent.pointerMove(frame, { pointerId: 1, clientX: 140, clientY: 55 })
    })
    await act(async () => {
      fireEvent.pointerMove(frame, { pointerId: 1, clientX: 2000, clientY: 55 })
      fireEvent.pointerUp(frame, { pointerId: 1 })
    })
    expect(byTestId('room-background-pending-image').getAttribute('style')).toContain('left: 0%')
    await clickSave()
    expect(encodeMock).toHaveBeenCalledWith(expect.anything(), { zoom: 2, offsetX: 0.5, offsetY: -0.2 })
  })

  it('moves the image with arrow keys', async () => {
    loadMock.mockResolvedValue(fakeBitmap())
    mountModal()
    await chooseFile()
    await setRange('room-background-zoom', '2')
    await act(async () => {
      fireEvent.keyDown(byTestId('room-background-frame'), { key: 'ArrowRight' })
    })
    expect(byTestId('room-background-pending-image').getAttribute('style')).toContain('left: -48%')
  })

  it('zooms with the mouse wheel and blocks page scroll', async () => {
    loadMock.mockResolvedValue(fakeBitmap())
    mountModal()
    await chooseFile()
    const wheel = new WheelEvent('wheel', { deltaY: -200, bubbles: true, cancelable: true })
    await act(async () => {
      byTestId('room-background-frame').dispatchEvent(wheel)
    })
    expect(wheel.defaultPrevented).toBe(true)
    expect(Number(byTestId<HTMLInputElement>('room-background-zoom').value)).toBeGreaterThan(1)
  })

  it('shows a localized error for oversized files and keeps the modal open', async () => {
    loadMock.mockRejectedValue(new Error('file-too-large'))
    mountModal()
    await chooseFile()
    expect(byTestId('room-background-error').textContent?.trim()).toBe(i18n.t('roomBackground.errorFileTooLarge'))
    expect(byTestId<HTMLButtonElement>('room-background-save').disabled).toBe(true)
  })

  it('reports a save failure without closing', async () => {
    loadMock.mockResolvedValue(fakeBitmap())
    encodeMock.mockResolvedValue(new Blob(['processed']))
    useRoomStore.setState({ uploadBackground: vi.fn().mockRejectedValue(new Error('denied')) })
    const { onClose } = mountModal()
    await chooseFile()
    await clickSave()
    expect(byTestId('room-background-error').textContent?.trim()).toBe(i18n.t('roomBackground.saveError'))
    expect(onClose).not.toHaveBeenCalled()
  })
})
