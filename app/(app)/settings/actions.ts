'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma/client'
import { invalidateSettingsCache } from '@/lib/settings/getSettings'
import { exportBackup, importBackup, type BackupData } from '@/lib/backup/backup'

export type FormState = { message?: string; error?: string } | null

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

export async function exportBackupData(): Promise<BackupData> {
  return exportBackup(prisma)
}

export async function importBackupAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const file = formData.get('backup')
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'Choose a backup .json file first.' }
  }

  let data: BackupData
  try {
    data = JSON.parse(await file.text())
  } catch {
    return { error: 'That file is not valid JSON.' }
  }

  try {
    const counts = await importBackup(prisma, data)
    invalidateSettingsCache()
    revalidatePath('/', 'layout')
    const summary = Object.entries(counts)
      .map(([model, count]) => `${count} ${model}`)
      .join(', ')
    return { message: `Restore complete: ${summary || 'no records found in file'}.` }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Restore failed.' }
  }
}
