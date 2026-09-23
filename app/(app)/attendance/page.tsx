import { prisma } from '@/lib/prisma/client'
import { Input, Label } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { DataTable, type DataTableRow } from '@/components/ui/DataTable'
import { statusText } from '@/lib/attendance/logAttendance'
import { todayStr, formatDateLong } from '@/lib/utils/date'

const STATUS_COLOR = { 1: 'green', 2: 'amber', 3: 'blue', 4: 'zinc' } as const

const COLUMNS = [
  { key: 'idNumber', label: 'ID Number', sortable: true },
  { key: 'name', label: 'Name', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'timeIn', label: 'Time In', sortable: true },
  { key: 'timeOut', label: 'Time Out', sortable: true },
]

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const { date } = await searchParams
  const selectedDate = date || todayStr()

  const records = await prisma.attendance.findMany({
    where: { createdDate: selectedDate },
    orderBy: [{ idNumber: 'asc' }, { createdAt: 'asc' }],
  })

  const rows: DataTableRow[] = records.map((r) => ({
    key: r.id,
    searchText: `${r.idNumber} ${r.name} ${statusText(r.status)}`,
    sortValues: {
      idNumber: r.idNumber,
      name: r.name,
      status: r.status,
      timeIn: r.timeIn ?? '',
      timeOut: r.timeOut ?? '',
    },
    cells: {
      idNumber: <span className="font-mono text-zinc-700">{r.idNumber}</span>,
      name: <span className="text-zinc-900">{r.name}</span>,
      status: <Badge color={STATUS_COLOR[r.status as 1 | 2 | 3 | 4] ?? 'zinc'}>{statusText(r.status)}</Badge>,
      timeIn: <span className="text-zinc-600">{r.timeIn ?? '—'}</span>,
      timeOut: <span className="text-zinc-600">{r.timeOut ?? '—'}</span>,
    },
  }))

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-zinc-900">Attendance Log</h1>

      <form className="mb-4 flex items-end gap-3">
        <div>
          <Label htmlFor="date">Date</Label>
          <Input id="date" name="date" type="date" defaultValue={selectedDate} className="w-48" />
        </div>
        <Button type="submit" variant="secondary">
          Filter
        </Button>
      </form>

      <p className="mb-3 text-sm text-zinc-500">{formatDateLong(selectedDate)}</p>

      <DataTable
        columns={COLUMNS}
        rows={rows}
        searchPlaceholder="Search by ID, name, or status…"
        emptyMessage="No attendance records for this date."
        defaultSortKey="idNumber"
      />
    </div>
  )
}
