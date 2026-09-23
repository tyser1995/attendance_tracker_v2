import Link from 'next/link'
import { prisma } from '@/lib/prisma/client'
import { Button } from '@/components/ui/Button'
import { DataTable, type DataTableRow } from '@/components/ui/DataTable'
import { EditAction, DeleteAction } from '@/components/ui/RowActions'
import { deleteCourse } from './actions'

const COLUMNS = [
  { key: 'courseCode', label: 'Code', sortable: true },
  { key: 'courseName', label: 'Name', sortable: true },
  { key: 'yearLevel', label: 'Year Level', sortable: true },
  { key: 'students', label: 'Students', sortable: true },
]

export default async function CoursesPage() {
  const courses = await prisma.course.findMany({
    include: { _count: { select: { students: { where: { isDeleted: false } } } } },
    orderBy: { courseCode: 'asc' },
  })

  const rows: DataTableRow[] = courses.map((c) => ({
    key: c.id,
    searchText: `${c.courseCode} ${c.courseName} ${c.yearLevel}`,
    sortValues: {
      courseCode: c.courseCode,
      courseName: c.courseName,
      yearLevel: c.yearLevel,
      students: c._count.students,
    },
    cells: {
      courseCode: <span className="font-mono text-zinc-700">{c.courseCode}</span>,
      courseName: <span className="text-zinc-900">{c.courseName}</span>,
      yearLevel: <span className="text-zinc-600">{c.yearLevel || '—'}</span>,
      students: <span className="text-zinc-600">{c._count.students}</span>,
    },
    actions: (
      <>
        <EditAction href={`/courses/${c.id}/edit`} />
        <DeleteAction
          action={deleteCourse.bind(null, c.id)}
          confirmMessage={`Delete course '${c.courseCode}'?`}
        />
      </>
    ),
  }))

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900">Courses</h1>
        <Link href="/courses/new">
          <Button>Add Course</Button>
        </Link>
      </div>

      <DataTable
        columns={COLUMNS}
        rows={rows}
        hasActions
        searchPlaceholder="Search by code or name…"
        emptyMessage="No courses yet."
        defaultSortKey="courseCode"
      />
    </div>
  )
}
