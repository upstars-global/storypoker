export const CHIP_GROUPS = ['frontend', 'backend', 'qa', 'product', 'scrum', 'sre', 'lead'] as const

export type ChipGroup = typeof CHIP_GROUPS[number]

export interface Chip {
  id: string
  labelKey: string
  icon: string
  group: ChipGroup
}

export const MAX_CHIPS = 2

// Only these chips route a player's vote into the separate QA pile.
// Stack chips like playwright/qase are cosmetic and do NOT route by themselves.
export const QA_ROUTING_CHIPS = ['qa', 'aqa', 'general-qa', 'manual-qa'] as const

export const CHIP_CATALOG: Chip[] = [
  { id: 'js', labelKey: 'chips.labels.js', icon: 'simple-icons:javascript', group: 'frontend' },
  { id: 'ts', labelKey: 'chips.labels.ts', icon: 'simple-icons:typescript', group: 'frontend' },
  { id: 'vue', labelKey: 'chips.labels.vue', icon: 'simple-icons:vuedotjs', group: 'frontend' },

  { id: 'php', labelKey: 'chips.labels.php', icon: 'simple-icons:php', group: 'backend' },
  { id: 'go', labelKey: 'chips.labels.go', icon: 'simple-icons:go', group: 'backend' },
  { id: 'csharp', labelKey: 'chips.labels.csharp', icon: 'simple-icons:csharp', group: 'backend' },
  { id: 'dotnet', labelKey: 'chips.labels.dotnet', icon: 'simple-icons:dotnet', group: 'backend' },
  { id: 'mongo', labelKey: 'chips.labels.mongo', icon: 'simple-icons:mongodb', group: 'backend' },
  { id: 'postgres', labelKey: 'chips.labels.postgres', icon: 'simple-icons:postgresql', group: 'backend' },

  { id: 'qa', labelKey: 'chips.labels.qa', icon: 'ic:baseline-bug-report', group: 'qa' },
  { id: 'aqa', labelKey: 'chips.labels.aqa', icon: 'ic:baseline-smart-toy', group: 'qa' },
  { id: 'general-qa', labelKey: 'chips.labels.generalQa', icon: 'ic:baseline-fact-check', group: 'qa' },
  { id: 'manual-qa', labelKey: 'chips.labels.manualQa', icon: 'ic:baseline-checklist', group: 'qa' },
  { id: 'playwright', labelKey: 'chips.labels.playwright', icon: 'simple-icons:playwright', group: 'qa' },
  { id: 'qase', labelKey: 'chips.labels.qase', icon: 'simple-icons:qase', group: 'qa' },

  { id: 'strategy', labelKey: 'chips.labels.strategy', icon: 'ic:baseline-lightbulb', group: 'product' },
  { id: 'roadmap', labelKey: 'chips.labels.roadmap', icon: 'ic:baseline-map', group: 'product' },
  { id: 'userflow', labelKey: 'chips.labels.userflow', icon: 'ic:baseline-account-tree', group: 'product' },

  { id: 'velocity', labelKey: 'chips.labels.velocity', icon: 'ic:baseline-speed', group: 'scrum' },
  { id: 'healthcheck', labelKey: 'chips.labels.healthcheck', icon: 'ic:baseline-health-and-safety', group: 'scrum' },
  { id: 'retro', labelKey: 'chips.labels.retro', icon: 'ic:baseline-history', group: 'scrum' },
  { id: 'scrum', labelKey: 'chips.labels.scrum', icon: 'ic:baseline-loop', group: 'scrum' },
  { id: 'kanban', labelKey: 'chips.labels.kanban', icon: 'ic:baseline-view-kanban', group: 'scrum' },
  { id: 'agile', labelKey: 'chips.labels.agile', icon: 'ic:baseline-autorenew', group: 'scrum' },

  { id: 'kubernetes', labelKey: 'chips.labels.kubernetes', icon: 'simple-icons:kubernetes', group: 'sre' },
  { id: 'terraform', labelKey: 'chips.labels.terraform', icon: 'simple-icons:terraform', group: 'sre' },
  { id: 'docker', labelKey: 'chips.labels.docker', icon: 'simple-icons:docker', group: 'sre' },

  { id: 'head', labelKey: 'chips.labels.head', icon: 'ic:baseline-workspace-premium', group: 'lead' },
  { id: 'lead', labelKey: 'chips.labels.lead', icon: 'ic:baseline-star', group: 'lead' },
  { id: 'supervisor', labelKey: 'chips.labels.supervisor', icon: 'ic:baseline-shield', group: 'lead' },
]

const CHIP_BY_ID = new Map(CHIP_CATALOG.map(c => [c.id, c]))

export function getChip(id: string): Chip | undefined {
  return CHIP_BY_ID.get(id)
}

const QA_SET = new Set<string>(QA_ROUTING_CHIPS)

export function isQaPlayer(chips: string[] | null | undefined): boolean {
  return Boolean(chips?.some(id => QA_SET.has(id)))
}

export function chipsForGroup(group: ChipGroup): Chip[] {
  return CHIP_CATALOG.filter(c => c.group === group)
}
