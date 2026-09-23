import { prisma } from '@/lib/prisma/client'
import { StudentForm } from '@/components/students/StudentForm'
import { createStudent } from '../actions'

export default async function NewStudentPage() {
  const courses = await prisma.course.findMany({ orderBy: { courseCode: 'asc' } })

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900">Add Student</h1>
      <StudentForm action={createStudent} courses={courses} submitLabel="Add Student" />
    </div>
  )
}
