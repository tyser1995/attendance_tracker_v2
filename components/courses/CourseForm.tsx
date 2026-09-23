'use client'

import { useActionState, useState } from 'react'
import type { FormState } from '@/app/(app)/courses/actions'
import { Button } from '@/components/ui/Button'
import { Input, Label, FieldError } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { cn } from '@/lib/utils/cn'

export function CourseForm({
  action,
  defaultValues,
  submitLabel = 'Save',
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>
  defaultValues?: { courseCode: string; courseName: string; yearLevel: string }
  submitLabel?: string
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, null)
  const [modalOpen, setModalOpen] = useState(false)
  const duplicateCode = Boolean(state?.formError)

  // Controlled state (rather than defaultValue) so a failed submission — which
  // re-renders this form from the server — doesn't wipe what was typed.
  const [courseCode, setCourseCode] = useState(defaultValues?.courseCode ?? '')
  const [courseName, setCourseName] = useState(defaultValues?.courseName ?? '')
  const [yearLevel, setYearLevel] = useState(defaultValues?.yearLevel ?? '')

  const [prevState, setPrevState] = useState(state)
  if (state !== prevState) {
    setPrevState(state)
    if (state?.formError) setModalOpen(true)
  }

  return (
    <form action={formAction} className="max-w-lg space-y-4">
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Duplicate Course Code">
        <p className="text-sm text-zinc-600">{state?.formError}</p>
        <div className="mt-4 flex justify-end">
          <Button type="button" size="sm" onClick={() => setModalOpen(false)}>
            OK
          </Button>
        </div>
      </Modal>

      <div>
        <Label htmlFor="courseCode">Course Code</Label>
        <Input
          id="courseCode"
          name="courseCode"
          value={courseCode}
          onChange={(e) => setCourseCode(e.target.value)}
          required
          aria-invalid={duplicateCode || undefined}
          className={cn(
            duplicateCode && 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-500/20'
          )}
        />
        <FieldError>{state?.errors?.courseCode?.[0]}</FieldError>
      </div>

      <div>
        <Label htmlFor="courseName">Course Name</Label>
        <Input
          id="courseName"
          name="courseName"
          value={courseName}
          onChange={(e) => setCourseName(e.target.value)}
          required
        />
        <FieldError>{state?.errors?.courseName?.[0]}</FieldError>
      </div>

      <div>
        <Label htmlFor="yearLevel">Year Level</Label>
        <Input
          id="yearLevel"
          name="yearLevel"
          value={yearLevel}
          onChange={(e) => setYearLevel(e.target.value)}
          placeholder="e.g. 1st Year"
        />
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : submitLabel}
      </Button>
    </form>
  )
}
