import { getSettings } from '@/lib/settings/getSettings'
import { prisma } from '@/lib/prisma/client'
import { backupDir } from '@/lib/backup/scheduler'
import type { BackupFrequency } from '@/lib/backup/schedule'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { AppNameForm } from '@/components/settings/AppNameForm'
import { BrandingForm } from '@/components/settings/BrandingForm'
import { InitialPageForm } from '@/components/settings/InitialPageForm'
import { BackupScheduleForm } from '@/components/settings/BackupScheduleForm'
import { BackupSection } from '@/components/settings/BackupSection'
import { MergeBackupSection } from '@/components/settings/MergeBackupSection'
import { ImportSection } from '@/components/settings/ImportSection'

// Hidden from Settings for now. The features still work; set these to true to show them again.
const SHOW_MERGE_BACKUPS = false
const SHOW_IMPORT_USERS = false

function formatRun(date: Date | null | undefined): string {
  return date ? date.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '—'
}

export default async function SettingsPage() {
  const settings = await getSettings()
  // Read directly: the scheduler updates these outside of any request, so a cached value would be stale.
  const row = await prisma.settings.findUnique({ where: { id: 1 } })

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold text-zinc-900">Settings</h1>

      <Card>
        <CardHeader>
          <h2 className="font-medium text-zinc-900">Application Name</h2>
        </CardHeader>
        <CardBody>
          <AppNameForm appName={settings.appName} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-medium text-zinc-900">Logo &amp; Browser Icon</h2>
        </CardHeader>
        <CardBody className="space-y-6">
          <BrandingForm kind="logo" currentUrl={settings.logoUrl} />
          <BrandingForm kind="favicon" currentUrl={settings.faviconUrl} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-medium text-zinc-900">Initial Page</h2>
        </CardHeader>
        <CardBody>
          <InitialPageForm initialPage={settings.initialPage} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-medium text-zinc-900">Scheduled Backup</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <BackupScheduleForm
            schedule={{
              frequency: (row?.backupFrequency ?? 'off') as BackupFrequency,
              time: row?.backupTime ?? '18:00',
              weekday: row?.backupWeekday ?? 1,
              monthDay: row?.backupMonthDay ?? 1,
            }}
            folder={row?.backupFolder ?? ''}
            defaultFolder={backupDir()}
          />
          <dl className="space-y-1 border-t border-zinc-100 pt-4 text-sm">
            <div className="flex gap-2">
              <dt className="w-24 shrink-0 text-zinc-500">Last backup</dt>
              <dd className="text-zinc-900">{formatRun(row?.lastBackupAt)}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-24 shrink-0 text-zinc-500">Next backup</dt>
              <dd className="text-zinc-900">{formatRun(row?.nextBackupAt)}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-24 shrink-0 text-zinc-500">Saved to</dt>
              <dd className="break-all font-mono text-zinc-900">{backupDir(row?.backupFolder)}</dd>
            </div>
          </dl>
          {row?.lastBackupError && <p className="text-sm text-red-600">Last backup failed: {row.lastBackupError}</p>}
          <p className="text-sm text-zinc-500">
            Backups only run while the app is running. A backup missed while it was closed runs the next time it starts.
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-medium text-zinc-900">Data Backup &amp; Restore</h2>
        </CardHeader>
        <CardBody>
          <BackupSection />
        </CardBody>
      </Card>

      {SHOW_MERGE_BACKUPS && (
        <Card>
          <CardHeader>
            <h2 className="font-medium text-zinc-900">Compare &amp; Merge Backups</h2>
          </CardHeader>
          <CardBody>
            <MergeBackupSection />
          </CardBody>
        </Card>
      )}

      {SHOW_IMPORT_USERS && (
        <Card>
          <CardHeader>
            <h2 className="font-medium text-zinc-900">Import User Accounts</h2>
          </CardHeader>
          <CardBody>
            <ImportSection
              kind="users"
              intro="Add login accounts from a backup or a JSON list of users. Only user accounts are read from the file. Usernames that already exist (ignoring case) or repeat in the file are skipped, and existing accounts are never changed."
              help={
                <>
                  Each account needs a <code>username</code> and either a <code>passwordHash</code> (as in backups) or a plain{' '}
                  <code>password</code> of at least 6 characters. <code>role</code> defaults to STAFF.
                </>
              }
            />
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <h2 className="font-medium text-zinc-900">Import Time Logs</h2>
        </CardHeader>
        <CardBody>
          <ImportSection
            kind="attendance"
            intro="Add attendance time logs from a backup (this app or the Flutter app), a JSON list of logs, or a CSV exported from Reports. Only time logs are read from the file. A student can have one AM and one PM log per day, so a log for a day and session that already exists, or repeats in the file, is skipped. Existing logs are never changed."
            help={
              <>
                <strong className="font-medium text-zinc-600">CSV:</strong> needs the columns Date, Student ID, Status (e.g. AM
                Time In) and Time In, as in a Reports export. Name and Time Out are used when present; other columns, such as
                Course and Year, are ignored.
                <br />
                <strong className="font-medium text-zinc-600">JSON:</strong> each log needs <code>idNumber</code>,{' '}
                <code>createdDate</code> (YYYY-MM-DD), <code>status</code> (1 AM in, 2 AM out, 3 PM in, 4 PM out) and{' '}
                <code>timeIn</code> (HH:MM:SS).
                <br />
                AM Out and PM Out logs also need a time out. A missing name is filled in from the student list.
              </>
            }
          />
        </CardBody>
      </Card>
    </div>
  )
}
