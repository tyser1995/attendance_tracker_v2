import { LoaderCircle } from 'lucide-react'

export function LoadingSpinner() {
  return (
    <div role="status" className="flex flex-1 flex-col items-center justify-center gap-3 py-24 text-zinc-500">
      <LoaderCircle size={32} className="animate-spin text-indigo-600" aria-hidden="true" />
      <p className="text-sm">Loading…</p>
    </div>
  )
}
