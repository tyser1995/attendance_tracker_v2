'use client'

import { useState } from 'react'
import { compareBackupAction, mergeBackupAction, type MergeFileResult } from '@/app/(app)/settings/actions'
import type { MergeTable } from '@/lib/backup/merge'
import { Button } from '@/components/ui/Button'
import { Input, Label } from '@/components/ui/Input'

// Files are sent one at a time, so each only has to fit the upload limit by itself.
const MAX_FILE_BYTES = 9.5 * 1024 * 1024

const TABLE_LABEL: Record<MergeTable, string> = {
  course: 'Courses',
  student: 'Students',
  attendance: 'Attendance',
  idPattern: 'ID Patterns',
  user: 'User accounts',
}

type Mode = 'compare' | 'merge'

export function MergeBackupSection() {
  const [files, setFiles] = useState<File[]>([])
  const [results, setResults] = useState<MergeFileResult[]>([])
  const [resultMode, setResultMode] = useState<Mode | null>(null)
  const [running, setRunning] = useState<Mode | null>(null)
  const [compared, setCompared] = useState(false)

  async function run(mode: Mode) {
    if (mode === 'merge' && !confirm(`Add the new records from ${files.length} file(s)? Added records can't be removed automatically.`)) return

    setRunning(mode)
    setResults([])
    setResultMode(mode)
    const action = mode === 'compare' ? compareBackupAction : mergeBackupAction

    for (const file of files) {
      let result: MergeFileResult
      if (file.size > MAX_FILE_BYTES) {
        result = { fileName: file.name, error: 'This file is larger than the 9.5 MB limit.' }
      } else {
        try {
          const formData = new FormData()
          formData.append('backup', file)
          result = await action(formData)
        } catch {
          result = { fileName: file.name, error: 'This file could not be processed. Nothing was added from it.' }
        }
      }
      setResults((current) => [...current, result])
    }

    setRunning(null)
    setCompared(mode === 'compare')
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-500">
        Check several backup files against your current data and add only what&apos;s missing. Existing records are never changed
        or deleted.
      </p>

      <div className="max-w-sm">
        <Label htmlFor="mergeFiles">Backup files (.json)</Label>
        <Input
          id="mergeFiles"
          type="file"
          accept="application/json"
          multiple
          onChange={(e) => {
            setFiles(Array.from(e.target.files ?? []))
            setResults([])
            setResultMode(null)
            setCompared(false)
          }}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" disabled={files.length === 0 || running !== null} onClick={() => run('compare')}>
          {running === 'compare' ? 'Comparing…' : 'Compare'}
        </Button>
        <Button size="sm" disabled={!compared || running !== null} onClick={() => run('merge')}>
          {running === 'merge' ? 'Merging…' : 'Merge new records'}
        </Button>
      </div>

      {resultMode === 'compare' && results.length > 1 && (
        <p className="text-sm text-zinc-500">
          Each file is compared with your current data separately, so a record in two files counts as new in both. It will only
          be added once.
        </p>
      )}

      {results.map((result, index) => (
        <div key={`${result.fileName}-${index}`} className="rounded-lg border border-zinc-200">
          <p className="break-all border-b border-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-900">{result.fileName}</p>
          {result.error && <p className="px-4 py-3 text-sm text-red-600">{result.error}</p>}
          {result.results && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-zinc-500">
                  <tr>
                    <th className="px-4 py-2 font-medium">Data</th>
                    <th className="px-4 py-2 font-medium">In file</th>
                    <th className="px-4 py-2 font-medium">{resultMode === 'merge' ? 'Added' : 'New'}</th>
                    <th className="px-4 py-2 font-medium">Already exists</th>
                    <th className="px-4 py-2 font-medium">Exists, different</th>
                    <th className="px-4 py-2 font-medium">Invalid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {(Object.keys(TABLE_LABEL) as MergeTable[]).map((table) => {
                    const row = result.results![table]
                    return (
                      <tr key={table}>
                        <td className="px-4 py-2 text-zinc-900">{TABLE_LABEL[table]}</td>
                        <td className="px-4 py-2 text-zinc-600">{row.total}</td>
                        <td className="px-4 py-2 text-zinc-600">{table === 'user' ? `0 (${row.notAdded} not merged)` : row.new}</td>
                        <td className="px-4 py-2 text-zinc-600">{row.existing}</td>
                        <td className="px-4 py-2 text-zinc-600">{row.different}</td>
                        <td className="px-4 py-2 text-zinc-600">{row.invalid}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {Object.values(result.results).some((row) => row.examples.length > 0) && (
                <details className="border-t border-zinc-100 px-4 py-2.5 text-sm">
                  <summary className="cursor-pointer text-zinc-600">Show examples of differences</summary>
                  <ul className="mt-2 space-y-1 text-xs text-zinc-600">
                    {(Object.keys(TABLE_LABEL) as MergeTable[]).flatMap((table) =>
                      result.results![table].examples.map((example) => <li key={`${table}-${example}`}>{TABLE_LABEL[table]}: {example}</li>)
                    )}
                  </ul>
                </details>
              )}
            </div>
          )}
        </div>
      ))}

      <p className="text-sm text-zinc-500">
        New ID patterns are added as inactive, so they can&apos;t start rejecting scans. User accounts are only compared, never
        added.
      </p>
    </div>
  )
}
