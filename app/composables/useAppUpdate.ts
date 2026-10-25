export const UPDATE_IDLE_MS = 2 * 60_000
export const UPDATE_PROMPT_MS = 30 * 60_000

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const

const promptVisible = { value: false }
let pendingApply: (() => void) | null = null
let updateHeld = false
let heldRun: (() => void) | null = null

export function useAppUpdate() {
  function scheduleUpdate(apply: () => void) {
    if (pendingApply) return

    let idleTimer: ReturnType<typeof setTimeout> | undefined
    const promptTimer = setTimeout(() => { promptVisible.value = true }, UPDATE_PROMPT_MS)
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
      promptVisible.value = false
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
  }

  function applyUpdateNow() {
    pendingApply?.()
  }

  function holdUpdate(held: boolean) {
    updateHeld = held
    if (held || !heldRun) return
    const run = heldRun
    heldRun = null
    run()
  }

  return { promptVisible, scheduleUpdate, applyUpdateNow, holdUpdate }
}
