'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma/client'
import { courseSchema } from '@/lib/validation/course'

export type FormState = { errors?: Record<string, string[]>; formError?: string } | null

function parse(formData: FormData) {
  return courseSchema.safeParse({
    courseCode: formData.get('courseCode'),
    courseName: formData.get('courseName'),
    yearLevel: formData.get('yearLevel'),
  })
}

export async function createCourse(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = parse(formData)
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors }

  const data = parsed.data
  const existing = await prisma.course.findUnique({ where: { courseCode: data.courseCode } })
  if (existing) return { formError: `A course with code '${data.courseCode}' already exists.` }

  await prisma.course.create({
    data: { courseCode: data.courseCode, courseName: data.courseName, yearLevel: data.yearLevel || '' },
  })

  revalidatePath('/courses')
  redirect('/courses')
}

export async function updateCourse(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = parse(formData)
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors }

  const data = parsed.data
  const existing = await prisma.course.findFirst({ where: { courseCode: data.courseCode, NOT: { id } } })
  if (existing) return { formError: `A course with code '${data.courseCode}' already exists.` }

  await prisma.course.update({
    where: { id },
    data: { courseCode: data.courseCode, courseName: data.courseName, yearLevel: data.yearLevel || '' },
  })

  revalidatePath('/courses')
  redirect('/courses')
}

export async function deleteCourse(id: string): Promise<void> {
  const studentCount = await prisma.student.count({ where: { courseId: id, isDeleted: false } })
  if (studentCount > 0) {
    throw new Error(`Cannot delete: ${studentCount} student(s) are assigned to this course.`)
  }
  await prisma.course.delete({ where: { id } })
  revalidatePath('/courses')
}
