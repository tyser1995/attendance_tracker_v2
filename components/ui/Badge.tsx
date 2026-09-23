import { cn } from '@/lib/utils/cn'

const colors = {
  zinc: 'bg-zinc-100 text-zinc-700 ring-zinc-600/10',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/10',
  red: 'bg-red-50 text-red-700 ring-red-600/10',
  amber: 'bg-amber-50 text-amber-700 ring-amber-600/10',
  indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-600/10',
  blue: 'bg-blue-50 text-blue-700 ring-blue-600/10',
}

export function Badge({ color = 'zinc', children }: { color?: keyof typeof colors; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset',
        colors[color]
      )}
    >
      {children}
    </span>
  )
}
