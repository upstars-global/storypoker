import { describe, expect, it } from 'vitest'
import { detectRoleGroup, formatPlayerName, hasRoleTags, parsePlayerName } from '~/utils/playerRoles'

describe('playerRoles', () => {
  it('formats role-prefixed player names', () => {
    expect(formatPlayerName('DEV', ' Alice ')).toBe('[DEV] Alice')
  })

  it('parses supported uppercase role prefixes', () => {
    expect(parsePlayerName('[FE] Alex')).toEqual({ role: 'FE', nickname: 'Alex' })
    expect(parsePlayerName('Alex')).toEqual({ role: null, nickname: 'Alex' })
  })

  it('maps roles to result groups', () => {
    expect(detectRoleGroup('[DEV] Alex')).toBe('DEV')
    expect(detectRoleGroup('[BE] Alex')).toBe('DEV')
    expect(detectRoleGroup('[FE] Alex')).toBe('DEV')
    expect(detectRoleGroup('[SV] Alex')).toBe('DEV')
    expect(detectRoleGroup('[QA] Alex')).toBe('QA')
    expect(detectRoleGroup('[SM] Alex')).toBe('SM')
    expect(detectRoleGroup('[dev] Alex')).toBeNull()
  })

  it('detects whether names contain supported role tags', () => {
    expect(hasRoleTags(['Alex', '[SM] Sam'])).toBe(true)
    expect(hasRoleTags(['Alex', '[sn] Sam'])).toBe(false)
  })
})
