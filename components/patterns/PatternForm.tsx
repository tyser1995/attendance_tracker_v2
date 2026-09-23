'use client'

import { useActionState, useState } from 'react'
import type { FormState } from '@/app/(app)/patterns/actions'
import { createIdPattern } from '@/app/(app)/patterns/actions'
import { buildRegex } from '@/lib/idPattern/buildRegex'
import { Button } from '@/components/ui/Button'
import { Input, Label, FieldError } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { cn } from '@/lib/utils/cn'

export function PatternForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(createIdPattern, null)
  const [pattern, setPattern] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const duplicatePattern = Boolean(state?.formError)

  const [prevState, setPrevState] = useState(state)
  if (state !== prevState) {
    setPrevState(state)
    if (state?.formError) setModalOpen(true)
  }

  return (
    <form action={formAction} className="max-w-lg space-y-4">
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Duplicate Pattern">
        <p className="text-sm text-zinc-600">{state?.formError}</p>
        <div className="mt-4 flex justify-end">
          <Button type="button" size="sm" onClick={() => setModalOpen(false)}>
            OK
          </Button>
        </div>
      </Modal>

      <div>
        <Label htmlFor="pattern">Pattern</Label>
        <Input
          id="pattern"
          name="pattern"
          placeholder="##-#####-#"
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
          required
          aria-invalid={duplicatePattern || undefined}
          className={cn(
            duplicatePattern && 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-500/20'
          )}
        />
        <FieldError>{state?.errors?.pattern?.[0]}</FieldError>
        {pattern && (
          <p className="mt-1 font-mono text-xs text-zinc-500">Regex preview: {buildRegex(pattern)}</p>
        )}
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Add Pattern'}
      </Button>
    </form>
  )
}
