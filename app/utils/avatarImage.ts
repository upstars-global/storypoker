export const AVATAR_MAX_FILE_BYTES = 5 * 1024 * 1024
export const AVATAR_SIZE = 256
export const AVATAR_ACCEPT = 'image/png,image/jpeg,image/webp'

const ACCEPTED_TYPES = AVATAR_ACCEPT.split(',')

export function isAcceptedImageType(file: File): boolean {
  return ACCEPTED_TYPES.includes(file.type)
}

export async function processAvatarImage(file: File): Promise<Blob> {
  if (!isAcceptedImageType(file)) throw new Error('unsupported-type')
  if (file.size > AVATAR_MAX_FILE_BYTES) throw new Error('file-too-large')

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error('decode-failed')
  }

  try {
    const side = Math.min(bitmap.width, bitmap.height)
    const sx = (bitmap.width - side) / 2
    const sy = (bitmap.height - side) / 2

    if (typeof OffscreenCanvas !== 'undefined') {
      const canvas = new OffscreenCanvas(AVATAR_SIZE, AVATAR_SIZE)
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('decode-failed')
      ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE)
      return await canvas.convertToBlob({ type: 'image/webp', quality: 0.85 })
    }

    const canvas = document.createElement('canvas')
    canvas.width = AVATAR_SIZE
    canvas.height = AVATAR_SIZE
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('decode-failed')
    ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE)
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error('decode-failed')),
        'image/webp',
        0.85,
      )
    })
  } finally {
    bitmap.close()
  }
}
