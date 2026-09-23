'use client'

import { useActionState, useState } from 'react'
import type { FormState } from '@/app/(app)/students/actions'
import { Button } from '@/components/ui/Button'
import { Input, Label, Select, FieldError } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { cn } from '@/lib/utils/cn'

type Course = { id: string; courseCode: string; courseName: string }

export function StudentForm({
  action,
  courses,
  defaultValues,
  submitLabel = 'Save',
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>
  courses: Course[]
  defaultValues?: {
    idNumber: string
    firstName: string
    lastName: string
    middleName: string | null
    dob: string | null
    sex: string | null
    courseId: string | null
  }
  submitLabel?: string
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, null)
  const [modalOpen, setModalOpen] = useState(false)
  const duplicateId = Boolean(state?.formError)

  // Kept as controlled state (rather than defaultValue) so a failed submission —
  // which re-renders this form from the server — doesn't wipe what was typed.
  const [idNumber, setIdNumber] = useState(defaultValues?.idNumber ?? '')
  const [firstName, setFirstName] = useState(defaultValues?.firstName ?? '')
  const [lastName, setLastName] = useState(defaultValues?.lastName ?? '')
  const [middleName, setMiddleName] = useState(defaultValues?.middleName ?? '')
  const [dob, setDob] = useState(defaultValues?.dob ?? '')
  const [sex, setSex] = useState(defaultValues?.sex ?? '')
  const [courseId, setCourseId] = useState(defaultValues?.courseId ?? '')

  // Open the modal in response to a new failed-submission state, computed during
  // render (not an effect) so it doesn't fire again until the state actually changes.
  const [prevState, setPrevState] = useState(state)
  if (state !== prevState) {
    setPrevState(state)
    if (state?.formError) setModalOpen(true)
  }

  return (
    <form action={formAction} className="max-w-lg space-y-4">
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Duplicate ID Number">
        <p className="text-sm text-zinc-600">{state?.formError}</p>
        <div className="mt-4 flex justify-end">
          <Button type="button" size="sm" onClick={() => setModalOpen(false)}>
            OK
          </Button>
        </div>
      </Modal>

      <div>
        <Label htmlFor="idNumber">ID Number</Label>
        <Input
          id="idNumber"
          name="idNumber"
          value={idNumber}
          onChange={(e) => setIdNumber(e.target.value)}
          required
          aria-invalid={duplicateId || undefined}
          className={cn(
            duplicateId && 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-500/20'
          )}
        />
        <FieldError>{state?.errors?.idNumber?.[0]}</FieldError>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            name="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
          <FieldError>{state?.errors?.firstName?.[0]}</FieldError>
        </div>
        <div>
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            name="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
          <FieldError>{state?.errors?.lastName?.[0]}</FieldError>
        </div>
      </div>

      <div>
        <Label htmlFor="middleName">Middle Name</Label>
        <Input
          id="middleName"
          name="middleName"
          value={middleName ?? ''}
          onChange={(e) => setMiddleName(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="dob">Date of Birth</Label>
          <Input id="dob" name="dob" type="date" value={dob ?? ''} onChange={(e) => setDob(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="sex">Sex</Label>
          <Select id="sex" name="sex" value={sex ?? ''} onChange={(e) => setSex(e.target.value)}>
            <option value="">—</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="courseId">Course</Label>
        <Select id="courseId" name="courseId" value={courseId ?? ''} onChange={(e) => setCourseId(e.target.value)}>
          <option value="">—</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.courseCode} — {c.courseName}
            </option>
          ))}
        </Select>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : submitLabel}
      </Button>
    </form>
  )
}
