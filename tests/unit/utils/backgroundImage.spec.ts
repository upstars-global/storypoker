import { describe, it, expect } from 'vitest'
import {
  BACKGROUND_MAX_FILE_BYTES,
  DEFAULT_FRAMING,
  backgroundOutputSize,
  clampFraming,
  framedSize,
  framingSourceRect,
  loadBackgroundImage,
} from '~/utils/backgroundImage'

function plain<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).map(([key, v]) => [key, typeof v === 'number' ? v + 0 : v])) as T
}

function makeFile(type: string, size = 1024): File {
  const file = new File([new Uint8Array(Math.min(size, 1024))], 'background', { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

describe('framedSize', () => {
  it('covers the 16:9 frame along the tighter side', () => {
    expect(framedSize(1600, 900, 1)).toEqual({ width: 1, height: 1 })
    expect(framedSize(3200, 900, 1)).toEqual({ width: 2, height: 1 })
    expect(framedSize(800, 900, 2)).toEqual({ width: 2, height: 4 })
  })
})

describe('clampFraming', () => {
  it('keeps zoom within 1..3', () => {
    expect(clampFraming({ zoom: 0.2, offsetX: 0, offsetY: 0 }, 1600, 900).zoom).toBe(1)
    expect(clampFraming({ zoom: 9, offsetX: 0, offsetY: 0 }, 1600, 900).zoom).toBe(3)
  })

  it('never lets the image uncover the frame', () => {
    expect(plain(clampFraming({ zoom: 1, offsetX: 0.4, offsetY: -0.4 }, 1600, 900))).toEqual({ zoom: 1, offsetX: 0, offsetY: 0 })
    expect(plain(clampFraming({ zoom: 2, offsetX: 5, offsetY: -5 }, 1600, 900))).toEqual({ zoom: 2, offsetX: 0.5, offsetY: -0.5 })
  })
})

describe('framingSourceRect', () => {
  it('crops the centered 16:9 band by default', () => {
    expect(plain(framingSourceRect(DEFAULT_FRAMING, 3200, 900))).toEqual({ sx: 800, sy: 0, sw: 1600, sh: 900 })
    expect(plain(framingSourceRect(DEFAULT_FRAMING, 1600, 1800))).toEqual({ sx: 0, sy: 450, sw: 1600, sh: 900 })
  })

  it('zooms into the center and pans to the edges', () => {
    expect(plain(framingSourceRect({ zoom: 2, offsetX: 0, offsetY: 0 }, 1600, 900))).toEqual({ sx: 400, sy: 225, sw: 800, sh: 450 })
    expect(plain(framingSourceRect({ zoom: 2, offsetX: 0.5, offsetY: 0.5 }, 1600, 900))).toEqual({ sx: 0, sy: 0, sw: 800, sh: 450 })
  })
})

describe('backgroundOutputSize', () => {
  it('caps the width at 1920 and keeps 16:9 without upscaling', () => {
    expect(backgroundOutputSize({ sx: 0, sy: 0, sw: 4000, sh: 2250 })).toEqual({ width: 1920, height: 1080 })
    expect(backgroundOutputSize({ sx: 0, sy: 0, sw: 800, sh: 450 })).toEqual({ width: 800, height: 450 })
  })
})

describe('loadBackgroundImage', () => {
  it('rejects unsupported types before decoding', async () => {
    await expect(loadBackgroundImage(makeFile('image/gif'))).rejects.toThrow('unsupported-type')
  })

  it('rejects files over the size limit', async () => {
    await expect(loadBackgroundImage(makeFile('image/jpeg', BACKGROUND_MAX_FILE_BYTES + 1))).rejects.toThrow('file-too-large')
  })

  it('rejects undecodable input as decode-failed', async () => {
    await expect(loadBackgroundImage(makeFile('image/png'))).rejects.toThrow('decode-failed')
  })
})
