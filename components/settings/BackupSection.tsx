'use client'

import { useActionState, useState } from 'react'
import { exportBackupData, importBackupAction, type FormState } from '@/app/(app)/settings/actions'
import { downloadBlob } from '@/lib/export/download'
import { Button } from '@/components/ui/Button'
import { Input, Label } from '@/components/ui/Input'
import { ConfirmSubmit } from '@/components/ui/ConfirmSubmit'

export function BackupSection() {
  const [exporting, setExporting] = useState(false)
  const [importState, importAction, importPending] = useActionState<FormState, FormData>(importBackupAction, null)

  async function handleExport() {
    setExporting(true)
    try {
      const data = await exportBackupData()
      const filename = `attendance_backup_${new Date().toISOString().slice(0, 10)}.json`
      downloadBlob(JSON.stringify(data, null, 2), filename, 'application/json')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-1 font-medium text-zinc-900">Export Full Backup</h3>
        <p className="mb-2 text-sm text-zinc-500">
          Downloads a JSON file containing all students, courses, attendance records, ID patterns, and users.
        </p>
        <Button variant="secondary" onClick={handleExport} disabled={exporting}>
          {exporting ? 'Preparing…' : 'Export Backup (JSON)'}
        </Button>
      </div>

      <div>
        <h3 className="mb-1 font-medium text-zinc-900">Restore from Backup</h3>
        <p className="mb-2 text-sm text-zinc-500">
          Replaces all current data with the contents of the selected backup file. This cannot be undone.
        </p>
        <form action={importAction} className="flex items-end gap-3">
          <div className="max-w-xs flex-1">
            <Label htmlFor="backup">Backup file (.json)</Label>
            <Input id="backup" name="backup" type="file" accept="application/json" required />
          </div>
          <ConfirmSubmit
            variant="danger"
            disabled={importPending}
            confirmMessage="Restore from backup? This replaces ALL current data and cannot be undone."
          >
            {importPending ? 'Restoring…' : 'Restore'}
          </ConfirmSubmit>
        </form>
        {importState?.message && <p className="mt-2 text-sm text-emerald-700">{importState.message}</p>}
        {importState?.error && <p className="mt-2 text-sm text-red-600">{importState.error}</p>}
      </div>
    </div>
  )
}
