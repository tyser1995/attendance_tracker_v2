'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma/client'
import { invalidateSettingsCache } from '@/lib/settings/getSettings'
import { isSuperAdmin } from '@/lib/auth/roles'
import { appNameSchema, backupScheduleSchema } from '@/lib/validation/settings'
import { computeFirstBackup } from '@/lib/backup/schedule'
import { checkBackupFolder } from '@/lib/backup/scheduler'
import { exportBackup, importBackup, parseBackup, type BackupData } from '@/lib/backup/backup'
import { mergeBackup, type MergeResults } from '@/lib/backup/merge'
import { extractUsers, importUsers } from '@/lib/backup/importUsers'
import { importAttendance, readAttendanceFile } from '@/lib/backup/importAttendance'
import { decodeText } from '@/lib/backup/csv'
import type { ImportKind, ImportResult } from '@/lib/backup/importCommon'
import type { PrismaClient } from '@/app/generated/prisma'
import { logActivity, logError } from '@/lib/logs/log'
import { MAX_BRANDING_BYTES, checkBrandingImage, isBrandingKind } from '@/lib/branding/image'

export type FormState = { message?: string; error?: string } | null
export type MergeFileResult = { fileName: string; results?: MergeResults; error?: string }

export async function updateInitialPage(_prev: FormState, formData: FormData): Promise<FormState> {
  const initialPage = formData.get('initialPage') === 'scanner' ? 'scanner' : 'login'

  await prisma.settings.upsert({
    where: { id: 1 },
    update: { initialPage },
    create: { id: 1, initialPage },
  })
  invalidateSettingsCache()
  revalidatePath('/settings')

  return { message: 'Settings saved.' }
}

export async function updateAppName(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await auth()
  if (!session || !isSuperAdmin(session.user.role)) {
    return { error: 'Only a Super Admin can change the application name.' }
  }

  const parsed = appNameSchema.safeParse(formData.get('appName'))
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  await prisma.settings.upsert({
    where: { id: 1 },
    update: { appName: parsed.data },
    create: { id: 1, appName: parsed.data },
  })
  invalidateSettingsCache()
  revalidatePath('/', 'layout')

  return { message: 'Application name saved.' }
}

export async function updateBranding(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await auth()
  if (!session || !isSuperAdmin(session.user.role)) {
    return { error: 'Only a Super Admin can change the logo or browser icon.' }
  }

  const kind = formData.get('kind')
  if (!isBrandingKind(kind)) return { error: 'Unknown image type.' }
  const label = kind === 'logo' ? 'Logo' : 'Browser icon'
  const reset = formData.get('intent') === 'reset'

  if (reset) {
    await prisma.brandingAsset.deleteMany({ where: { kind } })
  } else {
    const file = formData.get('image')
    if (!(file instanceof File) || file.size === 0) return { error: 'Choose an image first.' }
    // Checked before reading, so an oversized file is never loaded into memory.
    if (file.size > MAX_BRANDING_BYTES) return { error: 'The image must be 1 MB or smaller.' }

    const data = new Uint8Array(await file.arrayBuffer())
    const checked = checkBrandingImage(kind, data)
    if ('error' in checked) return { error: checked.error }

    const asset = { mimeType: checked.mimeType, data }
    await prisma.brandingAsset.upsert({ where: { kind }, update: asset, create: { kind, ...asset } })
  }

  invalidateSettingsCache()
  revalidatePath('/', 'layout')
  await logActivity({
    action: 'branding_change',
    username: session.user.username,
    role: session.user.role,
    path: '/settings',
    target: `${label} ${reset ? 'reset to default' : 'updated'}`,
  })

  return { message: reset ? `${label} reset to default.` : `${label} updated.` }
}

export async function updateBackupSchedule(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await auth()
  if (!session || !isSuperAdmin(session.user.role)) {
    return { error: 'Only a Super Admin can change the backup schedule.' }
  }

  const parsed = backupScheduleSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { frequency, time, weekday, monthDay, folder } = parsed.data
  // Skipped when off, so a folder that's gone can't stop someone turning backups off.
  if (folder && frequency !== 'off') {
    const problem = await checkBackupFolder(folder)
    if (problem) return { error: problem }
  }

  const schedule = {
    backupFrequency: frequency,
    backupTime: time,
    backupWeekday: weekday,
    backupMonthDay: monthDay,
    backupFolder: folder || null,
    nextBackupAt: computeFirstBackup(parsed.data, new Date()),
  }
  await prisma.settings.upsert({ where: { id: 1 }, update: schedule, create: { id: 1, ...schedule } })
  revalidatePath('/settings')

  return { message: frequency === 'off' ? 'Scheduled backups turned off.' : 'Backup schedule saved.' }
}

export async function exportBackupData(): Promise<BackupData> {
  return exportBackup(prisma)
}

export async function importBackupAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const file = formData.get('backup')
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'Choose a backup .json file first.' }
  }

  let raw: unknown
  try {
    raw = JSON.parse(await file.text())
  } catch {
    return { error: 'That file is not valid JSON.' }
  }

  try {
    const counts = await importBackup(prisma, parseBackup(raw))
    invalidateSettingsCache()
    revalidatePath('/', 'layout')
    const session = await auth()
    await logActivity({
      action: 'backup_restore',
      username: session?.user.username,
      role: session?.user.role,
      path: '/settings',
      target: file.name,
    })
    const summary = Object.entries(counts)
      .map(([model, count]) => `${count} ${model}`)
      .join(', ')
    return { message: `Restore complete: ${summary || 'no records found in file'}.` }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Restore failed.' }
  }
}

async function processBackupFile(formData: FormData, apply: boolean): Promise<MergeFileResult> {
  const session = await auth()
  const file = formData.get('backup')
  const fileName = file instanceof File ? file.name : 'Unknown file'
  if (!session || !isSuperAdmin(session.user.role)) {
    return { fileName, error: 'Only a Super Admin can compare or merge backups.' }
  }
  if (!(file instanceof File) || file.size === 0) return { fileName, error: 'This file is empty.' }

  let raw: unknown
  try {
    raw = JSON.parse(await file.text())
  } catch {
    return { fileName, error: 'This file is not valid JSON. Nothing was added from it.' }
  }

  let data: BackupData
  try {
    data = parseBackup(raw)
  } catch (err) {
    return { fileName, error: err instanceof Error ? err.message : 'Unrecognized backup format.' }
  }

  try {
    const results = await mergeBackup(prisma, data, apply, fileName)
    if (apply) {
      revalidatePath('/', 'layout')
      const added = results.course.new + results.student.new + results.attendance.new + results.idPattern.new
      await logActivity({
        action: 'backup_merge',
        username: session.user.username,
        role: session.user.role,
        path: '/settings',
        target: `${fileName}: ${added} records added`,
      })
    }
    return { fileName, results }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await logError({
      source: 'backup',
      message: `Could not process ${fileName}: ${message}`,
      stack: err instanceof Error ? err.stack : null,
      path: '/settings',
      username: session.user.username,
    })
    return { fileName, error: 'This file could not be processed. Nothing was added from it.' }
  }
}

export async function compareBackupAction(formData: FormData): Promise<MergeFileResult> {
  return processBackupFile(formData, false)
}

export async function mergeBackupAction(formData: FormData): Promise<MergeFileResult> {
  return processBackupFile(formData, true)
}

export type ImportFileResult = { fileName: string; result?: ImportResult; error?: string }

const IMPORTERS: Record<
  ImportKind,
  {
    // Turns the uploaded file's text into rows, or throws with a message for the user.
    read: (text: string) => Record<string, unknown>[]
    run: (db: PrismaClient, rows: Record<string, unknown>[], apply: boolean, source: string) => Promise<ImportResult>
    what: string
    action: string
    revalidate: string
  }
> = {
  users: { read: (text) => extractUsers(JSON.parse(text)), run: importUsers, what: 'accounts', action: 'users_import', revalidate: '/users' },
  attendance: {
    read: readAttendanceFile,
    run: importAttendance,
    what: 'time logs',
    action: 'attendance_import',
    revalidate: '/',
  },
}

async function processImportFile(kind: ImportKind, formData: FormData, apply: boolean): Promise<ImportFileResult> {
  const importer = IMPORTERS[kind]
  const session = await auth()
  const file = formData.get('file')
  const fileName = file instanceof File ? file.name : 'Unknown file'
  if (!session || !isSuperAdmin(session.user.role)) {
    return { fileName, error: `Only a Super Admin can import ${importer.what}.` }
  }
  if (!(file instanceof File) || file.size === 0) return { fileName, error: 'This file is empty.' }

  let rows: Record<string, unknown>[]
  try {
    rows = importer.read(decodeText(await file.arrayBuffer()))
  } catch (err) {
    const message = err instanceof SyntaxError ? 'This file is not valid JSON.' : err instanceof Error ? err.message : String(err)
    return { fileName, error: `${message} Nothing was added from it.` }
  }

  try {
    const result = await importer.run(prisma, rows, apply, fileName)
    if (apply) {
      revalidatePath(importer.revalidate, importer.revalidate === '/' ? 'layout' : 'page')
      await logActivity({
        action: importer.action,
        username: session.user.username,
        role: session.user.role,
        path: '/settings',
        target: `${fileName}: ${result.new} ${importer.what} added${result.students?.new ? `, ${result.students.new} students added` : ''}`,
      })
    }
    return { fileName, result }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await logError({
      source: 'backup',
      message: `Could not import ${importer.what} from ${fileName}: ${message}`,
      stack: err instanceof Error ? err.stack : null,
      path: '/settings',
      username: session.user.username,
    })
    return { fileName, error: 'This file could not be processed. Nothing was added from it.' }
  }
}

export async function checkImportAction(kind: ImportKind, formData: FormData): Promise<ImportFileResult> {
  return processImportFile(kind, formData, false)
}

export async function runImportAction(kind: ImportKind, formData: FormData): Promise<ImportFileResult> {
  return processImportFile(kind, formData, true)
}
