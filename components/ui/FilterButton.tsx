'use client'

import { useFormStatus } from 'react-dom'
import { LoaderCircle } from 'lucide-react'
import { Button } from './Button'

// Changing only the query string doesn't show loading.tsx, so filter forms show progress here.
export function FilterButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" variant="secondary" disabled={pending}>
      {pending && <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />}
      {children}
    </Button>
  )
}
