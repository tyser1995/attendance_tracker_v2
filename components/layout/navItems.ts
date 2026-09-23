import type { Role } from '@/app/generated/prisma'
import {
  LayoutDashboard,
  ScanLine,
  ClipboardList,
  Users,
  GraduationCap,
  Regex,
  FileBarChart,
  UserCog,
  Settings,
  type LucideIcon,
} from 'lucide-react'

export type NavItem = {
  href: string
  label: string
  icon: LucideIcon
  minRole?: 'ADMIN' | 'SUPER_ADMIN'
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/scanner', label: 'Time Log', icon: ScanLine },
  { href: '/attendance', label: 'Attendance Log', icon: ClipboardList },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/students', label: 'Students', icon: Users, minRole: 'ADMIN' },
  { href: '/courses', label: 'Courses', icon: GraduationCap, minRole: 'ADMIN' },
  { href: '/patterns', label: 'ID Patterns', icon: Regex, minRole: 'ADMIN' },
  { href: '/reports', label: 'Reports', icon: FileBarChart, minRole: 'ADMIN' },
  { href: '/users', label: 'User Management', icon: UserCog, minRole: 'SUPER_ADMIN' },
  { href: '/settings', label: 'Settings', icon: Settings, minRole: 'SUPER_ADMIN' },
]

export function visibleNavItems(role: Role | undefined): NavItem[] {
  return NAV_ITEMS.filter((item) => {
    if (!item.minRole) return true
    if (!role) return false
    if (item.minRole === 'SUPER_ADMIN') return role === 'SUPER_ADMIN'
    return role === 'ADMIN' || role === 'SUPER_ADMIN'
  })
}
