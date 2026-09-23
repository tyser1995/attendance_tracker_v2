import { prisma } from '@/lib/prisma/client'

export type AppSettings = {
  initialPage: 'login' | 'scanner'
}

const DEFAULTS: AppSettings = { initialPage: 'login' }

let cached: { value: AppSettings; expiresAt: number } | null = null
const TTL_MS = 30_000

// Settings is a single row (id fixed at 1); cached briefly since middleware
// reads it on every request.
export async function getSettings(): Promise<AppSettings> {
  if (cached && cached.expiresAt > Date.now()) return cached.value

  const row = await prisma.settings.findUnique({ where: { id: 1 } })
  const value: AppSettings = row ? { initialPage: row.initialPage as AppSettings['initialPage'] } : DEFAULTS
  cached = { value, expiresAt: Date.now() + TTL_MS }
  return value
}

export function invalidateSettingsCache() {
  cached = null
}
