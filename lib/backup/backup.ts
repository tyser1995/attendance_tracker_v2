import type { Prisma, PrismaClient } from '@/app/generated/prisma'

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

// Replaces all current data with `data` — used by Restore from Backup.
export async function importBackup(prisma: PrismaClient, data: BackupData): Promise<Partial<Record<BackupModel, number>>> {
  const counts: Partial<Record<BackupModel, number>> = {}

  await prisma.$transaction(
    async (tx) => {
      for (const model of [...BACKUP_MODELS].reverse()) {
        await delegate(tx, model).deleteMany()
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
