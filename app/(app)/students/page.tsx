import Link from 'next/link'
import { prisma } from '@/lib/prisma/client'
import { Button } from '@/components/ui/Button'
import { DataTable, type DataTableRow } from '@/components/ui/DataTable'
import { ViewAction, EditAction, DeleteAction } from '@/components/ui/RowActions'
import { softDeleteStudent } from './actions'

const COLUMNS = [
  { key: 'idNumber', label: 'ID Number', sortable: true },
  { key: 'name', label: 'Name', sortable: true },
  { key: 'course', label: 'Course', sortable: true },
]

export default async function StudentsPage() {
  const students = await prisma.student.findMany({
    where: { isDeleted: false },
    include: { course: true },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
  })

  const rows: DataTableRow[] = students.map((s) => {
    const fullName = `${s.lastName}, ${s.firstName} ${s.middleName ?? ''}`.trim()
    const courseCode = s.course?.courseCode ?? ''
    return {
      key: s.id,
      searchText: `${s.idNumber} ${fullName} ${courseCode}`,
      sortValues: { idNumber: s.idNumber, name: fullName, course: courseCode },
      cells: {
        idNumber: <span className="font-mono text-zinc-700">{s.idNumber}</span>,
        name: <span className="text-zinc-900">{fullName}</span>,
        course: <span className="text-zinc-600">{courseCode || '—'}</span>,
      },
      actions: (
        <>
          <ViewAction href={`/students/${s.id}`} />
          <EditAction href={`/students/${s.id}/edit`} />
          <DeleteAction
            action={softDeleteStudent.bind(null, s.id)}
            confirmMessage={`Delete ${s.firstName} ${s.lastName}? This can be undone by an administrator later.`}
          />
        </>
      ),
    }
  })

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900">Students</h1>
        <Link href="/students/new">
          <Button>Add Student</Button>
        </Link>
      </div>

      <DataTable
        columns={COLUMNS}
        rows={rows}
        hasActions
        searchPlaceholder="Search by ID or name…"
        emptyMessage="No students found."
        defaultSortKey="name"
      />
    </div>
  )
}
