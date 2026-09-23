'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Role } from '@/app/generated/prisma'
import { visibleNavItems } from './navItems'
import { cn } from '@/lib/utils/cn'

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname()
  const items = visibleNavItems(role)

  return (
    <nav className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-60 shrink-0 border-r border-zinc-200/80 bg-white p-3 sm:block">
      <ul className="space-y-0.5">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  'group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  active ? 'bg-indigo-50 text-indigo-700' : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                )}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-indigo-600" />
                )}
                <Icon size={18} className={active ? 'text-indigo-600' : 'text-zinc-400 group-hover:text-zinc-600'} />
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
