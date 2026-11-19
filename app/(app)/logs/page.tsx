import Form from 'next/form'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma/client'
import { isSuperAdmin } from '@/lib/auth/roles'
import { todayStr } from '@/lib/utils/date'
import { Badge } from '@/components/ui/Badge'
import { Card, CardBody } from '@/components/ui/Card'
import { FilterButton } from '@/components/ui/FilterButton'
import { Input, Label } from '@/components/ui/Input'
import { LogsAutoRefresh } from '@/components/logs/LogsAutoRefresh'
import { cn } from '@/lib/utils/cn'

const PAGE_SIZE = 50

const ACTION_LABEL: Record<string, string> = {
  page_view: 'Opened page',
  click: 'Clicked',
  login: 'Signed in',
  login_failed: 'Failed sign-in',
  logout: 'Signed out',
  backup_restore: 'Restored backup',
  backup_merge: 'Merged backup',
  users_import: 'Imported users',
  attendance_import: 'Imported time logs',
  branding_change: 'Changed branding',
}
const ACTION_COLOR: Record<string, 'zinc' | 'blue' | 'green' | 'amber' | 'indigo'> = {
  page_view: 'blue',
  click: 'zinc',
  login: 'green',
  login_failed: 'amber',
  logout: 'zinc',
  backup_restore: 'indigo',
  backup_merge: 'indigo',
  users_import: 'indigo',
  attendance_import: 'indigo',
  branding_change: 'indigo',
}

type SearchParams = { tab?: string; from?: string; to?: string; user?: string; q?: string; page?: string }

function formatTime(date: Date): string {
  return date.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'medium' })
}

// Dates that don't parse are ignored rather than crashing the page.
function dateRange(from?: string, to?: string) {
  const start = from ? new Date(`${from}T00:00:00`) : null
  const end = to ? new Date(`${to}T23:59:59.999`) : null
  return {
    ...(start && !Number.isNaN(start.getTime()) ? { gte: start } : {}),
    ...(end && !Number.isNaN(end.getTime()) ? { lte: end } : {}),
  }
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardBody className="py-4">
        <p className="text-sm text-zinc-500">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-zinc-900">{value}</p>
      </CardBody>
    </Card>
  )
}

export default async function LogsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await auth()
  if (!session || !isSuperAdmin(session.user.role)) redirect('/scanner')

  const params = await searchParams
  const tab = params.tab === 'errors' ? 'errors' : 'activity'
  const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1)
  const user = params.user?.trim() || undefined
  const q = params.q?.trim() || undefined
  const createdAt = dateRange(params.from, params.to)
  const skip = (page - 1) * PAGE_SIZE

  const today = { gte: new Date(`${todayStr()}T00:00:00`) }
  const [pageViews, clicks, activeUsers, errorsToday] = await Promise.all([
    prisma.activityLog.count({ where: { action: 'page_view', createdAt: today } }),
    prisma.activityLog.count({ where: { action: 'click', createdAt: today } }),
    prisma.activityLog.findMany({
      where: { createdAt: today, username: { not: null }, action: { not: 'login_failed' } },
      distinct: ['username'],
      select: { username: true },
    }),
    prisma.errorLog.count({ where: { createdAt: today } }),
  ])

  const activityWhere = {
    createdAt,
    ...(user ? { username: { contains: user } } : {}),
    ...(q ? { OR: [{ path: { contains: q } }, { target: { contains: q } }, { action: { contains: q } }] } : {}),
  }
  const errorWhere = {
    createdAt,
    ...(user ? { username: { contains: user } } : {}),
    ...(q ? { OR: [{ message: { contains: q } }, { path: { contains: q } }, { source: { contains: q } }] } : {}),
  }

  const [activity, errors, total] = await Promise.all([
    tab === 'activity'
      ? prisma.activityLog.findMany({ where: activityWhere, orderBy: { createdAt: 'desc' }, skip, take: PAGE_SIZE })
      : [],
    tab === 'errors'
      ? prisma.errorLog.findMany({ where: errorWhere, orderBy: { createdAt: 'desc' }, skip, take: PAGE_SIZE })
      : [],
    tab === 'activity' ? prisma.activityLog.count({ where: activityWhere }) : prisma.errorLog.count({ where: errorWhere }),
  ])
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const href = (changes: Partial<SearchParams>) => {
    const merged: SearchParams = { ...params, ...changes }
    const query = new URLSearchParams(Object.entries(merged).filter(([, value]) => value) as [string, string][])
    return `/logs?${query}`
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-zinc-900">Logs</h1>
        <LogsAutoRefresh />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard label="Pages opened today" value={pageViews} />
        <SummaryCard label="Clicks today" value={clicks} />
        <SummaryCard label="Active users today" value={activeUsers.length} />
        <SummaryCard label="Errors today" value={errorsToday} />
      </div>

      <div className="flex gap-1 border-b border-zinc-200">
        {(['activity', 'errors'] as const).map((name) => (
          <Link
            key={name}
            href={href({ tab: name, page: undefined })}
            className={cn(
              '-mb-px border-b-2 px-4 py-2 text-sm font-medium',
              tab === name ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-zinc-500 hover:text-zinc-900'
            )}
          >
            {name === 'activity' ? 'User Activity' : 'Errors'}
          </Link>
        ))}
      </div>

      <Form action="" className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="tab" value={tab} />
        <div>
          <Label htmlFor="from">From</Label>
          <Input id="from" name="from" type="date" defaultValue={params.from} className="w-44" />
        </div>
        <div>
          <Label htmlFor="to">To</Label>
          <Input id="to" name="to" type="date" defaultValue={params.to} className="w-44" />
        </div>
        <div>
          <Label htmlFor="user">User</Label>
          <Input id="user" name="user" defaultValue={params.user} className="w-40" />
        </div>
        <div>
          <Label htmlFor="q">Search</Label>
          <Input id="q" name="q" defaultValue={params.q} placeholder={tab === 'activity' ? 'Page or button' : 'Message or page'} className="w-48" />
        </div>
        <FilterButton>Filter</FilterButton>
      </Form>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-100 text-zinc-500">
              {tab === 'activity' ? (
                <tr>
                  <th className="px-4 py-3 font-medium">Time</th>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                  <th className="px-4 py-3 font-medium">Page</th>
                  <th className="px-4 py-3 font-medium">Details</th>
                </tr>
              ) : (
                <tr>
                  <th className="px-4 py-3 font-medium">Time</th>
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-4 py-3 font-medium">Error</th>
                  <th className="px-4 py-3 font-medium">Page</th>
                  <th className="px-4 py-3 font-medium">User</th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {activity.map((log) => (
                <tr key={log.id}>
                  <td className="whitespace-nowrap px-4 py-2.5 text-zinc-600">{formatTime(log.createdAt)}</td>
                  <td className="px-4 py-2.5 text-zinc-900">
                    {log.username ?? '—'}
                    {log.role && <span className="ml-1 text-xs text-zinc-400">{log.role}</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge color={ACTION_COLOR[log.action] ?? 'zinc'}>{ACTION_LABEL[log.action] ?? log.action}</Badge>
                  </td>
                  <td className="break-all px-4 py-2.5 font-mono text-xs text-zinc-600">{log.path ?? '—'}</td>
                  <td className="px-4 py-2.5 text-zinc-600">{log.target ?? '—'}</td>
                </tr>
              ))}
              {errors.map((log) => (
                <tr key={log.id} className="align-top">
                  <td className="whitespace-nowrap px-4 py-2.5 text-zinc-600">{formatTime(log.createdAt)}</td>
                  <td className="px-4 py-2.5">
                    <Badge color="amber">{log.source}</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-zinc-900">
                    <p className="break-words">{log.message}</p>
                    {log.digest && <p className="mt-1 font-mono text-xs text-zinc-400">Digest: {log.digest}</p>}
                    {log.stack && (
                      <details className="mt-1">
                        <summary className="cursor-pointer text-xs text-zinc-500">Show details</summary>
                        <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap break-all rounded bg-zinc-50 p-2 text-xs text-zinc-600">
                          {log.stack}
                        </pre>
                      </details>
                    )}
                  </td>
                  <td className="break-all px-4 py-2.5 font-mono text-xs text-zinc-600">{log.path ?? '—'}</td>
                  <td className="px-4 py-2.5 text-zinc-900">{log.username ?? '—'}</td>
                </tr>
              ))}
              {total === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-zinc-500">
                    {tab === 'activity' ? 'No activity found.' : 'No errors found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-zinc-100 px-5 py-3.5 text-sm text-zinc-500">
          <p>
            {total} {total === 1 ? 'entry' : 'entries'}, page {Math.min(page, totalPages)} of {totalPages}
          </p>
          <div className="flex gap-3 font-medium">
            {page > 1 && <Link href={href({ page: String(page - 1) })} className="text-indigo-700">Previous</Link>}
            {page < totalPages && <Link href={href({ page: String(page + 1) })} className="text-indigo-700">Next</Link>}
          </div>
        </div>
      </Card>

      <p className="text-sm text-zinc-500">Logs are kept for 90 days and aren&apos;t included in backups.</p>
    </div>
  )
}
