'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { checkImportAction, runImportAction, type ImportFileResult } from '@/app/(app)/settings/actions'
import type { ImportKind, ImportResult } from '@/lib/backup/importCommon'
import { Button } from '@/components/ui/Button'
import { Input, Label } from '@/components/ui/Input'

const MAX_FILE_BYTES = 9.5 * 1024 * 1024

const TEXT: Record<ImportKind, { what: string; fileLabel: string }> = {
  users: { what: 'user accounts', fileLabel: 'Users file (.json)' },
  attendance: { what: 'time logs', fileLabel: 'Time logs file (.json)' },
}

type Mode = 'check' | 'import'

// Where to see what was just added: the user list, or the Attendance Log filtered to the
// days the new time logs cover.
function viewHref(kind: ImportKind, result: ImportResult): string {
  if (kind === 'users') return '/users'
  return `/attendance?${new URLSearchParams({ ...result.dateRange, source: 'imported' })}`
}

// Check-then-import for one kind of record from a JSON file. Duplicates are skipped and
// existing records are never changed; the server does all the validation.
export function ImportSection({ kind, intro, help }: { kind: ImportKind; intro: ReactNode; help: ReactNode }) {
  const { what, fileLabel } = TEXT[kind]
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<ImportFileResult | null>(null)
  const [resultMode, setResultMode] = useState<Mode | null>(null)
  const [running, setRunning] = useState<Mode | null>(null)

  async function run(mode: Mode) {
    if (!file) return
    if (mode === 'import' && !confirm(`Add the new ${what} from ${file.name}?`)) return

    setRunning(mode)
    setResult(null)
    setResultMode(mode)
    let next: ImportFileResult
    if (file.size > MAX_FILE_BYTES) {
      next = { fileName: file.name, error: 'This file is larger than the 9.5 MB limit.' }
    } else {
      try {
        const formData = new FormData()
        formData.append('file', file)
        next = await (mode === 'check' ? checkImportAction : runImportAction)(kind, formData)
      } catch {
        next = { fileName: file.name, error: 'This file could not be processed. Nothing was added from it.' }
      }
    }
    setResult(next)
    setRunning(null)
  }

  const summary = result?.result
  const canImport = resultMode === 'check' && Boolean(summary?.new)
  const inputId = `${kind}ImportFile`

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-500">{intro}</p>

      <div className="max-w-sm">
        <Label htmlFor={inputId}>{fileLabel}</Label>
        <Input
          id={inputId}
          type="file"
          accept="application/json"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null)
            setResult(null)
            setResultMode(null)
          }}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" disabled={!file || running !== null} onClick={() => run('check')}>
          {running === 'check' ? 'Checking…' : 'Check'}
        </Button>
        <Button size="sm" disabled={!canImport || running !== null} onClick={() => run('import')}>
          {running === 'import' ? 'Importing…' : `Import new ${what}`}
        </Button>
      </div>

      {result && (
        <div className="rounded-lg border border-zinc-200">
          <p className="break-all border-b border-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-900">{result.fileName}</p>
          {result.error && <p className="px-4 py-3 text-sm text-red-600">{result.error}</p>}
          {summary && (
            <>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 px-4 py-3 text-sm sm:grid-cols-5">
                {(
                  [
                    ['In file', summary.total],
                    [resultMode === 'import' ? 'Added' : 'New', summary.new],
                    ['Already exists', summary.duplicate],
                    ['Repeated in file', summary.duplicateInFile],
                    ['Invalid', summary.invalid],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-zinc-500">{label}</dt>
                    <dd className="font-medium text-zinc-900">{value}</dd>
                  </div>
                ))}
              </dl>
              <p className={`border-t border-zinc-100 px-4 py-2.5 text-sm ${summary.new ? 'text-zinc-700' : 'text-amber-700'}`}>
                {resultMode === 'import'
                  ? `Added ${summary.new} new ${what}.`
                  : summary.new
                    ? `${summary.new} new ${what} can be imported${
                        summary.dateRange ? ` (${summary.dateRange.from} to ${summary.dateRange.to})` : ''
                      }. Click "Import new ${what}" to add them.`
                    : `Nothing to import: every entry in this file already exists or is invalid.`}
                {resultMode === 'import' && summary.new > 0 && (
                  <>
                    {' '}
                    <Link href={viewHref(kind, summary)} className="font-medium text-indigo-600 hover:underline">
                      {kind === 'users' ? 'View users' : 'View them in the Attendance Log'}
                    </Link>
                  </>
                )}
              </p>
              {summary.examples.length > 0 && (
                <details className="border-t border-zinc-100 px-4 py-2.5 text-sm">
                  <summary className="cursor-pointer text-zinc-600">Show skipped records and notes</summary>
                  <ul className="mt-2 space-y-1 text-xs text-zinc-600">
                    {summary.examples.map((example, index) => (
                      <li key={index}>{example}</li>
                    ))}
                  </ul>
                </details>
              )}
            </>
          )}
        </div>
      )}

      <p className="text-sm text-zinc-500">{help}</p>
    </div>
  )
}
