export const SHIELD_GROUPS = ['discipline', 'lead'] as const

export type ShieldGroup = typeof SHIELD_GROUPS[number]

export interface Shield {
  id: string
  labelKey: string
  icon: string
  group: ShieldGroup
}

// A player wears at most one shield per group.
export const MAX_SHIELDS = SHIELD_GROUPS.length

export const SHIELD_CATALOG: Shield[] = [
  { id: 'dev', labelKey: 'shields.labels.dev', icon: 'ic:baseline-code', group: 'discipline' },
  { id: 'qa', labelKey: 'shields.labels.qa', icon: 'ic:baseline-bug-report', group: 'discipline' },

  { id: 'head', labelKey: 'shields.labels.head', icon: 'mingcute:moai-fill', group: 'lead' },
  { id: 'tl', labelKey: 'shields.labels.tl', icon: 'ic:baseline-star', group: 'lead' },
  { id: 'sv', labelKey: 'shields.labels.sv', icon: 'ic:baseline-shield', group: 'lead' },
]

const SHIELD_BY_ID = new Map(SHIELD_CATALOG.map(s => [s.id, s]))

export function getShield(id: string): Shield | undefined {
  return SHIELD_BY_ID.get(id)
}

export function isQaPlayer(shields: string[] | null | undefined): boolean {
  return Boolean(shields?.includes('qa'))
}

export function shieldsForGroup(group: ShieldGroup): Shield[] {
  return SHIELD_CATALOG.filter(s => s.group === group)
}
