export const SHIELD_GROUPS = ['role', 'focus', 'stack', 'qa', 'lead'] as const

export type ShieldGroup = typeof SHIELD_GROUPS[number]

export interface Shield {
  id: string
  labelKey: string
  icon: string
  group: ShieldGroup
}

// A player wears at most one skill shield plus one leadership shield.
const LEAD_GROUP: ShieldGroup = 'lead'

export const SHIELD_CATALOG: Shield[] = [
  { id: 'dev', labelKey: 'shields.labels.dev', icon: 'ic:baseline-terminal', group: 'role' },
  { id: 'qa', labelKey: 'shields.labels.qa', icon: 'ic:baseline-bug-report', group: 'role' },
  { id: 'gqa', labelKey: 'shields.labels.gqa', icon: 'ic:baseline-fact-check', group: 'role' },
  { id: 'po', labelKey: 'shields.labels.po', icon: 'ic:baseline-track-changes', group: 'role' },
  { id: 'sm', labelKey: 'shields.labels.sm', icon: 'app:scrum', group: 'role' },

  { id: 'fe', labelKey: 'shields.labels.fe', icon: 'ic:baseline-devices', group: 'focus' },
  { id: 'be', labelKey: 'shields.labels.be', icon: 'ic:baseline-storage', group: 'focus' },
  { id: 'aqa', labelKey: 'shields.labels.aqa', icon: 'ic:baseline-precision-manufacturing', group: 'focus' },
  { id: 'sre', labelKey: 'shields.labels.sre', icon: 'ic:baseline-cloud', group: 'focus' },

  { id: 'js', labelKey: 'shields.labels.js', icon: 'simple-icons:javascript', group: 'stack' },
  { id: 'ts', labelKey: 'shields.labels.ts', icon: 'simple-icons:typescript', group: 'stack' },
  { id: 'vue', labelKey: 'shields.labels.vue', icon: 'simple-icons:vuedotjs', group: 'stack' },
  { id: 'angular', labelKey: 'shields.labels.angular', icon: 'simple-icons:angular', group: 'stack' },
  { id: 'react', labelKey: 'shields.labels.react', icon: 'simple-icons:react', group: 'stack' },
  { id: 'next', labelKey: 'shields.labels.next', icon: 'simple-icons:nextdotjs', group: 'stack' },
  { id: 'nuxt', labelKey: 'shields.labels.nuxt', icon: 'simple-icons:nuxtdotjs', group: 'stack' },
  { id: 'jquery', labelKey: 'shields.labels.jquery', icon: 'simple-icons:jquery', group: 'stack' },
  { id: 'html', labelKey: 'shields.labels.html', icon: 'simple-icons:html5', group: 'stack' },
  { id: 'css', labelKey: 'shields.labels.css', icon: 'simple-icons:css3', group: 'stack' },
  { id: 'tailwind', labelKey: 'shields.labels.tailwind', icon: 'simple-icons:tailwindcss', group: 'stack' },
  { id: 'node', labelKey: 'shields.labels.node', icon: 'simple-icons:nodedotjs', group: 'stack' },
  { id: 'php', labelKey: 'shields.labels.php', icon: 'simple-icons:php', group: 'stack' },
  { id: 'symfony', labelKey: 'shields.labels.symfony', icon: 'simple-icons:symfony', group: 'stack' },
  { id: 'go', labelKey: 'shields.labels.go', icon: 'simple-icons:go', group: 'stack' },
  { id: 'dotnet', labelKey: 'shields.labels.dotnet', icon: 'simple-icons:dotnet', group: 'stack' },
  { id: 'csharp', labelKey: 'shields.labels.csharp', icon: 'simple-icons:csharp', group: 'stack' },
  { id: 'python', labelKey: 'shields.labels.python', icon: 'simple-icons:python', group: 'stack' },
  { id: 'django', labelKey: 'shields.labels.django', icon: 'simple-icons:django', group: 'stack' },
  { id: 'mongo', labelKey: 'shields.labels.mongo', icon: 'simple-icons:mongodb', group: 'stack' },
  { id: 'postgres', labelKey: 'shields.labels.postgres', icon: 'simple-icons:postgresql', group: 'stack' },
  { id: 'mysql', labelKey: 'shields.labels.mysql', icon: 'simple-icons:mysql', group: 'stack' },
  { id: 'redis', labelKey: 'shields.labels.redis', icon: 'simple-icons:redis', group: 'stack' },
  { id: 'kafka', labelKey: 'shields.labels.kafka', icon: 'simple-icons:apachekafka', group: 'stack' },
  { id: 'wordpress', labelKey: 'shields.labels.wordpress', icon: 'simple-icons:wordpress', group: 'stack' },
  { id: 'github', labelKey: 'shields.labels.github', icon: 'simple-icons:github', group: 'stack' },
  { id: 'gitlab', labelKey: 'shields.labels.gitlab', icon: 'simple-icons:gitlab', group: 'stack' },
  { id: 'android', labelKey: 'shields.labels.android', icon: 'simple-icons:android', group: 'stack' },
  { id: 'apple', labelKey: 'shields.labels.apple', icon: 'simple-icons:apple', group: 'stack' },

  { id: 'vitest', labelKey: 'shields.labels.vitest', icon: 'simple-icons:vitest', group: 'qa' },
  { id: 'playwright', labelKey: 'shields.labels.playwright', icon: 'simple-icons:playwright', group: 'qa' },
  { id: 'postman', labelKey: 'shields.labels.postman', icon: 'simple-icons:postman', group: 'qa' },
  { id: 'argocd', labelKey: 'shields.labels.argocd', icon: 'simple-icons:argo', group: 'qa' },
  { id: 'netlify', labelKey: 'shields.labels.netlify', icon: 'simple-icons:netlify', group: 'qa' },
  { id: 'firebase', labelKey: 'shields.labels.firebase', icon: 'simple-icons:firebase', group: 'qa' },
  { id: 'supabase', labelKey: 'shields.labels.supabase', icon: 'simple-icons:supabase', group: 'qa' },
  { id: 'pwa', labelKey: 'shields.labels.pwa', icon: 'simple-icons:pwa', group: 'qa' },
  { id: 'exploratory', labelKey: 'shields.labels.exploratory', icon: 'ic:baseline-search', group: 'qa' },
  { id: 'testcases', labelKey: 'shields.labels.testcases', icon: 'ic:baseline-checklist', group: 'qa' },
  { id: 'testlab', labelKey: 'shields.labels.testlab', icon: 'ic:baseline-science', group: 'qa' },
  { id: 'experiment', labelKey: 'shields.labels.experiment', icon: 'ic:baseline-biotech', group: 'qa' },

  { id: 'head', labelKey: 'shields.labels.head', icon: 'game-icons:moai', group: 'lead' },
  { id: 'tl', labelKey: 'shields.labels.tl', icon: 'ic:baseline-military-tech', group: 'lead' },
  { id: 'sv', labelKey: 'shields.labels.sv', icon: 'ic:baseline-supervisor-account', group: 'lead' },
]

const SHIELD_BY_ID = new Map(SHIELD_CATALOG.map(s => [s.id, s]))

export function getShield(id: string): Shield | undefined {
  return SHIELD_BY_ID.get(id)
}

export const PLAYER_ROLES = [
  { tag: 'DEV', shield: 'dev' },
  { tag: 'BE', shield: 'be' },
  { tag: 'FE', shield: 'fe' },
  { tag: 'QA', shield: 'qa' },
  { tag: 'GQA', shield: 'gqa' },
  { tag: 'AQA', shield: 'aqa' },
  { tag: 'PO', shield: 'po' },
  { tag: 'SM', shield: 'sm' },
] as const

const ROLE_ORDER = new Map<string, number>(PLAYER_ROLES.map((r, i) => [r.tag, i]))

export function roleTagOrder(tag: string | null): number {
  if (!tag) return Number.MAX_SAFE_INTEGER
  return ROLE_ORDER.get(tag) ?? Number.MAX_SAFE_INTEGER - 1
}

const ROLE_TAG_BY_SHIELD = new Map<string, string>(PLAYER_ROLES.map(r => [r.shield, r.tag]))

export const CUSTOM_SHIELD_PREFIX = 'custom:'

export function shieldForRoleTag(tag: string): string {
  const preset = PLAYER_ROLES.find(r => r.tag === tag)
  return preset ? preset.shield : CUSTOM_SHIELD_PREFIX + tag
}

export function roleTagForShields(shields: string[] | null | undefined): string | null {
  for (const id of shields ?? []) {
    const tag = ROLE_TAG_BY_SHIELD.get(id)
    if (tag) return tag
    if (id.startsWith(CUSTOM_SHIELD_PREFIX)) return id.slice(CUSTOM_SHIELD_PREFIX.length)
  }
  return null
}

function isLeadShield(id: string): boolean {
  return getShield(id)?.group === LEAD_GROUP
}

export function toggleShield(selected: string[], shield: Shield): string[] {
  if (selected.includes(shield.id)) {
    return selected.filter(id => id !== shield.id)
  }
  const keepingLead = shield.group === LEAD_GROUP
  const next = [...selected.filter(id => isLeadShield(id) !== keepingLead), shield.id]
  return next.sort((a, b) => Number(isLeadShield(a)) - Number(isLeadShield(b)))
}

// QA disciplines route a player's vote into the separate QA pile.
const QA_SHIELDS = new Set(['qa', 'aqa', 'gqa'])

export function isQaPlayer(shields: string[] | null | undefined): boolean {
  return Boolean(shields?.some(id => QA_SHIELDS.has(id)))
}

export function shieldsForGroup(group: ShieldGroup): Shield[] {
  return SHIELD_CATALOG.filter(s => s.group === group)
}
