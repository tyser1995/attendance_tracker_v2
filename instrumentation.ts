import type { Instrumentation } from 'next'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startBackupScheduler } = await import('@/lib/backup/scheduler')
    startBackupScheduler()
    const { startLogRetention } = await import('@/lib/logs/log')
    startLogRetention()
  }
}

export const onRequestError: Instrumentation.onRequestError = async (err, request) => {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  const { logError } = await import('@/lib/logs/log')
  const error = err instanceof Error ? err : new Error(String(err))
  const digest = typeof err === 'object' && err !== null && 'digest' in err ? String(err.digest) : null
  await logError({ source: 'server', message: error.message, stack: error.stack, digest, path: request.path })
}
