import { describe, expect, it } from 'vitest'
import { importBackup, parseBackup } from '@/lib/backup/backup'
import type { PrismaClient } from '@/app/generated/prisma'

const legacyFile = {
  version: 1,
  exported_at: '2026-08-28T08:00:17.464',
  courses: {
    c1: { course_code: 'BSIT', course_name: 'Info Tech', year_level: '1', created_at: null, updated_at: null },
  },
  students: {
    s1: {
      idnumber: 'ABC123',
      fn: 'Ann',
      ln: 'Reyes',
      mn: null,
      dob: '2004-04-25',
      sex: 'F',
      course_id: 'c1',
      is_deleted: 1,
      created_at: null,
      updated_at: null,
    },
  },
  attendances: {
    a1: {
      id: 'a1',
      idnumber: 'ABC123',
      name: 'Ann Reyes',
      time_in: '08:00:00',
      time_out: null,
      created_date: '2026-08-28',
      status: 1,
      created_at: '2026-08-28T08:00:00.000',
      updated_at: '2026-08-28T08:00:00.000',
    },
  },
  id_patterns: {},
}

// Records table operations in order, so tests can assert what a restore touches.
function fakePrisma() {
  const calls: string[] = []
  const table = (name: string) => ({
    deleteMany: async () => calls.push(`delete ${name}`),
    createMany: async () => calls.push(`create ${name}`),
  })
  const tx = {
    course: table('course'),
    student: table('student'),
    user: table('user'),
    idPattern: table('idPattern'),
    attendance: table('attendance'),
    settings: table('settings'),
  }
  const client = { $transaction: async (fn: (t: typeof tx) => Promise<void>) => fn(tx) }
  return { calls, prisma: client as unknown as PrismaClient }
}

describe('parseBackup', () => {
  it('converts a Flutter backup to the v2 shape', () => {
    const data = parseBackup(legacyFile)

    expect(data.course?.[0]).toEqual({ id: 'c1', courseCode: 'BSIT', courseName: 'Info Tech', yearLevel: '1' })
    expect(data.student?.[0]).toMatchObject({ id: 's1', idNumber: 'ABC123', firstName: 'Ann', isDeleted: true, courseId: 'c1' })
    expect(data.student?.[0]).not.toHaveProperty('createdAt')
    expect(data.attendance?.[0]).toMatchObject({ id: 'a1', timeIn: '08:00:00', createdDate: '2026-08-28', status: 1 })
    expect(data.attendance?.[0].createdAt).toBeInstanceOf(Date)
    expect(data.idPattern).toEqual([])
  })

  it('leaves users and settings out of a converted Flutter backup', () => {
    const data = parseBackup(legacyFile)

    expect(data).not.toHaveProperty('user')
    expect(data).not.toHaveProperty('settings')
  })

  it('passes a v2 export through unchanged', () => {
    const file = { course: [], student: [], user: [{ id: 'u1' }], idPattern: [], attendance: [], settings: [] }

    expect(parseBackup(file)).toBe(file)
  })

  it.each([
    ['an empty object', {}],
    ['unrelated JSON', { foo: 'bar' }],
    ['a top-level array', []],
    ['a non-object', 'nope'],
    ['null', null],
    ['a v2 table that is not an array', { student: {} }],
    ['a partial Flutter backup', { students: {}, courses: {} }],
  ])('refuses %s', (_label, file) => {
    expect(() => parseBackup(file)).toThrow('Unrecognized backup format')
  })

  it('refuses a v2 backup with an empty user table', () => {
    expect(() => parseBackup({ student: [], user: [] })).toThrow('lock everyone out')
  })
})

describe('importBackup', () => {
  it('leaves tables missing from the backup untouched', async () => {
    const { calls, prisma } = fakePrisma()

    await importBackup(prisma, parseBackup(legacyFile))

    expect(calls).not.toContain('delete user')
    expect(calls).not.toContain('delete settings')
    expect(calls).toContain('delete idPattern')
    expect(calls).toContain('create student')
  })

  it('deletes students before courses and creates courses before students', async () => {
    const { calls, prisma } = fakePrisma()

    await importBackup(prisma, parseBackup(legacyFile))

    expect(calls.indexOf('delete student')).toBeLessThan(calls.indexOf('delete course'))
    expect(calls.indexOf('create course')).toBeLessThan(calls.indexOf('create student'))
  })
})
