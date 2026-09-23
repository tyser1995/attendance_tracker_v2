import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma/client'
import { StudentForm } from '@/components/students/StudentForm'
import { updateStudent } from '../../actions'

export default async function EditStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [student, courses] = await Promise.all([
    prisma.student.findUnique({ where: { id } }),
    prisma.course.findMany({ orderBy: { courseCode: 'asc' } }),
  ])
  if (!student || student.isDeleted) notFound()

  const updateStudentWithId = updateStudent.bind(null, id)

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900">Edit Student</h1>
      <StudentForm
        action={updateStudentWithId}
        courses={courses}
        defaultValues={{
          idNumber: student.idNumber,
          firstName: student.firstName,
          lastName: student.lastName,
          middleName: student.middleName,
          dob: student.dob,
          sex: student.sex,
          courseId: student.courseId,
        }}
        submitLabel="Save Changes"
      />
    </div>
  )
}
