import { prisma } from '@/lib/prisma/client'

export type AppSettings = {
  initialPage: 'login' | 'scanner'
  appName: string
  logoUrl: string | null
  faviconUrl: string | null
}

const DEFAULTS = { initialPage: 'login', appName: 'Attendance Tracker' } as const

let cached: { value: AppSettings; expiresAt: number } | null = null
const TTL_MS = 30_000

// Settings is a single row (id fixed at 1); cached briefly since middleware
// reads it on every request.
export async function getSettings(): Promise<AppSettings> {
  if (cached && cached.expiresAt > Date.now()) return cached.value

  const [row, assets] = await Promise.all([
    prisma.settings.findUnique({ where: { id: 1 } }),
    // Not the image data: this runs on every request, and only the links are needed.
    prisma.brandingAsset.findMany({ select: { kind: true, updatedAt: true } }),
  ])
  const assetUrl = (kind: string) => {
    const asset = assets.find((a) => a.kind === kind)
    return asset ? `/api/branding/${kind}?v=${asset.updatedAt.getTime()}` : null
  }
  const value: AppSettings = {
    initialPage: (row?.initialPage ?? DEFAULTS.initialPage) as AppSettings['initialPage'],
    appName: row?.appName ?? DEFAULTS.appName,
    logoUrl: assetUrl('logo'),
    faviconUrl: assetUrl('favicon'),
  }
  cached = { value, expiresAt: Date.now() + TTL_MS }
  return value
}

export function invalidateSettingsCache() {
  cached = null
}
