import { prisma } from '@/lib/prisma/client'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { AttendancePieChart } from '@/components/dashboard/AttendancePieChart'
import { todayStr, formatDateLong } from '@/lib/utils/date'
import { Users, UserCheck, UserX, TrendingUp, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const STAT_STYLES = {
  indigo: { icon: 'bg-indigo-50 text-indigo-600' },
  emerald: { icon: 'bg-emerald-50 text-emerald-600' },
  red: { icon: 'bg-red-50 text-red-600' },
  amber: { icon: 'bg-amber-50 text-amber-600' },
} as const

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string
  value: number | string
  icon: LucideIcon
  color: keyof typeof STAT_STYLES
}) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardBody className="flex items-start justify-between">
        <div>
          <p className="text-sm text-zinc-500">{label}</p>
          <p className="mt-1.5 text-2xl font-semibold tracking-tight text-zinc-900">{value}</p>
        </div>
        <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg', STAT_STYLES[color].icon)}>
          <Icon size={18} />
        </span>
      </CardBody>
    </Card>
  )
}

export default async function DashboardPage() {
  const today = todayStr()

  const [totalStudents, todayRecords] = await Promise.all([
    prisma.student.count({ where: { isDeleted: false } }),
    prisma.attendance.findMany({ where: { createdDate: today } }),
  ])

  const presentIds = new Set(todayRecords.map((r) => r.idNumber))
  const present = presentIds.size
  const absent = Math.max(totalStudents - present, 0)
  const amIn = todayRecords.filter((r) => r.status === 1).length
  const amOut = todayRecords.filter((r) => r.status === 2).length
  const pmIn = todayRecords.filter((r) => r.status === 3).length
  const pmOut = todayRecords.filter((r) => r.status === 4).length
  const rate = totalStudents > 0 ? Math.round((present / totalStudents) * 100) : 0

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Dashboard</h1>
      <p className="mb-6 text-sm text-zinc-500">{formatDateLong(today)}</p>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Students" value={totalStudents} icon={Users} color="indigo" />
        <StatCard label="Present Today" value={present} icon={UserCheck} color="emerald" />
        <StatCard label="Absent Today" value={absent} icon={UserX} color="red" />
        <StatCard label="Attendance Rate" value={`${rate}%`} icon={TrendingUp} color="amber" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="font-medium text-zinc-900">Present vs Absent</h2>
          </CardHeader>
          <CardBody>
            <AttendancePieChart present={present} absent={absent} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-medium text-zinc-900">AM / PM Totals</h2>
          </CardHeader>
          <CardBody>
            <dl className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-zinc-50 p-3">
                <dt className="text-sm text-zinc-500">AM Time In</dt>
                <dd className="text-xl font-semibold text-zinc-900">{amIn}</dd>
              </div>
              <div className="rounded-lg bg-zinc-50 p-3">
                <dt className="text-sm text-zinc-500">AM Time Out</dt>
                <dd className="text-xl font-semibold text-zinc-900">{amOut}</dd>
              </div>
              <div className="rounded-lg bg-zinc-50 p-3">
                <dt className="text-sm text-zinc-500">PM Time In</dt>
                <dd className="text-xl font-semibold text-zinc-900">{pmIn}</dd>
              </div>
              <div className="rounded-lg bg-zinc-50 p-3">
                <dt className="text-sm text-zinc-500">PM Time Out</dt>
                <dd className="text-xl font-semibold text-zinc-900">{pmOut}</dd>
              </div>
            </dl>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
