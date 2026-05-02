import { createAvatar } from '@dicebear/core'
import { bottts } from '@dicebear/collection'

export function useDylanAvatar() {
  function avatarDataUri(seed: string, grayscale = false): string {
    const avatar = createAvatar(bottts, {
      seed,
      ...(grayscale ? { baseColor: ['909090'], eyes: ['dizzy'], mouth: ['grill01'] } : {}),
    })
    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(avatar.toString())))}`
  }

  return { avatarDataUri }
}
