import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { UPDATE_IDLE_MS, UPDATE_PROMPT_MS } from '~/hooks/useAppUpdate'

type AppUpdateModule = typeof import('~/hooks/useAppUpdate')

let useAppUpdate: AppUpdateModule['useAppUpdate']
let appUpdateStore: AppUpdateModule['appUpdateStore']

let visibility: DocumentVisibilityState = 'visible'

function setVisibility(state: DocumentVisibilityState) {
  visibility = state
  document.dispatchEvent(new Event('visibilitychange'))
}

function renderAppUpdate() {
  return renderHook(() => useAppUpdate()).result
}

function keepTabBusyUntilPrompt() {
  for (let elapsed = 0; elapsed < UPDATE_PROMPT_MS; elapsed += UPDATE_IDLE_MS / 2) {
    window.dispatchEvent(new Event('keydown'))
    act(() => vi.advanceTimersByTime(UPDATE_IDLE_MS / 2))
  }
}

describe('useAppUpdate', () => {
  beforeEach(async () => {
    vi.resetModules()
    ;({ useAppUpdate, appUpdateStore } = await import('~/hooks/useAppUpdate'))
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
    appUpdateStore.getState().scheduleUpdate(apply)
    expect(apply).toHaveBeenCalledOnce()
  })

  it('waits while the tab is visible and applies once it becomes hidden', () => {
    const apply = vi.fn()
    appUpdateStore.getState().scheduleUpdate(apply)
    expect(apply).not.toHaveBeenCalled()

    setVisibility('hidden')
    expect(apply).toHaveBeenCalledOnce()
  })

  it('applies after the user stays idle on a visible tab', () => {
    const apply = vi.fn()
    appUpdateStore.getState().scheduleUpdate(apply)

    vi.advanceTimersByTime(UPDATE_IDLE_MS - 1000)
    expect(apply).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1000)
    expect(apply).toHaveBeenCalledOnce()
  })

  it('restarts the idle wait on user activity', () => {
    const apply = vi.fn()
    appUpdateStore.getState().scheduleUpdate(apply)

    vi.advanceTimersByTime(UPDATE_IDLE_MS - 1000)
    window.dispatchEvent(new Event('pointerdown'))
    vi.advanceTimersByTime(UPDATE_IDLE_MS - 1000)
    expect(apply).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1000)
    expect(apply).toHaveBeenCalledOnce()
  })

  it('shows the prompt when the user keeps the tab busy, and reloads on demand', () => {
    const apply = vi.fn()
    const result = renderAppUpdate()
    act(() => result.current.scheduleUpdate(apply))

    keepTabBusyUntilPrompt()
    expect(apply).not.toHaveBeenCalled()
    expect(result.current.promptVisible).toBe(true)

    act(() => result.current.applyUpdateNow())
    expect(apply).toHaveBeenCalledOnce()
    expect(result.current.promptVisible).toBe(false)
  })

  it('holds the update during a countdown and applies it once the countdown ends', () => {
    const apply = vi.fn()
    const { scheduleUpdate, holdUpdate } = appUpdateStore.getState()
    holdUpdate(true)
    scheduleUpdate(apply)

    setVisibility('hidden')
    vi.advanceTimersByTime(UPDATE_IDLE_MS)
    expect(apply).not.toHaveBeenCalled()

    holdUpdate(false)
    expect(apply).toHaveBeenCalledOnce()
  })

  it('hides the prompt once a reload on demand is queued behind a countdown', () => {
    const apply = vi.fn()
    const result = renderAppUpdate()
    act(() => result.current.scheduleUpdate(apply))
    keepTabBusyUntilPrompt()
    expect(result.current.promptVisible).toBe(true)

    act(() => {
      result.current.holdUpdate(true)
      result.current.applyUpdateNow()
    })
    expect(apply).not.toHaveBeenCalled()
    expect(result.current.promptVisible).toBe(false)

    act(() => result.current.holdUpdate(false))
    expect(apply).toHaveBeenCalledOnce()
  })

  it('does not show the prompt while an update is queued behind a countdown', () => {
    const apply = vi.fn()
    const result = renderAppUpdate()
    act(() => {
      result.current.holdUpdate(true)
      result.current.scheduleUpdate(apply)
    })

    act(() => vi.advanceTimersByTime(UPDATE_PROMPT_MS))
    expect(apply).not.toHaveBeenCalled()
    expect(result.current.promptVisible).toBe(false)

    act(() => result.current.holdUpdate(false))
    expect(apply).toHaveBeenCalledOnce()
  })

  it('applies right away on a hidden tab once a countdown ends', () => {
    visibility = 'hidden'
    const apply = vi.fn()
    const { scheduleUpdate, holdUpdate } = appUpdateStore.getState()
    holdUpdate(true)
    scheduleUpdate(apply)
    expect(apply).not.toHaveBeenCalled()

    holdUpdate(false)
    expect(apply).toHaveBeenCalledOnce()
  })

  it('applies only once and ignores a second update while one is pending', () => {
    const first = vi.fn()
    const second = vi.fn()
    const { scheduleUpdate } = appUpdateStore.getState()
    scheduleUpdate(first)
    scheduleUpdate(second)

    setVisibility('hidden')
    setVisibility('visible')
    setVisibility('hidden')
    vi.advanceTimersByTime(UPDATE_PROMPT_MS)
    expect(first).toHaveBeenCalledOnce()
    expect(second).not.toHaveBeenCalled()
  })

  it('shares the prompt state between components', () => {
    const first = renderAppUpdate()
    const second = renderAppUpdate()
    act(() => first.current.scheduleUpdate(vi.fn()))

    act(() => vi.advanceTimersByTime(UPDATE_PROMPT_MS))
    expect(second.current.promptVisible).toBe(true)
  })
})
