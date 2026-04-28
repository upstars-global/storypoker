const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

export function generateRoomId(): string {
  return Array.from({ length: 8 }, () =>
    CHARS[Math.floor(Math.random() * CHARS.length)]
  ).join('')
}
