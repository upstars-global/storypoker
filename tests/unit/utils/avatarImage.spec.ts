import { describe, it, expect } from 'vitest'
import {
  AVATAR_MAX_FILE_BYTES,
  isAcceptedImageType,
  processAvatarImage,
} from '~/utils/avatarImage'

function makeFile(type: string, size = 1024): File {
  const file = new File([new Uint8Array(Math.min(size, 1024))], 'avatar', { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

describe('isAcceptedImageType', () => {
  it('accepts png, jpeg and webp', () => {
    expect(isAcceptedImageType(makeFile('image/png'))).toBe(true)
    expect(isAcceptedImageType(makeFile('image/jpeg'))).toBe(true)
    expect(isAcceptedImageType(makeFile('image/webp'))).toBe(true)
  })

  it('rejects other types', () => {
    expect(isAcceptedImageType(makeFile('image/gif'))).toBe(false)
    expect(isAcceptedImageType(makeFile('text/plain'))).toBe(false)
  })
})

describe('processAvatarImage', () => {
  it('rejects unsupported types before decoding', async () => {
    await expect(processAvatarImage(makeFile('image/gif'))).rejects.toThrow('unsupported-type')
  })

  it('rejects files over the size limit', async () => {
    const file = makeFile('image/png', AVATAR_MAX_FILE_BYTES + 1)
    await expect(processAvatarImage(file)).rejects.toThrow('file-too-large')
  })

  it('rejects undecodable input as decode-failed', async () => {
    const file = makeFile('image/png')
    await expect(processAvatarImage(file)).rejects.toThrow('decode-failed')
  })
})
