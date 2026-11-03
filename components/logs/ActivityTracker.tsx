'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { errorEntry, sendLogs } from '@/lib/logs/client'
import type { ClientLogs } from '@/lib/validation/logs'

const FLUSH_DELAY_MS = 3000
const MAX_BATCH = 50
const MAX_ERRORS_PER_PAGE_LOAD = 10

type Activity = NonNullable<ClientLogs['activity']>[number]

// Only controls count as clicks, and only their labels are read. Nothing typed into a
// field is ever recorded.
function describeClick(target: EventTarget | null): string | null {
  if (!(target instanceof Element)) return null
  const control = target.closest('a, button, summary, [role="button"], input[type="submit"], input[type="button"]')
  if (!control) return null

  const kind = control.tagName === 'A' ? 'Link' : 'Button'
  const label =
    control.getAttribute('aria-label') ||
    control.textContent?.replace(/\s+/g, ' ').trim() ||
    control.getAttribute('title') ||
    (control instanceof HTMLInputElement ? control.value : '') ||
    'unlabeled'
  return `${kind}: ${label}`.slice(0, 200)
}

export function ActivityTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const queue = useRef<Activity[]>([])
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastPage = useRef<string | null>(null)

  useEffect(() => {
    const flush = (leavingPage = false) => {
      if (timer.current) clearTimeout(timer.current)
      timer.current = null
      if (queue.current.length) sendLogs({ activity: queue.current.splice(0, MAX_BATCH) }, leavingPage)
      if (queue.current.length) timer.current = setTimeout(flush, FLUSH_DELAY_MS)
    }
    const flushOnHide = () => {
      if (document.visibilityState === 'hidden') flush(true)
    }
    const onClick = (event: MouseEvent) => {
      const target = describeClick(event.target)
      if (!target) return
      queue.current.push({ action: 'click', path: location.pathname.slice(0, 500), target })
      timer.current ??= setTimeout(flush, FLUSH_DELAY_MS)
    }

    let errorsSent = 0
    const reportError = (error: unknown) => {
      if (errorsSent >= MAX_ERRORS_PER_PAGE_LOAD) return
      errorsSent += 1
      sendLogs({ errors: [errorEntry(error)] })
    }
    const onError = (event: ErrorEvent) => reportError(event.error ?? event.message)
    const onRejection = (event: PromiseRejectionEvent) => reportError(event.reason)

    // Capture phase, so a control that stops the click reaching the page is still counted.
    document.addEventListener('click', onClick, true)
    document.addEventListener('visibilitychange', flushOnHide)
    window.addEventListener('pagehide', flushOnHide)
    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    return () => {
      flush(true)
      document.removeEventListener('click', onClick, true)
      document.removeEventListener('visibilitychange', flushOnHide)
      window.removeEventListener('pagehide', flushOnHide)
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [])

  useEffect(() => {
    const search = searchParams.toString()
    const page = (search ? `${pathname}?${search}` : pathname).slice(0, 500)
    // Development runs effects twice; each page should only count once.
    if (page === lastPage.current) return
    lastPage.current = page
    queue.current.push({ action: 'page_view', path: page })
    timer.current ??= setTimeout(() => {
      timer.current = null
      if (queue.current.length) sendLogs({ activity: queue.current.splice(0, MAX_BATCH) })
    }, FLUSH_DELAY_MS)
  }, [pathname, searchParams])

  return null
}
