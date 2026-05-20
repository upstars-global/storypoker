import { createAvatar } from '@dicebear/core'
import { bottts, dylan, miniavs } from '@dicebear/collection'

export type AvatarStyle = 'bottts' | 'dylan' | 'miniavs'

export const AVATAR_STYLES: AvatarStyle[] = ['bottts', 'dylan', 'miniavs']

export function useDylanAvatar() {
  function avatarDataUri(seed: string, grayscale = false, style: AvatarStyle = 'bottts'): string {
    const collection = style === 'dylan' ? dylan : style === 'miniavs' ? miniavs : bottts
    const options = style === 'bottts' && grayscale
      ? { seed, baseColor: ['909090'], eyes: ['dizzy'], mouth: ['grill01'] }
      : style === 'dylan'
        ? { seed, backgroundColor: [] }
        : style === 'miniavs'
          ? { seed, backgroundColor: grayscale ? ['cccccc'] : [] }
          : { seed, ...(grayscale ? { backgroundColor: ['cccccc'] } : {}) }
    const avatar = createAvatar(collection as any, options as any)
    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(avatar.toString())))}`
  }

  return { avatarDataUri }
}
