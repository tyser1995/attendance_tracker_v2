import Link from 'next/link'
import type { Session } from 'next-auth'
import { signOut } from '@/auth'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { MobileNav } from './MobileNav'
import { CalendarCheck2 } from 'lucide-react'

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  STAFF: 'Staff',
}

export function Topbar({ session }: { session: Session | null }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-zinc-200/80 bg-white/80 px-4 backdrop-blur-md sm:px-6">
      <div className="flex items-center gap-2">
        {session && <MobileNav role={session.user.role} />}
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm shadow-indigo-600/30">
            <CalendarCheck2 size={16} />
          </span>
          <span className="font-semibold tracking-tight text-zinc-900">Attendance Tracker</span>
        </Link>
      </div>
      {session ? (
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-zinc-600 sm:inline">{session.user.username}</span>
          <Badge color="indigo">{ROLE_LABEL[session.user.role]}</Badge>
          <form
            action={async () => {
              'use server'
              await signOut({ redirectTo: '/login' })
            }}
          >
            <Button type="submit" variant="secondary" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      ) : (
        <Link href="/login">
          <Button size="sm">Login</Button>
        </Link>
      )}
    </header>
  )
}
