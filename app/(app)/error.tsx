'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { errorEntry, sendLogs } from '@/lib/logs/client'

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    // A digest means the error came from the server, which has already logged it.
    if (!error.digest) sendLogs({ errors: [errorEntry(error)] })
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <h1 className="text-lg font-semibold text-zinc-900">Something went wrong</h1>
      <p className="text-sm text-zinc-500">This page couldn&apos;t be shown. The error has been logged.</p>
      <Button variant="secondary" onClick={() => retry()}>
        Try again
      </Button>
    </div>
  )
}
