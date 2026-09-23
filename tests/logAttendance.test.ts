import { describe, expect, it } from 'vitest'
import { logAttendance, type AttendanceDb, type AttendanceRecord } from '@/lib/attendance/logAttendance'

// Minimal in-memory fake standing in for the Prisma slice logAttendance needs.
function makeFakeDb(opts: {
  patterns?: { regex: string }[]
  student?: { firstName: string; middleName: string | null; lastName: string } | null
}): { db: AttendanceDb; records: AttendanceRecord[] } {
  const records: AttendanceRecord[] = []
  let idCounter = 0

  const db: AttendanceDb = {
    idPattern: {
      findMany: async () => opts.patterns ?? [],
    },
    student: {
      findFirst: async () => (opts.student === undefined ? { firstName: 'Juan', middleName: null, lastName: 'Cruz' } : opts.student),
    },
    attendance: {
      findFirst: async (args: unknown) => {
        const { where } = args as { where: { idNumber: string; createdDate: string } }
        const matches = records.filter((r) => r.idNumber === where.idNumber && r.createdDate === where.createdDate)
        if (matches.length === 0) return null
        return matches.reduce((a, b) => (a.status > b.status ? a : b))
      },
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const record: AttendanceRecord = { id: `rec-${++idCounter}`, ...data } as AttendanceRecord
        records.push(record)
        return record
      },
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const record = records.find((r) => r.id === where.id)!
        Object.assign(record, data)
        return record
      },
    },
  }

  return { db, records }
}

describe('logAttendance', () => {
  it('rejects an ID with no matching student', async () => {
    const { db } = makeFakeDb({ student: null })
    const result = await logAttendance('21-00000-0', db)
    expect(result.success).toBe(false)
    if (!result.success) expect(result.message).toMatch(/no student found/i)
  })

  it('rejects an ID that does not match an active pattern', async () => {
    const { db } = makeFakeDb({ patterns: [{ regex: '^\\d{2}-\\d{5}-\\d$' }] })
    const result = await logAttendance('BADID', db)
    expect(result.success).toBe(false)
    if (!result.success) expect(result.message).toMatch(/does not match/i)
  })

  it('accepts an ID matching an active pattern', async () => {
    const { db } = makeFakeDb({ patterns: [{ regex: '^\\d{2}-\\d{5}-\\d$' }] })
    const result = await logAttendance('21-12345-6', db)
    expect(result.success).toBe(true)
  })

  it('advances AM In -> AM Out -> PM In -> PM Out across 4 scans, then rejects a 5th', async () => {
    const { db } = makeFakeDb({})
    const now = new Date('2026-01-15T08:00:00')

    const r1 = await logAttendance('21-00001-0', db, now)
    expect(r1.success).toBe(true)
    if (r1.success) expect(r1.record.status).toBe(1)

    const r2 = await logAttendance('21-00001-0', db, now)
    expect(r2.success).toBe(true)
    if (r2.success) expect(r2.record.status).toBe(2)

    const r3 = await logAttendance('21-00001-0', db, now)
    if (r3.success) expect(r3.record.status).toBe(3)

    const r4 = await logAttendance('21-00001-0', db, now)
    if (r4.success) expect(r4.record.status).toBe(4)

    const r5 = await logAttendance('21-00001-0', db, now)
    expect(r5.success).toBe(false)
    if (!r5.success) expect(r5.message).toMatch(/already completed/i)
  })

  it('sets timeIn on odd statuses and timeOut on even statuses, reusing the same record for In/Out pairs', async () => {
    const { db, records } = makeFakeDb({})
    const now = new Date('2026-01-15T08:00:00')

    await logAttendance('21-00002-0', db, now)
    await logAttendance('21-00002-0', db, now)

    expect(records).toHaveLength(1)
    expect(records[0].timeIn).toBeTruthy()
    expect(records[0].timeOut).toBeTruthy()
    expect(records[0].status).toBe(2)
  })
})
