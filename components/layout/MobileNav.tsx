'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { Role } from '@/app/generated/prisma'
import { visibleNavItems } from './navItems'
import { cn } from '@/lib/utils/cn'
import { Menu, X, CalendarCheck2 } from 'lucide-react'

export function MobileNav({ role }: { role: Role }) {
  const pathname = usePathname()
  const items = visibleNavItems(role)
  const [open, setOpen] = useState(false)

  const [prevPathname, setPrevPathname] = useState(pathname)
  if (pathname !== prevPathname) {
    setPrevPathname(pathname)
    setOpen(false)
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <div className="sm:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation menu"
        className="flex items-center rounded-md p-2 text-zinc-600 transition-colors hover:bg-zinc-100"
      >
        <Menu size={20} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-zinc-900/40 backdrop-blur-[1px] transition-opacity"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[80vw] flex-col bg-white shadow-xl">
            <div className="flex h-14 items-center justify-between border-b border-zinc-100 px-4">
              <span className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white">
                  <CalendarCheck2 size={16} />
                </span>
                <span className="font-semibold text-zinc-900">Menu</span>
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close navigation menu"
                className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100"
              >
                <X size={18} />
              </button>
            </div>
            <ul className="flex-1 space-y-0.5 overflow-y-auto p-3">
              {items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + '/')
                const Icon = item.icon
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium',
                        active ? 'bg-indigo-50 text-indigo-700' : 'text-zinc-600 hover:bg-zinc-100'
                      )}
                    >
                      <Icon size={18} className={active ? 'text-indigo-600' : 'text-zinc-400'} />
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
