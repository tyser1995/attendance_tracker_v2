import Link from 'next/link'
import { prisma } from '@/lib/prisma/client'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { DataTable, type DataTableRow } from '@/components/ui/DataTable'
import { ToggleActiveAction, DeleteAction } from '@/components/ui/RowActions'
import { toggleIdPatternStatus, deleteIdPattern } from './actions'

const COLUMNS = [
  { key: 'pattern', label: 'Pattern', sortable: true },
  { key: 'regex', label: 'Regex' },
  { key: 'status', label: 'Status', sortable: true },
]

export default async function PatternsPage() {
  const patterns = await prisma.idPattern.findMany({ orderBy: { createdAt: 'asc' } })

  const rows: DataTableRow[] = patterns.map((p) => ({
    key: p.id,
    searchText: `${p.pattern} ${p.status}`,
    sortValues: { pattern: p.pattern, status: p.status },
    cells: {
      pattern: <span className="font-mono text-zinc-900">{p.pattern}</span>,
      regex: <span className="font-mono text-xs text-zinc-500">{p.regex}</span>,
      status: <Badge color={p.status === 'active' ? 'green' : 'zinc'}>{p.status}</Badge>,
    },
    actions: (
      <>
        <ToggleActiveAction
          action={toggleIdPatternStatus.bind(null, p.id, p.status)}
          active={p.status === 'active'}
        />
        <DeleteAction
          action={deleteIdPattern.bind(null, p.id)}
          confirmMessage={`Delete pattern '${p.pattern}'?`}
        />
      </>
    ),
  }))

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900">ID Patterns</h1>
        <Link href="/patterns/new">
          <Button>Add Pattern</Button>
        </Link>
      </div>

      <p className="mb-4 text-sm text-zinc-500">
        Define allowed ID formats using mask syntax (<code className="rounded bg-zinc-100 px-1">#</code> = digit,
        e.g. <code className="rounded bg-zinc-100 px-1">##-#####-#</code>). Scanned IDs are checked against every
        active pattern; if none are active, all IDs are accepted.
      </p>

      <DataTable
        columns={COLUMNS}
        rows={rows}
        hasActions
        searchPlaceholder="Search by pattern or status…"
        emptyMessage="No ID patterns — all scanned IDs are currently accepted."
        defaultSortKey="pattern"
      />
    </div>
  )
}
