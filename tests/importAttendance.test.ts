import { describe, expect, it } from 'vitest'
import { extractAttendance, planAttendanceImport, planNewStudents } from '@/lib/backup/importAttendance'

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

  it('fills a missing name from the students and still imports unknown students', () => {
    const students = new Map([['A1', 'Ann Reyes']])
    const { rows, result } = planAttendanceImport([], [{ ...amIn, name: '' }, { ...amIn, idNumber: 'Z9' }], students)
    expect(rows[0].name).toBe('Ann Reyes')
    expect(result.new).toBe(2)
  })
})

describe('planNewStudents', () => {
  const existing = [{ idNumber: 'RMS02022007', firstName: 'Ralph Laureen', middleName: 'M.', lastName: 'Dayo' }]
  const courses = [{ id: 'c1', courseCode: 'BSIT' }]
  let n = 0
  const newId = () => `new-${++n}`

  it('adds people whose ID is not a student, with their name split and course linked', () => {
    const people = new Map([['DSC01212008', { name: 'Derence S. Contreras', course: 'BSIT', year: '1' }]])
    const { summary, students, courses: added } = planNewStudents(existing, courses, people, newId)
    expect(summary.new).toBe(1)
    expect(students).toEqual([{ idNumber: 'DSC01212008', firstName: 'Derence', middleName: 'S.', lastName: 'Contreras', courseId: 'c1' }])
    expect(added).toEqual([])
  })

  it('skips IDs that are already students, and people with no name', () => {
    const people = new Map([
      ['RMS02022007', { name: 'Ralph Laureen M. Dayo', course: null, year: null }],
      ['X1', { name: null, course: null, year: null }],
    ])
    const { summary, students } = planNewStudents(existing, courses, people, newId)
    expect([summary.new, summary.skipped, students.length]).toEqual([0, 1, 0])
  })

  it('does not add the same person again under a different ID', () => {
    const people = new Map([
      ['RMD02022007', { name: 'Ralph Laureen M. Dayo', course: null, year: null }],
      ['A1', { name: 'Ann B. Reyes', course: null, year: null }],
      ['A2', { name: 'ANN B REYES', course: null, year: null }],
    ])
    const { summary, students } = planNewStudents(existing, courses, people, newId)
    expect(students.map((s) => s.idNumber)).toEqual(['A1'])
    expect(summary.skipped).toBe(2)
    expect(summary.examples[0]).toContain('same name as student RMS02022007')
  })

  it('adds a missing course once and links every student in it', () => {
    const people = new Map([
      ['A1', { name: 'Ann B. Reyes', course: 'BSED', year: '2' }],
      ['B1', { name: 'Ben C. Cruz', course: 'bsed', year: '2' }],
    ])
    const { students, courses: added } = planNewStudents([], courses, people, () => 'course-x')
    expect(added).toEqual([{ id: 'course-x', courseCode: 'BSED', courseName: 'BSED', yearLevel: '2' }])
    expect(students.map((s) => s.courseId)).toEqual(['course-x', 'course-x'])
  })
})

describe('planAttendanceImport people', () => {
  it('collects each valid ID once, including ones whose log already exists', () => {
    const existing = [{ idNumber: 'A1', createdDate: '2026-08-28', status: 1 }]
    const { people } = planAttendanceImport(existing, [amIn, { ...amIn, idNumber: 'B2', name: 'Ben' }, { ...amIn, idNumber: '' }])
    expect([...people.keys()]).toEqual(['A1', 'B2'])
  })
})
