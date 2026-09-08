import { getFeatureFlagValue } from '~/configs/featureFlags'
import { resolveIconName } from '~/utils/iconResolver'

let useLucide: boolean | null = null
let useRounded: boolean | null = null

export function mapIconName(name: string): string {
  if (useLucide === null) useLucide = getFeatureFlagValue('iconsLucide')
  if (useRounded === null) useRounded = getFeatureFlagValue('iconsRounded')
  return resolveIconName(name, { iconsLucide: useLucide, iconsRounded: useRounded })
}
