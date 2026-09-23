'use client'

import { useActionState } from 'react'
import { updateInitialPage, type FormState } from '@/app/(app)/settings/actions'
import { Button } from '@/components/ui/Button'
import { Label, Select } from '@/components/ui/Input'

export function InitialPageForm({ initialPage }: { initialPage: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(updateInitialPage, null)

  return (
    <form action={formAction} className="max-w-xs space-y-3">
      <div>
        <Label htmlFor="initialPage">Initial Page</Label>
        <Select id="initialPage" name="initialPage" defaultValue={initialPage}>
          <option value="login">Login Page</option>
          <option value="scanner">Scanner (public Time Log)</option>
        </Select>
      </div>
      {state?.message && <p className="text-sm text-emerald-700">{state.message}</p>}
      <Button type="submit" disabled={pending} size="sm">
        {pending ? 'Saving…' : 'Save'}
      </Button>
    </form>
  )
}
