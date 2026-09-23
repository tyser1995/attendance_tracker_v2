'use client'

import { useMemo, useState } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown, Search } from 'lucide-react'
import { Input } from './Input'
import { Pagination } from './Pagination'
import { cn } from '@/lib/utils/cn'

export type DataTableColumn = {
  key: string
  label: string
  sortable?: boolean
  align?: 'left' | 'right'
  className?: string
}

export type DataTableRow = {
  key: string
  cells: Record<string, React.ReactNode>
  sortValues?: Record<string, string | number>
  searchText?: string
  actions?: React.ReactNode
}

function compareValues(a: string | number | undefined, b: string | number | undefined) {
  if (a === undefined && b === undefined) return 0
  if (a === undefined) return -1
  if (b === undefined) return 1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' })
}

export function DataTable({
  columns,
  rows,
  searchPlaceholder = 'Search…',
  pageSize = 10,
  emptyMessage = 'No records found.',
  hasActions = false,
  defaultSortKey,
}: {
  columns: DataTableColumn[]
  rows: DataTableRow[]
  searchPlaceholder?: string
  pageSize?: number
  emptyMessage?: string
  hasActions?: boolean
  defaultSortKey?: string
}) {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<string | undefined>(defaultSortKey)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => (r.searchText ?? '').toLowerCase().includes(q))
  }, [rows, search])

  const sorted = useMemo(() => {
    if (!sortKey) return filtered
    const dir = sortDir === 'asc' ? 1 : -1
    return [...filtered].sort(
      (a, b) => dir * compareValues(a.sortValues?.[sortKey], b.sortValues?.[sortKey])
    )
  }, [filtered, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const paged = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
    setPage(1)
  }

  return (
    <div>
      <div className="relative mb-3 max-w-sm">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
        <Input
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="pl-9"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-sm shadow-zinc-900/[0.03]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-100 bg-zinc-50/60 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'px-4 py-3 font-medium',
                    col.align === 'right' && 'text-right',
                    col.className
                  )}
                >
                  {col.sortable ? (
                    <button
                      type="button"
                      onClick={() => handleSort(col.key)}
                      className={cn(
                        'inline-flex items-center gap-1 hover:text-zinc-700',
                        col.align === 'right' && 'flex-row-reverse'
                      )}
                    >
                      {col.label}
                      {sortKey === col.key ? (
                        sortDir === 'asc' ? (
                          <ChevronUp size={13} />
                        ) : (
                          <ChevronDown size={13} />
                        )
                      ) : (
                        <ChevronsUpDown size={13} className="text-zinc-300" />
                      )}
                    </button>
                  ) : (
                    col.label
                  )}
                </th>
              ))}
              {hasActions && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {paged.map((row) => (
              <tr key={row.key} className="hover:bg-indigo-50/30 transition-colors">
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn('px-4 py-3', col.align === 'right' && 'text-right')}
                  >
                    {row.cells[col.key]}
                  </td>
                ))}
                {hasActions && (
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">{row.actions}</div>
                  </td>
                )}
              </tr>
            ))}
            {paged.length === 0 && (
              <tr>
                <td colSpan={columns.length + (hasActions ? 1 : 0)} className="px-4 py-8 text-center text-zinc-500">
                  {search ? 'No matching records.' : emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  )
}
