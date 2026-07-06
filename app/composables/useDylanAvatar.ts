import { createAvatar } from '@dicebear/core'
import { bottts, dylan, miniavs } from '@dicebear/collection'

export type AvatarStyle = 'bottts' | 'dylan' | 'miniavs'

export const AVATAR_STYLES: AvatarStyle[] = ['bottts', 'dylan', 'miniavs']

const cache = new Map<string, string>()

export function useDylanAvatar() {
  function avatarDataUri(seed: string, grayscale = false, style: AvatarStyle = 'bottts'): string {
    const key = `${style}|${grayscale ? 1 : 0}|${seed}`
    const cached = cache.get(key)
    if (cached) return cached
    const avatar = style === 'dylan'
      ? createAvatar(dylan, { seed, backgroundColor: [] })
      : style === 'miniavs'
        ? createAvatar(miniavs, { seed, backgroundColor: grayscale ? ['cccccc'] : [] })
        : grayscale
          ? createAvatar(bottts, { seed, baseColor: ['909090'], eyes: ['dizzy'], mouth: ['grill01'] })
          : createAvatar(bottts, { seed })
    const uri = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(avatar.toString())))}`
    cache.set(key, uri)
    return uri
  }

  return { avatarDataUri }
}
