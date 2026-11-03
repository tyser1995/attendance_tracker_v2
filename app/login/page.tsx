import { LoginForm } from './LoginForm'
import { AppLogo } from '@/components/layout/AppLogo'
import { getSettings } from '@/lib/settings/getSettings'

export default async function LoginPage() {
  const { appName, logoUrl } = await getSettings()

  return (
    <div className="flex flex-1 items-center justify-center bg-gradient-to-b from-zinc-50 via-white to-indigo-50/40 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <AppLogo logoUrl={logoUrl} size={44} className="mb-3 rounded-xl" />
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900">{appName}</h1>
          <p className="mt-1 text-sm text-zinc-500">Sign in to continue.</p>
        </div>
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xl shadow-zinc-900/5 sm:p-7">
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
