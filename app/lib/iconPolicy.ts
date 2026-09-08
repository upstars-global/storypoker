import { _api, iconLoaded } from '@iconify/vue'

function guardEnabled(): boolean {
  return import.meta.env.DEV || import.meta.env.MODE === 'test'
}

export function installIconPolicy(): void {
  if (!guardEnabled()) return
  _api.setFetch((() => Promise.reject(new Error('Iconify network transport is disabled'))) as typeof fetch)
}

export function assertLocalIcon(name: string): void {
  if (!guardEnabled()) return
  if (!iconLoaded(name)) throw new Error(`Missing local icon: ${name}`)
}
