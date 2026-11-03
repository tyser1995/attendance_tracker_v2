import { prisma } from '@/lib/prisma/client'
import { isBrandingKind } from '@/lib/branding/image'

// Public, because the login page and public Time Log show these before anyone signs in.
// Links include the upload time, so a cached image is replaced as soon as a new one is uploaded.
export async function GET(_request: Request, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params
  if (!isBrandingKind(kind)) return new Response(null, { status: 404 })

  const asset = await prisma.brandingAsset.findUnique({ where: { kind } })
  if (!asset) return new Response(null, { status: 404 })

  return new Response(new Uint8Array(asset.data), {
    headers: {
      'Content-Type': asset.mimeType,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'",
    },
  })
}
