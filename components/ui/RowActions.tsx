'use client'

import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { Eye, Pencil, Trash2, Power, PowerOff } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const tones = {
  default: 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700',
  indigo: 'text-indigo-600 hover:bg-indigo-50',
  red: 'text-red-600 hover:bg-red-50',
  green: 'text-emerald-600 hover:bg-emerald-50',
  amber: 'text-amber-600 hover:bg-amber-50',
}

const iconButtonClass =
  'inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors disabled:pointer-events-none disabled:opacity-40'

export function ViewAction({ href }: { href: string }) {
  return (
    <Link href={href} title="View" aria-label="View" className={cn(iconButtonClass, tones.default)}>
      <Eye size={16} />
    </Link>
  )
}

export function EditAction({ href }: { href: string }) {
  return (
    <Link href={href} title="Edit" aria-label="Edit" className={cn(iconButtonClass, tones.indigo)}>
      <Pencil size={16} />
    </Link>
  )
}

export function DeleteAction({
  action,
  confirmMessage,
}: {
  action: () => Promise<void> | void
  confirmMessage: string
}) {
  return (
    <form action={action}>
      <button
        type="submit"
        title="Delete"
        aria-label="Delete"
        onClick={(e) => {
          if (!confirm(confirmMessage)) e.preventDefault()
        }}
        className={cn(iconButtonClass, tones.red)}
      >
        <Trash2 size={16} />
      </button>
    </form>
  )
}

export function ToggleActiveAction({
  action,
  active,
}: {
  action: () => Promise<void> | void
  active: boolean
}) {
  const Icon = active ? PowerOff : Power
  const label = active ? 'Deactivate' : 'Activate'
  return (
    <form action={action}>
      <button
        type="submit"
        title={label}
        aria-label={label}
        className={cn(iconButtonClass, active ? tones.amber : tones.green)}
      >
        <Icon size={16} />
      </button>
    </form>
  )
}

export function IconAction({
  icon: Icon,
  label,
  href,
  tone = 'default',
}: {
  icon: LucideIcon
  label: string
  href: string
  tone?: keyof typeof tones
}) {
  return (
    <Link href={href} title={label} aria-label={label} className={cn(iconButtonClass, tones[tone])}>
      <Icon size={16} />
    </Link>
  )
}
