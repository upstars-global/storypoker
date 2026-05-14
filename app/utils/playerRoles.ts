export type RoleGroup = 'DEV' | 'QA' | null

const DEV_RE = /\b(FE|BE|DEV)\b/
const QA_RE = /\b(AQA|QA)\b/

export function detectRoleGroup(name: string): RoleGroup {
  if (!name) return null
  if (DEV_RE.test(name)) return 'DEV'
  if (QA_RE.test(name)) return 'QA'
  return null
}

export function hasRoleTags(names: string[]): boolean {
  return names.some(n => detectRoleGroup(n) !== null)
}
