'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const REFRESH_MS = 15_000

export function LogsAutoRefresh() {
  const router = useRouter()
  const [enabled, setEnabled] = useState(true)

  useEffect(() => {
    if (!enabled) return
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh()
    }, REFRESH_MS)
    return () => clearInterval(interval)
  }, [enabled, router])

  return (
    <label className="flex items-center gap-2 text-sm text-zinc-600">
      <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
      Refresh every 15 seconds
    </label>
  )
}
