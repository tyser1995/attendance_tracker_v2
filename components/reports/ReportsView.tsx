'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { DataTable, type DataTableRow } from '@/components/ui/DataTable'
import { toCsv, downloadBlob, downloadPdf, type AttendanceExportRow } from '@/lib/export/download'

export type PerStudentRow = { idNumber: string; name: string; count: number }
export type DailyCount = { date: string; label: string; count: number }

const COLUMNS = [
  { key: 'idNumber', label: 'ID Number', sortable: true },
  { key: 'name', label: 'Name', sortable: true },
  { key: 'count', label: 'Log Count', sortable: true },
]

export function ReportsView({
  perStudent,
  dailyCounts,
  exportRows,
  from,
  to,
}: {
  perStudent: PerStudentRow[]
  dailyCounts: DailyCount[]
  exportRows: AttendanceExportRow[]
  from: string
  to: string
}) {
  const hasData = exportRows.length > 0

  const rows: DataTableRow[] = perStudent.map((r) => ({
    key: r.idNumber,
    searchText: `${r.idNumber} ${r.name}`,
    sortValues: { idNumber: r.idNumber, name: r.name, count: r.count },
    cells: {
      idNumber: <span className="font-mono text-zinc-700">{r.idNumber}</span>,
      name: <span className="text-zinc-900">{r.name}</span>,
      count: <span className="text-zinc-600">{r.count}</span>,
    },
  }))

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex items-center justify-between">
          <h2 className="font-medium text-zinc-900">Attendance by Day</h2>
        </CardHeader>
        <CardBody>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={dailyCounts}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" fontSize={12} />
              <YAxis allowDecimals={false} fontSize={12} />
              <Tooltip />
              <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardBody>
      </Card>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-medium text-zinc-900">Per-Student Log Counts</h2>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={!hasData}
              onClick={() => downloadBlob(toCsv(exportRows), `attendance_${from}_to_${to}.csv`, 'text/csv')}
            >
              Export CSV
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={!hasData}
              onClick={() =>
                downloadPdf(exportRows, `attendance_${from}_to_${to}.pdf`, `Attendance Report (${from} to ${to})`)
              }
            >
              Export PDF
            </Button>
          </div>
        </div>
        <DataTable
          columns={COLUMNS}
          rows={rows}
          searchPlaceholder="Search by ID or name…"
          emptyMessage="No attendance records in this date range."
          defaultSortKey="idNumber"
        />
      </div>
    </div>
  )
}
