import { NextResponse, type NextRequest } from 'next/server'
import { auth } from '@/auth'
import { getSettings } from '@/lib/settings/getSettings'
import { SUPER_ADMIN_PATHS, ADMIN_PATHS, isAdmin, isSuperAdmin } from '@/lib/auth/roles'

// Proxy always runs on the Node.js runtime, so Prisma (used by getSettings) works here.
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const session = await auth()
  const loggedIn = !!session?.user
  const { initialPage } = await getSettings()
  const scannerIsHome = initialPage === 'scanner'

  const isLoginPage = pathname === '/login'
  const isScannerPage = pathname === '/scanner'

  if (!loggedIn) {
    if (isLoginPage) return NextResponse.next()
    if (isScannerPage && scannerIsHome) return NextResponse.next()
    return NextResponse.redirect(new URL(scannerIsHome ? '/scanner' : '/login', req.url))
  }

  if (isLoginPage) {
    return NextResponse.redirect(new URL('/scanner', req.url))
  }

  const role = session.user.role

  if (SUPER_ADMIN_PATHS.some((p) => pathname.startsWith(p)) && !isSuperAdmin(role)) {
    return NextResponse.redirect(new URL('/scanner', req.url))
  }

  if (ADMIN_PATHS.some((p) => pathname.startsWith(p)) && !isAdmin(role)) {
    return NextResponse.redirect(new URL('/scanner', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
