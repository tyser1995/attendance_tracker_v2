export const BRANDING_KINDS = ['logo', 'favicon'] as const
export type BrandingKind = (typeof BRANDING_KINDS)[number]

export const MAX_BRANDING_BYTES = 1024 * 1024

export function isBrandingKind(value: unknown): value is BrandingKind {
  return BRANDING_KINDS.includes(value as BrandingKind)
}

type ImageType = 'image/png' | 'image/jpeg' | 'image/webp' | 'image/x-icon'

function startsWith(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  return signature.every((byte, index) => bytes[offset + index] === byte)
}

// Reads the type from the file's contents, because a file's name and declared type can
// say anything. SVG isn't accepted: it can contain scripts, which would run on this site.
export function detectImageType(bytes: Uint8Array): ImageType | null {
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png'
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg'
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) return 'image/webp'
  if (startsWith(bytes, [0x00, 0x00, 0x01, 0x00])) return 'image/x-icon'
  return null
}

export function checkBrandingImage(kind: BrandingKind, bytes: Uint8Array): { mimeType: ImageType } | { error: string } {
  if (bytes.length === 0) return { error: 'Choose an image first.' }
  if (bytes.length > MAX_BRANDING_BYTES) return { error: 'The image must be 1 MB or smaller.' }

  const mimeType = detectImageType(bytes)
  if (kind === 'logo' && (!mimeType || mimeType === 'image/x-icon')) {
    return { error: 'The logo must be a PNG, JPEG, or WebP image.' }
  }
  if (!mimeType) return { error: 'The browser icon must be an ICO, PNG, JPEG, or WebP image.' }
  return { mimeType }
}
