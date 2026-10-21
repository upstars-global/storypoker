import { decodeImage, encodeWebp } from './imageEncoding'

export const AVATAR_MAX_FILE_BYTES = 5 * 1024 * 1024
export const AVATAR_SIZE = 256
export const AVATAR_ACCEPT = 'image/png,image/jpeg,image/webp'

const ACCEPTED_TYPES = AVATAR_ACCEPT.split(',')

export function isAcceptedImageType(file: File): boolean {
  return ACCEPTED_TYPES.includes(file.type)
}

export async function processAvatarImage(file: File): Promise<Blob> {
  const bitmap = await decodeImage(file, ACCEPTED_TYPES, AVATAR_MAX_FILE_BYTES)
  try {
    const side = Math.min(bitmap.width, bitmap.height)
    const source = { sx: (bitmap.width - side) / 2, sy: (bitmap.height - side) / 2, sw: side, sh: side }
    return await encodeWebp(bitmap, source, AVATAR_SIZE, AVATAR_SIZE, 0.85)
  } finally {
    bitmap.close()
  }
}
