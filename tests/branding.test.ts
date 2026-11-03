import { describe, expect, it } from 'vitest'
import { MAX_BRANDING_BYTES, checkBrandingImage, detectImageType, isBrandingKind } from '@/lib/branding/image'

const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0])
const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0])
const webp = new TextEncoder().encode('RIFF\0\0\0\0WEBPVP8 ')
const ico = Uint8Array.from([0x00, 0x00, 0x01, 0x00, 0x01, 0x00])
const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')

describe('detectImageType', () => {
  it.each([
    ['PNG', png, 'image/png'],
    ['JPEG', jpeg, 'image/jpeg'],
    ['WebP', webp, 'image/webp'],
    ['ICO', ico, 'image/x-icon'],
  ])('recognizes %s from its contents', (_label, bytes, expected) => {
    expect(detectImageType(bytes)).toBe(expected)
  })

  it.each([
    ['SVG', svg],
    ['HTML', new TextEncoder().encode('<html><script>alert(1)</script></html>')],
    ['a RIFF file that is not WebP', new TextEncoder().encode('RIFF\0\0\0\0WAVEfmt ')],
    ['too few bytes', Uint8Array.from([0x89, 0x50])],
    ['an empty file', new Uint8Array()],
  ])('rejects %s', (_label, bytes) => {
    expect(detectImageType(bytes)).toBeNull()
  })
})

describe('checkBrandingImage', () => {
  it('accepts PNG, JPEG, and WebP as a logo', () => {
    for (const bytes of [png, jpeg, webp]) expect(checkBrandingImage('logo', bytes)).toHaveProperty('mimeType')
  })

  it('accepts ICO as a browser icon but not as a logo', () => {
    expect(checkBrandingImage('favicon', ico)).toEqual({ mimeType: 'image/x-icon' })
    expect(checkBrandingImage('logo', ico)).toHaveProperty('error')
  })

  it('rejects SVG for both', () => {
    expect(checkBrandingImage('logo', svg)).toHaveProperty('error')
    expect(checkBrandingImage('favicon', svg)).toHaveProperty('error')
  })

  it('rejects an empty file', () => {
    expect(checkBrandingImage('logo', new Uint8Array())).toEqual({ error: 'Choose an image first.' })
  })

  it('accepts exactly 1 MB and rejects anything larger', () => {
    const atLimit = new Uint8Array(MAX_BRANDING_BYTES)
    atLimit.set(png)
    const overLimit = new Uint8Array(MAX_BRANDING_BYTES + 1)
    overLimit.set(png)

    expect(checkBrandingImage('logo', atLimit)).toEqual({ mimeType: 'image/png' })
    expect(checkBrandingImage('logo', overLimit)).toEqual({ error: 'The image must be 1 MB or smaller.' })
  })
})

describe('isBrandingKind', () => {
  it('only accepts the known kinds', () => {
    expect(isBrandingKind('logo')).toBe(true)
    expect(isBrandingKind('favicon')).toBe(true)
    expect(isBrandingKind('../../etc/passwd')).toBe(false)
    expect(isBrandingKind(null)).toBe(false)
  })
})
