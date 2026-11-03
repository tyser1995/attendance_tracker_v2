import Form from 'next/form'
import { prisma } from '@/lib/prisma/client'
import { Input, Label } from '@/components/ui/Input'
import { FilterButton } from '@/components/ui/FilterButton'
import { ReportsView, type PerStudentRow, type DailyCount } from '@/components/reports/ReportsView'
import { statusText } from '@/lib/attendance/logAttendance'
import { todayStr, formatDateLabel } from '@/lib/utils/date'

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>
}) {
  const { from: fromParam, to: toParam } = await searchParams
  const today = todayStr()
  const from = fromParam || today
  const to = toParam || today

  const records = await prisma.attendance.findMany({
    where: { createdDate: { gte: from, lte: to } },
    orderBy: [{ createdDate: 'asc' }, { idNumber: 'asc' }],
  })

  // Attendance rows have no relation to Student, so match on idNumber. Soft-deleted
  // students sort first and get overwritten by an active student with the same ID, but
  // still resolve on their own so past attendance keeps its course. Loads every student
  // rather than filtering by ID: a wide date range can exceed the database's parameter limit.
  const students = await prisma.student.findMany({
    select: { idNumber: true, course: { select: { courseCode: true, yearLevel: true } } },
    orderBy: { isDeleted: 'desc' },
  })
  const courseByIdNumber = new Map(students.map((s) => [s.idNumber, s.course]))

  const perStudentMap = new Map<string, PerStudentRow>()
  for (const r of records) {
    const existing = perStudentMap.get(r.idNumber)
    if (existing) existing.count += 1
    else perStudentMap.set(r.idNumber, { idNumber: r.idNumber, name: r.name, count: 1 })
  }
  const perStudent = Array.from(perStudentMap.values()).sort((a, b) => a.idNumber.localeCompare(b.idNumber))

  const dailyMap = new Map<string, number>()
  for (const r of records) {
    dailyMap.set(r.createdDate, (dailyMap.get(r.createdDate) ?? 0) + 1)
  }
  const dailyCounts: DailyCount[] = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, label: formatDateLabel(date), count }))

  const exportRows = records.map((r) => ({
    date: r.createdDate,
    idNumber: r.idNumber,
    name: r.name,
    course: courseByIdNumber.get(r.idNumber)?.courseCode ?? '',
    year: courseByIdNumber.get(r.idNumber)?.yearLevel ?? '',
    status: statusText(r.status),
    timeIn: r.timeIn ?? '',
    timeOut: r.timeOut ?? '',
  }))

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-zinc-900">Reports</h1>

      <Form action="" className="mb-6 flex flex-wrap items-end gap-3">
        <div>
          <Label htmlFor="from">From</Label>
          <Input id="from" name="from" type="date" defaultValue={from} className="w-44" />
        </div>
        <div>
          <Label htmlFor="to">To</Label>
          <Input id="to" name="to" type="date" defaultValue={to} className="w-44" />
        </div>
        <FilterButton>Apply</FilterButton>
      </Form>

      <ReportsView perStudent={perStudent} dailyCounts={dailyCounts} exportRows={exportRows} from={from} to={to} />
    </div>
  )
}
