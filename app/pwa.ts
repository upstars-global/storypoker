import { registerSW } from 'virtual:pwa-register'
import { appUpdateStore } from '~/hooks/useAppUpdate'

const UPDATE_CHECK_MS = 15 * 60_000
const UPDATE_APPLY_TIMEOUT_MS = 10_000

function watchForUpdates(swUrl: string, registration: ServiceWorkerRegistration) {
  const check = async () => {
    if (!navigator.onLine || registration.installing) return
    const response = await fetch(swUrl, { cache: 'no-store' }).catch(() => null)
    if (response?.status === 200) await registration.update().catch(() => {})
  }
  setInterval(check, UPDATE_CHECK_MS)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void check()
  })
}

function watchForTakeover(onTakeover: () => void) {
  let controlled = Boolean(navigator.serviceWorker.controller)
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (controlled) onTakeover()
    controlled = true
  })
}

async function applyUpdate(updateServiceWorker: () => Promise<void>) {
  const registration = await navigator.serviceWorker.getRegistration()
  if (!registration?.waiting) {
    window.location.reload()
    return
  }
  navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true })
  setTimeout(() => window.location.reload(), UPDATE_APPLY_TIMEOUT_MS)
  await updateServiceWorker()
}

export function initAppUpdate() {
  const { scheduleUpdate } = appUpdateStore.getState()
  const scheduleApply = () => scheduleUpdate(() => void applyUpdate(updateServiceWorker))
  if ('serviceWorker' in navigator) watchForTakeover(scheduleApply)
  const updateServiceWorker = registerSW({
    immediate: true,
    onNeedRefresh: scheduleApply,
    onNeedReload: scheduleApply,
    onRegisteredSW: (swUrl, registration) => {
      if (registration) watchForUpdates(swUrl, registration)
    },
  })
}
