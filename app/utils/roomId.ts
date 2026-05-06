const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

export function generateRoomId(): string {
  return Array.from({ length: 8 }, () =>
    CHARS[Math.floor(Math.random() * CHARS.length)]
  ).join('')
}

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/

export function normalizeRoomSlug(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, '-')
}

export function isValidRoomSlug(slug: string): boolean {
  return SLUG_RE.test(slug)
}
