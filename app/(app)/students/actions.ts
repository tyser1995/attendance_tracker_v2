'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma/client'
import { studentSchema } from '@/lib/validation/student'

export type FormState = { errors?: Record<string, string[]>; formError?: string } | null

function parse(formData: FormData) {
  return studentSchema.safeParse({
    idNumber: formData.get('idNumber'),
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    middleName: formData.get('middleName'),
    dob: formData.get('dob'),
    sex: formData.get('sex'),
    courseId: formData.get('courseId'),
  })
}

export async function createStudent(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = parse(formData)
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors }

  const data = parsed.data
  const existing = await prisma.student.findFirst({ where: { idNumber: data.idNumber, isDeleted: false } })
  if (existing) return { formError: `A student with ID '${data.idNumber}' already exists.` }

  await prisma.student.create({
    data: {
      idNumber: data.idNumber,
      firstName: data.firstName,
      lastName: data.lastName,
      middleName: data.middleName || null,
      dob: data.dob || null,
      sex: data.sex || null,
      courseId: data.courseId || null,
    },
  })

  revalidatePath('/students')
  redirect('/students')
}

export async function updateStudent(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = parse(formData)
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors }

  const data = parsed.data
  const existing = await prisma.student.findFirst({
    where: { idNumber: data.idNumber, isDeleted: false, NOT: { id } },
  })
  if (existing) return { formError: `A student with ID '${data.idNumber}' already exists.` }

  await prisma.student.update({
    where: { id },
    data: {
      idNumber: data.idNumber,
      firstName: data.firstName,
      lastName: data.lastName,
      middleName: data.middleName || null,
      dob: data.dob || null,
      sex: data.sex || null,
      courseId: data.courseId || null,
    },
  })

  revalidatePath('/students')
  revalidatePath(`/students/${id}`)
  redirect(`/students/${id}`)
}

export async function softDeleteStudent(id: string): Promise<void> {
  await prisma.student.update({ where: { id }, data: { isDeleted: true } })
  revalidatePath('/students')
  redirect('/students')
}
