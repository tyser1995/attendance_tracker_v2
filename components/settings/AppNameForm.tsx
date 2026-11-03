'use client'

import { useActionState } from 'react'
import { updateAppName, type FormState } from '@/app/(app)/settings/actions'
import { Button } from '@/components/ui/Button'
import { Input, Label } from '@/components/ui/Input'

export function AppNameForm({ appName }: { appName: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(updateAppName, null)

  return (
    <form action={formAction} className="max-w-xs space-y-3">
      <div>
        <Label htmlFor="appName">Name</Label>
        <Input id="appName" name="appName" defaultValue={appName} maxLength={60} required />
        <p className="mt-1 text-sm text-zinc-500">Shown in the browser tab, top bar, and login page.</p>
      </div>
      {state?.message && <p className="text-sm text-emerald-700">{state.message}</p>}
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <Button type="submit" disabled={pending} size="sm">
        {pending ? 'Saving…' : 'Save'}
      </Button>
    </form>
  )
}
