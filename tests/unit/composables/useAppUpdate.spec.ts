import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { UPDATE_IDLE_MS, UPDATE_PROMPT_MS } from '~/composables/useAppUpdate'

let useAppUpdate: typeof import('~/composables/useAppUpdate').useAppUpdate

let visibility: DocumentVisibilityState = 'visible'

function setVisibility(state: DocumentVisibilityState) {
  visibility = state
  document.dispatchEvent(new Event('visibilitychange'))
}

describe('useAppUpdate', () => {
  beforeEach(async () => {
    vi.resetModules()
    ;({ useAppUpdate } = await import('~/composables/useAppUpdate'))
    vi.useFakeTimers()
    visibility = 'visible'
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('applies the update right away when the tab is hidden', () => {
    visibility = 'hidden'
    const apply = vi.fn()
    useAppUpdate().scheduleUpdate(apply)
    expect(apply).toHaveBeenCalledOnce()
  })

  it('waits while the tab is visible and applies once it becomes hidden', () => {
    const apply = vi.fn()
    useAppUpdate().scheduleUpdate(apply)
    expect(apply).not.toHaveBeenCalled()

    setVisibility('hidden')
    expect(apply).toHaveBeenCalledOnce()
  })

  it('applies after the user stays idle on a visible tab', () => {
    const apply = vi.fn()
    useAppUpdate().scheduleUpdate(apply)

    vi.advanceTimersByTime(UPDATE_IDLE_MS - 1000)
    expect(apply).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1000)
    expect(apply).toHaveBeenCalledOnce()
  })

  it('restarts the idle wait on user activity', () => {
    const apply = vi.fn()
    useAppUpdate().scheduleUpdate(apply)

    vi.advanceTimersByTime(UPDATE_IDLE_MS - 1000)
    window.dispatchEvent(new Event('pointerdown'))
    vi.advanceTimersByTime(UPDATE_IDLE_MS - 1000)
    expect(apply).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1000)
    expect(apply).toHaveBeenCalledOnce()
  })

  it('shows the prompt when the user keeps the tab busy, and reloads on demand', () => {
    const apply = vi.fn()
    const { scheduleUpdate, promptVisible, applyUpdateNow } = useAppUpdate()
    scheduleUpdate(apply)

    for (let elapsed = 0; elapsed < UPDATE_PROMPT_MS; elapsed += UPDATE_IDLE_MS / 2) {
      window.dispatchEvent(new Event('keydown'))
      vi.advanceTimersByTime(UPDATE_IDLE_MS / 2)
    }
    expect(apply).not.toHaveBeenCalled()
    expect(promptVisible.value).toBe(true)

    applyUpdateNow()
    expect(apply).toHaveBeenCalledOnce()
    expect(promptVisible.value).toBe(false)
  })

  it('holds the update during a countdown and applies it once the countdown ends', () => {
    const apply = vi.fn()
    const { scheduleUpdate, holdUpdate } = useAppUpdate()
    holdUpdate(true)
    scheduleUpdate(apply)

    setVisibility('hidden')
    vi.advanceTimersByTime(UPDATE_IDLE_MS)
    expect(apply).not.toHaveBeenCalled()

    holdUpdate(false)
    expect(apply).toHaveBeenCalledOnce()
  })

  it('applies right away on a hidden tab once a countdown ends', () => {
    visibility = 'hidden'
    const apply = vi.fn()
    const { scheduleUpdate, holdUpdate } = useAppUpdate()
    holdUpdate(true)
    scheduleUpdate(apply)
    expect(apply).not.toHaveBeenCalled()

    holdUpdate(false)
    expect(apply).toHaveBeenCalledOnce()
  })

  it('applies only once and ignores a second update while one is pending', () => {
    const first = vi.fn()
    const second = vi.fn()
    const { scheduleUpdate } = useAppUpdate()
    scheduleUpdate(first)
    scheduleUpdate(second)

    setVisibility('hidden')
    setVisibility('visible')
    setVisibility('hidden')
    vi.advanceTimersByTime(UPDATE_PROMPT_MS)
    expect(first).toHaveBeenCalledOnce()
    expect(second).not.toHaveBeenCalled()
  })
})
