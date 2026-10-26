import { createStore, useStore } from 'zustand'

export const UPDATE_IDLE_MS = 2 * 60_000
export const UPDATE_PROMPT_MS = 30 * 60_000

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const

type AppUpdateState = {
  promptVisible: boolean
  scheduleUpdate: (apply: () => void) => void
  applyUpdateNow: () => void
  holdUpdate: (held: boolean) => void
}

export const appUpdateStore = createStore<AppUpdateState>()((set) => {
  let pendingApply: (() => void) | null = null
  let updateHeld = false
  let heldRun: (() => void) | null = null

  return {
    promptVisible: false,

    scheduleUpdate(apply) {
      if (pendingApply) return

      let idleTimer: ReturnType<typeof setTimeout> | undefined
      const promptTimer = setTimeout(() => set({ promptVisible: true }), UPDATE_PROMPT_MS)
      const restartIdleTimer = () => {
        clearTimeout(idleTimer)
        idleTimer = setTimeout(run, UPDATE_IDLE_MS)
      }
      const onVisibilityChange = () => {
        if (document.visibilityState === 'hidden') run()
      }
      const stopWatching = () => {
        clearTimeout(idleTimer)
        clearTimeout(promptTimer)
        document.removeEventListener('visibilitychange', onVisibilityChange)
        for (const event of ACTIVITY_EVENTS) window.removeEventListener(event, restartIdleTimer, true)
      }
      let applied = false
      function run() {
        if (applied) return
        stopWatching()
        set({ promptVisible: false })
        if (updateHeld) {
          heldRun = run
          return
        }
        applied = true
        apply()
      }

      pendingApply = run
      document.addEventListener('visibilitychange', onVisibilityChange)
      for (const event of ACTIVITY_EVENTS) window.addEventListener(event, restartIdleTimer, { capture: true, passive: true })
      restartIdleTimer()
      if (document.visibilityState === 'hidden') run()
    },

    applyUpdateNow() {
      pendingApply?.()
    },

    holdUpdate(held) {
      updateHeld = held
      if (held || !heldRun) return
      const run = heldRun
      heldRun = null
      run()
    },
  }
})

export function useAppUpdate() {
  const promptVisible = useStore(appUpdateStore, s => s.promptVisible)
  const { scheduleUpdate, applyUpdateNow, holdUpdate } = appUpdateStore.getState()
  return { promptVisible, scheduleUpdate, applyUpdateNow, holdUpdate }
}
