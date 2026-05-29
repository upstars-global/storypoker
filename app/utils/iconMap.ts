import { getFeatureFlagValue } from '~/configs/featureFlags'

const MDI_TO_LUCIDE: Record<string, string> = {
  'ic:baseline-stop': 'lucide:circle-stop',
  'ic:baseline-navigate-before': 'lucide:chevron-left',
  'ic:baseline-close': 'lucide:x',
  'ic:baseline-navigate-next': 'lucide:chevron-right',
  'ic:baseline-pause': 'lucide:circle-pause',
  'ic:baseline-check-circle': 'lucide:check-circle',
  'ic:baseline-play-arrow': 'lucide:circle-play',
  'ic:baseline-account-circle': 'lucide:user-circle',
  'ic:baseline-fast-forward': 'lucide:circle-arrow-right',
  'ic:baseline-fast-rewind': 'lucide:circle-arrow-left',
  'ic:baseline-cancel': 'lucide:circle-x',
  'ic:baseline-terminal': 'lucide:terminal',
  'ic:baseline-settings': 'lucide:settings',
  'ic:baseline-bug-report': 'lucide:bug',
  'ic:baseline-edit': 'lucide:pencil',
  'ic:baseline-fact-check': 'lucide:clipboard-check',
  'ic:baseline-track-changes': 'lucide:target',
  'ic:baseline-dark-mode': 'lucide:moon',
  'ic:baseline-light-mode': 'lucide:sun',
  'ic:baseline-devices': 'lucide:monitor-smartphone',
  'ic:baseline-login': 'lucide:log-in',
  'ic:baseline-more-vert': 'lucide:more-vertical',
  'ic:baseline-storage': 'lucide:database',
  'ic:baseline-person-add': 'lucide:user-plus',
  'ic:baseline-precision-manufacturing': 'lucide:bot',
  'ic:baseline-cloud': 'lucide:cloud',
  'ic:baseline-logout': 'lucide:log-out',
  'ic:baseline-volume-off': 'lucide:volume-x',
  'ic:baseline-person-remove': 'lucide:user-minus',
  'ic:baseline-search': 'lucide:search',
  'ic:baseline-checklist': 'lucide:list-checks',
  'ic:baseline-science': 'lucide:flask-conical',
  'ic:baseline-biotech': 'lucide:microscope',
  'ic:baseline-military-tech': 'lucide:medal',
  'ic:baseline-supervisor-account': 'lucide:user-cog',
  'ic:baseline-arrow-drop-down': 'lucide:chevron-down',
}

let useLucide: boolean | null = null
let useRounded: boolean | null = null

export function mapIconName(name: string): string {
  if (useLucide === null) useLucide = getFeatureFlagValue('iconsLucide')
  if (useRounded === null) useRounded = getFeatureFlagValue('iconsRounded')
  if (useLucide) return MDI_TO_LUCIDE[name] ?? name
  if (useRounded && name.startsWith('ic:baseline-')) {
    return 'ic:round-' + name.slice('ic:baseline-'.length)
  }
  return name
}
