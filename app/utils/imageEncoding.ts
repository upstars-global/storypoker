export interface SourceRect {
  sx: number
  sy: number
  sw: number
  sh: number
}

export async function decodeImage(file: File, acceptedTypes: readonly string[], maxBytes: number): Promise<ImageBitmap> {
  if (!acceptedTypes.includes(file.type)) throw new Error('unsupported-type')
  if (file.size > maxBytes) throw new Error('file-too-large')
  try {
    return await createImageBitmap(file)
  } catch {
    throw new Error('decode-failed')
  }
}

export async function encodeWebp(
  bitmap: ImageBitmap,
  source: SourceRect,
  width: number,
  height: number,
  quality: number,
): Promise<Blob> {
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(width, height)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('decode-failed')
    ctx.drawImage(bitmap, source.sx, source.sy, source.sw, source.sh, 0, 0, width, height)
    return await canvas.convertToBlob({ type: 'image/webp', quality })
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('decode-failed')
  ctx.drawImage(bitmap, source.sx, source.sy, source.sw, source.sh, 0, 0, width, height)
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      blob => blob ? resolve(blob) : reject(new Error('decode-failed')),
      'image/webp',
      quality,
    )
  })
}
