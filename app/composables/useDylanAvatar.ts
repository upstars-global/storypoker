import { Avatar, Style } from '@dicebear/core'
import botttsSchema from '@dicebear/styles/bottts.json'
import dylanSchema from '@dicebear/styles/dylan.json'
import miniavsSchema from '@dicebear/styles/miniavs.json'

export type AvatarStyle = 'bottts' | 'dylan' | 'miniavs'

export const AVATAR_STYLES: AvatarStyle[] = ['bottts', 'dylan', 'miniavs']

const bottts = new Style(botttsSchema)
const dylan = new Style(dylanSchema)
const miniavs = new Style(miniavsSchema)

const cache = new Map<string, string>()

export function useDylanAvatar() {
  function avatarDataUri(seed: string, grayscale = false, style: AvatarStyle = 'bottts'): string {
    const key = `${style}|${grayscale ? 1 : 0}|${seed}`
    const cached = cache.get(key)
    if (cached) return cached
    const avatar = style === 'dylan'
      ? new Avatar(dylan, { seed, backgroundColor: [] })
      : style === 'miniavs'
        ? new Avatar(miniavs, { seed, backgroundColor: grayscale ? ['cccccc'] : [] })
        : grayscale
          ? new Avatar(bottts, { seed, baseColor: ['909090'] })
          : new Avatar(bottts, { seed })
    const uri = avatar.toDataUri()
    cache.set(key, uri)
    return uri
  }

  return { avatarDataUri }
}
