'use client'

import { useLinkStatus } from 'next/link'
import { LoaderCircle, type LucideIcon } from 'lucide-react'

// Must be rendered inside a <Link>. Shows a spinner on the clicked link when the page
// isn't ready yet, so a slow navigation doesn't look like an ignored click.
export function NavIcon({ icon: Icon, className }: { icon: LucideIcon; className?: string }) {
  const { pending } = useLinkStatus()

  if (pending) return <LoaderCircle size={18} className="animate-spin text-indigo-600" aria-hidden="true" />
  return <Icon size={18} className={className} />
}
