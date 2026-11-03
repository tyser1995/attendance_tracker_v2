import { Suspense } from 'react'
import { auth } from '@/auth'
import { ActivityTracker } from '@/components/logs/ActivityTracker'
import { getSettings } from '@/lib/settings/getSettings'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const { appName, logoUrl } = await getSettings()

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-indigo-600 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
      >
        Skip to content
      </a>
      {session && (
        <Suspense fallback={null}>
          <ActivityTracker />
        </Suspense>
      )}
      <Topbar session={session} appName={appName} logoUrl={logoUrl} />
      <div className="flex flex-1">
        {session && <Sidebar role={session.user.role} />}
        <main id="main-content" className="flex-1 bg-zinc-50/60 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  )
}
