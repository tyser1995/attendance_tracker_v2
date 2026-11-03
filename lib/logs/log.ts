import { prisma } from '@/lib/prisma/client'

const LOG_RETENTION_DAYS = 90
const DAY_MS = 24 * 60 * 60 * 1000

function clip(value: string | null | undefined, max: number): string | null {
  return value ? value.slice(0, max) : null
}

type ActivityEntry = {
  action: string
  username?: string | null
  role?: string | null
  path?: string | null
  target?: string | null
}

type ErrorEntry = {
  source: string
  message: string
  stack?: string | null
  digest?: string | null
  path?: string | null
  username?: string | null
}

// Logging must never break what's being logged, so failures only reach the console.
export async function logActivity(entry: ActivityEntry): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: {
        action: entry.action,
        username: clip(entry.username, 100),
        role: clip(entry.role, 20),
        path: clip(entry.path, 500),
        target: clip(entry.target, 200),
      },
    })
  } catch (err) {
    console.error('Could not save activity log:', err)
  }
}

export async function logError(entry: ErrorEntry): Promise<void> {
  try {
    await prisma.errorLog.create({
      data: {
        source: entry.source,
        message: clip(entry.message, 2000) ?? 'Unknown error',
        stack: clip(entry.stack, 8000),
        digest: clip(entry.digest, 100),
        path: clip(entry.path, 500),
        username: clip(entry.username, 100),
      },
    })
  } catch (err) {
    console.error('Could not save error log:', err)
  }
}

export async function pruneOldLogs(now: Date = new Date()): Promise<void> {
  const cutoff = new Date(now.getTime() - LOG_RETENTION_DAYS * DAY_MS)
  await prisma.activityLog.deleteMany({ where: { createdAt: { lt: cutoff } } })
  await prisma.errorLog.deleteMany({ where: { createdAt: { lt: cutoff } } })
}

const globalForRetention = globalThis as unknown as { logRetentionStarted?: boolean }

export function startLogRetention(): void {
  if (globalForRetention.logRetentionStarted) return
  globalForRetention.logRetentionStarted = true

  const prune = () => pruneOldLogs().catch((err) => console.error('Could not remove old logs:', err))
  void prune()
  setInterval(prune, DAY_MS).unref()
}
