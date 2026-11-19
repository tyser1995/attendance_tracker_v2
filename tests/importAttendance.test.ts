import { describe, expect, it } from 'vitest'
import { extractAttendance, planAttendanceImport } from '@/lib/backup/importAttendance'

const amIn = { idNumber: 'A1', name: 'Ann Reyes', timeIn: '08:00:00', timeOut: null, createdDate: '2026-08-28', status: 1 }
const pmOut = { idNumber: 'A1', name: 'Ann Reyes', timeIn: '13:00:00', timeOut: '17:00:00', createdDate: '2026-08-28', status: 4 }

describe('extractAttendance', () => {
  it('reads only the attendance list from a full backup', () => {
    expect(extractAttendance({ user: [{ username: 'x' }], attendance: [amIn] })).toEqual([amIn])
  })

  it('accepts an "attendances" key or a plain array', () => {
    expect(extractAttendance({ attendances: [amIn] })).toHaveLength(1)
    expect(extractAttendance([amIn, pmOut])).toHaveLength(2)
  })

  it('reads attendances from a Flutter backup', () => {
    const rows = extractAttendance({
      students: {},
      courses: {},
      id_patterns: {},
      attendances: { a1: { idnumber: 'A1', name: 'Ann', time_in: '08:00:00', time_out: null, created_date: '2026-08-28', status: 1 } },
    })
    expect(rows[0]).toMatchObject({ idNumber: 'A1', createdDate: '2026-08-28', status: 1 })
  })

  it('refuses files without an attendance list', () => {
    expect(() => extractAttendance({ user: [] })).toThrow()
  })
})

describe('planAttendanceImport', () => {
  it('adds new logs and normalizes HH:MM times', () => {
    const { result, rows } = planAttendanceImport([], [{ ...amIn, timeIn: '08:00' }, pmOut])
    expect(result.new).toBe(2)
    expect(rows[0].timeIn).toBe('08:00:00')
  })

  it('reports the date range of the new logs', () => {
    const { result } = planAttendanceImport([], [
      { ...amIn, createdDate: '2026-03-10' },
      { ...amIn, createdDate: '2026-01-05' },
      { ...amIn, createdDate: '2026-02-01' },
    ])
    expect(result.dateRange).toEqual({ from: '2026-01-05', to: '2026-03-10' })
  })

  it('skips a log whose student, day and session already exist', () => {
    const existing = [{ idNumber: 'A1', createdDate: '2026-08-28', status: 2 }]
    const { result, rows } = planAttendanceImport(existing, [{ ...amIn, timeIn: '08:05:00' }, pmOut])
    expect([result.duplicate, result.new]).toEqual([1, 1])
    expect(rows.map((r) => r.status)).toEqual([4])
  })

  it('keeps only the first log for the same student, day and session in the file', () => {
    const { result } = planAttendanceImport([], [amIn, { ...amIn, status: 2, timeOut: '12:00:00' }])
    expect([result.new, result.duplicateInFile]).toEqual([1, 1])
  })

  it('rejects malformed logs', () => {
    const { result, rows } = planAttendanceImport([], [
      { ...amIn, idNumber: '' },
      { ...amIn, createdDate: '2026-02-30' },
      { ...amIn, status: 5 },
      { ...amIn, timeIn: '25:00:00' },
      { ...pmOut, timeOut: null },
      { ...amIn, timeOut: '12:00:00' },
    ])
    expect(result.invalid).toBe(6)
    expect(rows).toEqual([])
  })

  it('keeps a log whose time out is earlier than its time in, with a note', () => {
    const { result } = planAttendanceImport([], [{ ...pmOut, timeOut: '12:00:00' }])
    expect(result.new).toBe(1)
    expect(result.examples[0]).toContain('earlier than time in')
  })

  it('fills a missing name from the students and notes unknown students', () => {
    const students = new Map([['A1', 'Ann Reyes']])
    const { rows, result } = planAttendanceImport([], [{ ...amIn, name: '' }, { ...amIn, idNumber: 'Z9' }], students)
    expect(rows[0].name).toBe('Ann Reyes')
    expect(result.new).toBe(2)
    expect(result.examples).toContain('Z9 on 2026-08-28: no student with this ID number, imported anyway')
  })
})
