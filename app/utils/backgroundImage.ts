import { decodeImage, encodeWebp, type SourceRect } from './imageEncoding'

export const BACKGROUND_MAX_FILE_BYTES = 10 * 1024 * 1024
export const BACKGROUND_MAX_WIDTH = 1920
export const BACKGROUND_ASPECT = 16 / 9
export const BACKGROUND_MAX_ZOOM = 3
export const BACKGROUND_ACCEPT = 'image/png,image/jpeg,image/webp'
export const BACKGROUND_MIN_OPACITY = 0.1
export const BACKGROUND_DEFAULT_OPACITY = 0.65

const ACCEPTED_TYPES = BACKGROUND_ACCEPT.split(',')

export interface Framing {
  zoom: number
  offsetX: number
  offsetY: number
}

export const DEFAULT_FRAMING: Framing = { zoom: 1, offsetX: 0, offsetY: 0 }

export function framedSize(imageWidth: number, imageHeight: number, zoom: number): { width: number; height: number } {
  const ratio = imageWidth / imageHeight / BACKGROUND_ASPECT
  return { width: zoom * Math.max(1, ratio), height: zoom * Math.max(1, 1 / ratio) }
}

export function clampFraming(framing: Framing, imageWidth: number, imageHeight: number): Framing {
  const zoom = Math.min(BACKGROUND_MAX_ZOOM, Math.max(1, framing.zoom))
  const size = framedSize(imageWidth, imageHeight, zoom)
  const maxX = (size.width - 1) / 2
  const maxY = (size.height - 1) / 2
  return {
    zoom,
    offsetX: Math.min(maxX, Math.max(-maxX, framing.offsetX)),
    offsetY: Math.min(maxY, Math.max(-maxY, framing.offsetY)),
  }
}

export function framingSourceRect(framing: Framing, imageWidth: number, imageHeight: number): SourceRect {
  const size = framedSize(imageWidth, imageHeight, framing.zoom)
  const left = (1 - size.width) / 2 + framing.offsetX
  const top = (1 - size.height) / 2 + framing.offsetY
  const sw = imageWidth / size.width
  const sh = imageHeight / size.height
  return { sx: -left * sw, sy: -top * sh, sw, sh }
}

export function backgroundOutputSize(source: SourceRect): { width: number; height: number } {
  const width = Math.max(1, Math.min(BACKGROUND_MAX_WIDTH, Math.round(source.sw)))
  return { width, height: Math.max(1, Math.round(width / BACKGROUND_ASPECT)) }
}

export function clampOpacity(value: number | null | undefined): number {
  if (value == null || !Number.isFinite(value)) return BACKGROUND_DEFAULT_OPACITY
  return Math.min(1, Math.max(BACKGROUND_MIN_OPACITY, Math.round(value * 100) / 100))
}

export function backgroundTint(opacity: number | null | undefined): string {
  const veil = Math.round((1 - clampOpacity(opacity)) * 100)
  return `color-mix(in srgb, var(--bg-app) ${veil}%, transparent)`
}

export function loadBackgroundImage(file: File): Promise<ImageBitmap> {
  return decodeImage(file, ACCEPTED_TYPES, BACKGROUND_MAX_FILE_BYTES)
}

export function encodeBackground(bitmap: ImageBitmap, framing: Framing): Promise<Blob> {
  const source = framingSourceRect(clampFraming(framing, bitmap.width, bitmap.height), bitmap.width, bitmap.height)
  const output = backgroundOutputSize(source)
  return encodeWebp(bitmap, source, output.width, output.height, 0.8)
}
