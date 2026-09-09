import { resolveIconName } from '../../app/utils/iconResolver'

export const iconSelector = 'span.sp-icon-root'

export const VIEWPORT = { width: 1440, height: 900 }

const HARNESS_FLAGS = { iconsLucide: false, iconsRounded: true }

export function iconLocator(name: string): string {
  return `span.sp-icon-${resolveIconName(name, HARNESS_FLAGS).replace(':', '-')}`
}
