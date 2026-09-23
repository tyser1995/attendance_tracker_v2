import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma/client'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { ConfirmSubmit } from '@/components/ui/ConfirmSubmit'
import { softDeleteStudent } from '../actions'

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const student = await prisma.student.findUnique({ where: { id }, include: { course: true } })
  if (!student || student.isDeleted) notFound()

  const deleteStudentWithId = softDeleteStudent.bind(null, student.id)

  const fields: [string, string][] = [
    ['ID Number', student.idNumber],
    ['First Name', student.firstName],
    ['Middle Name', student.middleName ?? '—'],
    ['Last Name', student.lastName],
    ['Date of Birth', student.dob ?? '—'],
    ['Sex', student.sex ?? '—'],
    ['Course', student.course ? `${student.course.courseCode} — ${student.course.courseName}` : '—'],
  ]

  return (
    <div className="max-w-lg">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900">
          {student.firstName} {student.lastName}
        </h1>
        <div className="flex gap-2">
          <Link href={`/students/${student.id}/edit`}>
            <Button variant="secondary">Edit</Button>
          </Link>
          <form action={deleteStudentWithId}>
            <ConfirmSubmit
              variant="danger"
              confirmMessage={`Delete ${student.firstName} ${student.lastName}? This can be undone by an administrator later.`}
            >
              Delete
            </ConfirmSubmit>
          </form>
        </div>
      </div>

      <Card>
        <CardBody>
          <dl className="divide-y divide-zinc-100">
            {fields.map(([label, value]) => (
              <div key={label} className="flex justify-between py-2 text-sm">
                <dt className="text-zinc-500">{label}</dt>
                <dd className="text-zinc-900">{value}</dd>
              </div>
            ))}
          </dl>
        </CardBody>
      </Card>

      <Link href="/students" className="mt-4 inline-block text-sm text-indigo-600 hover:underline">
        ← Back to Students
      </Link>
    </div>
  )
}
