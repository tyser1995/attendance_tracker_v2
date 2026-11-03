import type { Role } from '@/app/generated/prisma'

export function isSuperAdmin(role: Role): boolean {
  return role === 'SUPER_ADMIN'
}

export function isAdmin(role: Role): boolean {
  return role === 'ADMIN' || role === 'SUPER_ADMIN'
}

// Paths by minimum required role, mirroring the Flutter app's config/router.dart.
export const SUPER_ADMIN_PATHS = ['/settings', '/users', '/logs']
export const ADMIN_PATHS = ['/students', '/courses', '/patterns', '/reports']
export const PUBLIC_PATHS = ['/login']
