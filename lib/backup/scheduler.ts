import fs from 'node:fs/promises'
import path from 'node:path'
import { prisma } from '@/lib/prisma/client'
import { logError } from '@/lib/logs/log'
import { exportBackup } from './backup'
import { computeFollowingBackup, type BackupFrequency } from './schedule'

const CHECK_INTERVAL_MS = 30_000

// The folder chosen in Settings, else BACKUP_DIR, else backups/ in the project.
export function backupDir(folder?: string | null): string {
  return folder || process.env.BACKUP_DIR || path.join(process.cwd(), 'backups')
}

// Creates the folder if needed and proves it's writable, so a bad path is reported when
// it's saved rather than when a backup fails later. Returns the problem, if any.
export async function checkBackupFolder(folder: string): Promise<string | null> {
  if (!path.isAbsolute(folder)) return 'Enter a full folder path, such as D:\\Backups.'

  const probe = path.join(folder, '.attendance-backup-write-test')
  try {
    await fs.mkdir(folder, { recursive: true })
    await fs.writeFile(probe, '')
    await fs.rm(probe)
    return null
  } catch (err) {
    return `Can't save to that folder: ${err instanceof Error ? err.message : 'unknown error'}`
  }
}

function backupFilename(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  return `attendance_backup_${date}_${time}.json`
}

async function writeBackupFile(now: Date, folder: string | null): Promise<void> {
  const dir = backupDir(folder)
  await fs.mkdir(dir, { recursive: true })
  const target = path.join(dir, backupFilename(now))
  // Written under a temporary name first, so a crash can't leave a truncated backup.
  await fs.writeFile(`${target}.tmp`, JSON.stringify(await exportBackup(prisma), null, 2))
  await fs.rename(`${target}.tmp`, target)
}

// Runs the backup if one is due. A run missed while the server was off is due on the
// next check, and only once. Failures are saved for the Settings page, then wait for the
// next scheduled run instead of retrying on every check.
export async function runDueBackup(now: Date = new Date()): Promise<void> {
  const row = await prisma.settings.findUnique({ where: { id: 1 } })
  if (!row || row.backupFrequency === 'off' || !row.nextBackupAt || row.nextBackupAt > now) return

  const nextBackupAt = computeFollowingBackup(
    {
      frequency: row.backupFrequency as BackupFrequency,
      time: row.backupTime,
      weekday: row.backupWeekday,
      monthDay: row.backupMonthDay,
    },
    row.nextBackupAt,
    now
  )

  try {
    await writeBackupFile(now, row.backupFolder)
    await prisma.settings.update({
      where: { id: 1 },
      data: { lastBackupAt: now, lastBackupError: null, nextBackupAt },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Backup failed.'
    console.error('Scheduled backup failed:', err)
    await logError({ source: 'backup', message: `Scheduled backup failed: ${message}`, stack: err instanceof Error ? err.stack : null })
    await prisma.settings.update({ where: { id: 1 }, data: { lastBackupError: message, nextBackupAt } })
  }
}

const globalForScheduler = globalThis as unknown as { backupSchedulerStarted?: boolean }

export function startBackupScheduler(): void {
  if (globalForScheduler.backupSchedulerStarted) return
  globalForScheduler.backupSchedulerStarted = true

  let running = false
  const check = async () => {
    if (running) return
    running = true
    try {
      await runDueBackup()
    } catch (err) {
      console.error('Backup scheduler check failed:', err)
      await logError({ source: 'backup', message: `Backup check failed: ${err instanceof Error ? err.message : String(err)}` })
    } finally {
      running = false
    }
  }

  void check()
  setInterval(check, CHECK_INTERVAL_MS).unref()
}
