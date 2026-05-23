export const PLAYER_ROLES = ['DEV', 'QA', 'BE', 'FE', 'SV', 'SM'] as const

export type PlayerRole = typeof PLAYER_ROLES[number]
export type RoleGroup = 'DEV' | 'QA' | 'SM' | null

const ROLE_RE = /^\[(DEV|QA|BE|FE|SV|SM)\]\s+(.+)$/

export function formatPlayerName(role: PlayerRole, nickname: string): string {
  return `[${role}] ${nickname.trim()}`
}

export function parsePlayerName(name: string): { role: PlayerRole | null; nickname: string } {
  const trimmed = name.trim()
  const match = trimmed.match(ROLE_RE)
  if (!match) return { role: null, nickname: trimmed }
  return { role: match[1] as PlayerRole, nickname: (match[2] ?? '').trim() }
}

export function detectRoleGroup(name: string): RoleGroup {
  const { role } = parsePlayerName(name)
  if (!role) return null
  if (role === 'QA') return 'QA'
  if (role === 'SM') return 'SM'
  return 'DEV'
}

export function hasRoleTags(names: string[]): boolean {
  return names.some(n => detectRoleGroup(n) !== null)
}
