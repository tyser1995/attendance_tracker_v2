import Form from 'next/form'
import { prisma } from '@/lib/prisma/client'
import { Input, Label, Select } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { FilterButton } from '@/components/ui/FilterButton'
import { DataTable, type DataTableRow } from '@/components/ui/DataTable'
import { statusText } from '@/lib/attendance/logAttendance'
import { todayStr, formatDateLong } from '@/lib/utils/date'

const STATUS_COLOR = { 1: 'green', 2: 'amber', 3: 'blue', 4: 'zinc' } as const

const COLUMNS = [
  { key: 'createdDate', label: 'Date', sortable: true },
  { key: 'idNumber', label: 'ID Number', sortable: true },
  { key: 'name', label: 'Name', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'timeIn', label: 'Time In', sortable: true },
  { key: 'timeOut', label: 'Time Out', sortable: true },
  { key: 'source', label: 'Source', sortable: true },
]

const SOURCES = { all: 'All logs', scanned: 'Scanned', imported: 'Imported' } as const
type Source = keyof typeof SOURCES

function formatImportedAt(date: Date): string {
  return date.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
}

const DATE = /^\d{4}-\d{2}-\d{2}$/

function validDate(value: string | undefined): string | undefined {
  return value && DATE.test(value) ? value : undefined
}

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; date?: string; source?: string }>
}) {
  const params = await searchParams
  const today = todayStr()
  // `date` is the old single-day filter; links that still use it show that one day.
  const single = validDate(params.date)
  let from = validDate(params.from) ?? single ?? today
  let to = validDate(params.to) ?? single ?? from
  if (from > to) [from, to] = [to, from]
  const source: Source = params.source === 'scanned' || params.source === 'imported' ? params.source : 'all'

  const records = await prisma.attendance.findMany({
    where: {
      createdDate: { gte: from, lte: to },
      ...(source === 'imported' ? { importedAt: { not: null } } : source === 'scanned' ? { importedAt: null } : {}),
    },
    orderBy: [{ createdDate: 'asc' }, { idNumber: 'asc' }, { createdAt: 'asc' }],
  })

  const rows: DataTableRow[] = records.map((r) => ({
    key: r.id,
    searchText: `${r.createdDate} ${r.idNumber} ${r.name} ${statusText(r.status)} ${r.importedAt ? `imported ${r.importSource ?? ''}` : 'scanned'}`,
    sortValues: {
      // Date then time in, so sorting by date keeps each day in scan order.
      createdDate: `${r.createdDate} ${r.timeIn ?? ''}`,
      idNumber: r.idNumber,
      name: r.name,
      status: r.status,
      timeIn: r.timeIn ?? '',
      timeOut: r.timeOut ?? '',
      source: r.importedAt ? `1 ${r.importedAt.toISOString()}` : '0',
    },
    cells: {
      createdDate: <span className="whitespace-nowrap text-zinc-600">{r.createdDate}</span>,
      idNumber: <span className="font-mono text-zinc-700">{r.idNumber}</span>,
      name: <span className="text-zinc-900">{r.name}</span>,
      status: <Badge color={STATUS_COLOR[r.status as 1 | 2 | 3 | 4] ?? 'zinc'}>{statusText(r.status)}</Badge>,
      timeIn: <span className="text-zinc-600">{r.timeIn ?? '—'}</span>,
      timeOut: <span className="text-zinc-600">{r.timeOut ?? '—'}</span>,
      source: r.importedAt ? (
        <span title={`Imported ${formatImportedAt(r.importedAt)}${r.importSource ? ` from ${r.importSource}` : ''}`}>
          <Badge color="indigo">Imported</Badge>
          <span className="mt-0.5 block max-w-48 truncate text-xs text-zinc-500">{formatImportedAt(r.importedAt)}</span>
        </span>
      ) : (
        <span className="text-zinc-500">Scanned</span>
      ),
    },
  }))

  const importedCount = records.filter((r) => r.importedAt).length
  const students = new Set(records.map((r) => r.idNumber)).size
  const days = new Set(records.map((r) => r.createdDate)).size
  const rangeLabel = from === to ? formatDateLong(from) : `${formatDateLong(from)} to ${formatDateLong(to)}`

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-zinc-900">Attendance Log</h1>

      <Form action="" className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <Label htmlFor="from">From</Label>
          <Input id="from" name="from" type="date" defaultValue={from} className="w-48" />
        </div>
        <div>
          <Label htmlFor="to">To</Label>
          <Input id="to" name="to" type="date" defaultValue={to} className="w-48" />
        </div>
        <div>
          <Label htmlFor="source">Source</Label>
          <Select id="source" name="source" defaultValue={source} className="w-40">
            {Object.entries(SOURCES).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <FilterButton>Filter</FilterButton>
      </Form>

      <p className="mb-3 text-sm text-zinc-500">
        {rangeLabel} · {records.length} {records.length === 1 ? 'record' : 'records'}
        {records.length > 0 && ` · ${students} ${students === 1 ? 'student' : 'students'}`}
        {from !== to && records.length > 0 && ` · ${days} ${days === 1 ? 'day' : 'days'} with logs`}
        {source === 'all' && importedCount > 0 && ` · ${importedCount} imported`}
      </p>

      <DataTable
        columns={COLUMNS}
        rows={rows}
        searchPlaceholder="Search by date, ID, name, or status…"
        emptyMessage={from === to ? 'No attendance records for this date.' : 'No attendance records in this date range.'}
        defaultSortKey="createdDate"
      />
    </div>
  )
}
