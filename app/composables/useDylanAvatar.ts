import { createAvatar } from '@dicebear/core'
import { dylan } from '@dicebear/collection'

export function useDylanAvatar() {
  function getAvatar(seed: string, grayscale = false): string {
    const avatar = createAvatar(dylan, {
      seed,
      ...(grayscale ? { colorful: false } : {}),
    })
    return avatar.toString()
  }

  function avatarDataUri(seed: string, grayscale = false): string {
    const svg = getAvatar(seed, grayscale)
    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`
  }

  return { avatarDataUri }
}
