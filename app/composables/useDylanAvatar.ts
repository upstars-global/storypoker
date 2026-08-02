import { Avatar, Style } from '@dicebear/core'
import botttsSchema from '@dicebear/styles/bottts.json'
import dylanSchema from '@dicebear/styles/dylan.json'
import miniavsSchema from '@dicebear/styles/miniavs.json'
import { getSupabase } from '~/lib/supabase-instance'
import type { UserProfile } from '~/stores/profiles'

export type AvatarStyle = 'bottts' | 'dylan' | 'miniavs'

export interface AvatarSrc {
  src: string
  cssGrayscale: boolean
}

export const AVATAR_STYLES: AvatarStyle[] = ['bottts', 'dylan', 'miniavs']

const bottts = new Style(botttsSchema)
const dylan = new Style(dylanSchema)
const miniavs = new Style(miniavsSchema)

const cache = new Map<string, string>()

export function avatarDisplayUrl(path: string, updatedAt: string | null | undefined): string {
  const { publicUrl } = getSupabase().storage.from('avatars').getPublicUrl(path).data
  return `${publicUrl}?v=${encodeURIComponent(updatedAt ?? '')}`
}

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

  function avatarSrcFor(profile: UserProfile | null, fallbackSeed: string, grayscale: boolean): AvatarSrc {
    if (profile?.avatar_url) {
      return {
        src: avatarDisplayUrl(profile.avatar_url, profile.updated_at),
        cssGrayscale: grayscale,
      }
    }
    if (profile) {
      return { src: avatarDataUri(profile.avatar_seed, grayscale, profile.avatar_style), cssGrayscale: false }
    }
    return { src: avatarDataUri(fallbackSeed, grayscale, 'bottts'), cssGrayscale: false }
  }

  return { avatarDataUri, avatarSrcFor }
}
