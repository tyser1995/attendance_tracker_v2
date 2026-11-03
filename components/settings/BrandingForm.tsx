'use client'

import Image from 'next/image'
import { useActionState } from 'react'
import { updateBranding, type FormState } from '@/app/(app)/settings/actions'
import type { BrandingKind } from '@/lib/branding/image'
import { AppLogo } from '@/components/layout/AppLogo'
import { Button } from '@/components/ui/Button'
import { Input, Label } from '@/components/ui/Input'

const DETAILS: Record<BrandingKind, { label: string; hint: string; accept: string }> = {
  logo: {
    label: 'Logo',
    hint: 'Shown in the top bar and on the login page. PNG, JPEG, or WebP, up to 1 MB. A square image works best.',
    accept: 'image/png,image/jpeg,image/webp',
  },
  favicon: {
    label: 'Browser icon',
    hint: 'Shown on the browser tab. ICO, PNG, JPEG, or WebP, up to 1 MB. A square image works best.',
    accept: 'image/x-icon,image/vnd.microsoft.icon,.ico,image/png,image/jpeg,image/webp',
  },
}

export function BrandingForm({ kind, currentUrl }: { kind: BrandingKind; currentUrl: string | null }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(updateBranding, null)
  const { label, hint, accept } = DETAILS[kind]

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="kind" value={kind} />
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50">
          {kind === 'logo' ? (
            <AppLogo logoUrl={currentUrl} size={40} />
          ) : (
            <Image src={currentUrl ?? '/favicon.ico'} alt="" width={32} height={32} unoptimized className="h-8 w-8 object-contain" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <Label htmlFor={`${kind}-file`}>{label}</Label>
          <Input id={`${kind}-file`} name="image" type="file" accept={accept} />
          <p className="mt-1 text-sm text-zinc-500">{hint}</p>
        </div>
      </div>
      {state?.message && <p className="text-sm text-emerald-700">{state.message}</p>}
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? 'Saving…' : 'Upload'}
        </Button>
        {currentUrl && (
          <Button type="submit" name="intent" value="reset" variant="secondary" size="sm" disabled={pending}>
            Use default
          </Button>
        )}
      </div>
    </form>
  )
}
