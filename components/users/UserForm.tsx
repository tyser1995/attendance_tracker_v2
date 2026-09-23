'use client'

import { useActionState } from 'react'
import type { FormState } from '@/app/(app)/users/actions'
import { Button } from '@/components/ui/Button'
import { Input, Label, Select, FieldError } from '@/components/ui/Input'

export function UserForm({
  action,
  mode,
  defaultValues,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>
  mode: 'create' | 'edit'
  defaultValues?: { username: string; role: string }
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, null)

  return (
    <form action={formAction} className="max-w-sm space-y-4">
      {state?.formError && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.formError}</p>
      )}

      {mode === 'create' ? (
        <div>
          <Label htmlFor="username">Username</Label>
          <Input id="username" name="username" required />
          <FieldError>{state?.errors?.username?.[0]}</FieldError>
        </div>
      ) : (
        <div>
          <Label>Username</Label>
          <p className="text-sm text-zinc-700">{defaultValues?.username}</p>
        </div>
      )}

      <div>
        <Label htmlFor="password">{mode === 'create' ? 'Password' : 'New Password (optional)'}</Label>
        <Input id="password" name="password" type="password" required={mode === 'create'} />
        <FieldError>{state?.errors?.password?.[0]}</FieldError>
      </div>

      <div>
        <Label htmlFor="role">Role</Label>
        <Select id="role" name="role" defaultValue={defaultValues?.role ?? 'STAFF'}>
          <option value="STAFF">Staff</option>
          <option value="ADMIN">Admin</option>
          <option value="SUPER_ADMIN">Super Admin</option>
        </Select>
        <FieldError>{state?.errors?.role?.[0]}</FieldError>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : mode === 'create' ? 'Add User' : 'Save Changes'}
      </Button>
    </form>
  )
}
