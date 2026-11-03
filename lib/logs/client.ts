import type { ClientLogs } from '@/lib/validation/logs'

const ENDPOINT = '/api/logs'

// Failures are ignored: logging must never get in the user's way.
export function sendLogs(logs: ClientLogs, leavingPage = false): void {
  const body = JSON.stringify(logs)
  try {
    // sendBeacon is the only reliable way to send while the page is closing.
    if (leavingPage && navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'application/json' }))) return
    void fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {})
  } catch {
    // Nothing useful to do.
  }
}

export function errorEntry(error: unknown): NonNullable<ClientLogs['errors']>[number] {
  const err = error instanceof Error ? error : new Error(String(error))
  return {
    message: err.message.slice(0, 2000) || 'Unknown error',
    stack: err.stack?.slice(0, 8000),
    path: location.pathname.slice(0, 500),
  }
}
