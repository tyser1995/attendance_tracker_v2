import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma/client'
import { CourseForm } from '@/components/courses/CourseForm'
import { updateCourse } from '../../actions'

export default async function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const course = await prisma.course.findUnique({ where: { id } })
  if (!course) notFound()

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900">Edit Course</h1>
      <CourseForm
        action={updateCourse.bind(null, id)}
        defaultValues={{ courseCode: course.courseCode, courseName: course.courseName, yearLevel: course.yearLevel }}
        submitLabel="Save Changes"
      />
    </div>
  )
}
