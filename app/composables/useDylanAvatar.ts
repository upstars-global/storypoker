import { createAvatar } from '@dicebear/core'
import { bottts, dylan } from '@dicebear/collection'

export type AvatarStyle = 'bottts' | 'dylan'

export const AVATAR_STYLES: AvatarStyle[] = ['bottts', 'dylan']

export function useDylanAvatar() {
  function avatarDataUri(seed: string, grayscale = false, style: AvatarStyle = 'bottts'): string {
    const collection = style === 'dylan' ? dylan : bottts
    const options = style === 'bottts' && grayscale
      ? { seed, baseColor: ['909090'], eyes: ['dizzy'], mouth: ['grill01'] }
      : style === 'dylan'
        ? { seed, backgroundColor: [] }
        : { seed, ...(grayscale ? { backgroundColor: ['cccccc'] } : {}) }
    const avatar = createAvatar(collection, options as any)
    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(avatar.toString())))}`
  }

  return { avatarDataUri }
}
