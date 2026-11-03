import type { Prisma, PrismaClient } from '@/app/generated/prisma'
import { convertLegacyBackup, isLegacyBackup } from './legacy'

// Parent-first (student.courseId -> course), reversed for deletion.
export const BACKUP_MODELS = ['course', 'student', 'user', 'idPattern', 'attendance', 'settings'] as const

export type BackupModel = (typeof BACKUP_MODELS)[number]
export type BackupData = Partial<Record<BackupModel, Record<string, unknown>[]>>

type Delegate = {
  findMany: (args?: unknown) => Promise<Record<string, unknown>[]>
  deleteMany: (args?: unknown) => Promise<unknown>
  createMany: (args: { data: Record<string, unknown>[] }) => Promise<unknown>
}

function delegate(client: PrismaClient | Prisma.TransactionClient, model: BackupModel): Delegate {
  return (client as unknown as Record<BackupModel, Delegate>)[model]
}

export async function exportBackup(prisma: PrismaClient): Promise<BackupData> {
  const data: BackupData = {}
  for (const model of BACKUP_MODELS) {
    data[model] = await delegate(prisma, model).findMany()
  }
  return data
}

// Turns a parsed backup file into BackupData, or throws before any data is touched.
// Unrecognised files must be refused: restoring deletes before it inserts, so treating
// one as "no records" would wipe the database and every login along with it.
export function parseBackup(raw: unknown): BackupData {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error('Unrecognized backup format. Nothing was changed.')
  }
  const file = raw as Record<string, unknown>
  if (isLegacyBackup(file)) return convertLegacyBackup(file)

  const models = BACKUP_MODELS.filter((model) => model in file)
  if (models.length === 0 || models.some((model) => !Array.isArray(file[model]))) {
    throw new Error('Unrecognized backup format. Nothing was changed.')
  }
  if (models.includes('user') && (file.user as unknown[]).length === 0) {
    throw new Error('This backup has no user accounts, so restoring it would lock everyone out. Nothing was changed.')
  }
  return file as BackupData
}

// Replaces the tables present in `data` — used by Restore from Backup. Tables the file
// doesn't include (e.g. users, in a Flutter backup) are left as they are.
export async function importBackup(prisma: PrismaClient, data: BackupData): Promise<Partial<Record<BackupModel, number>>> {
  const counts: Partial<Record<BackupModel, number>> = {}

  await prisma.$transaction(
    async (tx) => {
      for (const model of [...BACKUP_MODELS].reverse()) {
        if (data[model]) await delegate(tx, model).deleteMany()
      }
      for (const model of BACKUP_MODELS) {
        const rows = data[model] ?? []
        if (rows.length === 0) continue
        await delegate(tx, model).createMany({ data: rows })
        counts[model] = rows.length
      }
    },
    { timeout: 60_000 }
  )

  return counts
}
