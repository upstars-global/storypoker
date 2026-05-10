export type RoleGroup = 'DEV' | 'QA' | null

const DEV_PREFIXES = ['[FE ', '[BE ', '[DEV ']
const QA_PREFIXES = ['[QA ', '[AQA ']

export function detectRoleGroup(name: string): RoleGroup {
  if (!name) return null
  if (DEV_PREFIXES.some(p => name.includes(p))) return 'DEV'
  if (QA_PREFIXES.some(p => name.includes(p))) return 'QA'
  return null
}

export function hasRoleTags(names: string[]): boolean {
  return names.some(n => detectRoleGroup(n) !== null)
}
