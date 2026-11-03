import { describe, expect, it } from 'vitest'
import { planMerge, type ExistingData } from '@/lib/backup/merge'

const empty: ExistingData = { course: [], student: [], attendance: [], idPattern: [], user: [] }

const course = { id: 'c1', courseCode: 'BSIT', courseName: 'Info Tech', yearLevel: '1' }
const student = {
  id: 's1',
  idNumber: 'A1',
  firstName: 'Ann',
  lastName: 'Reyes',
  middleName: null,
  dob: null,
  sex: 'F',
  isDeleted: false,
  courseId: 'c1',
}
const attendance = { id: 'a1', idNumber: 'A1', name: 'Ann Reyes', timeIn: '08:00:00', timeOut: null, createdDate: '2026-08-28', status: 1 }

describe('planMerge', () => {
  it('adds records that are missing', () => {
    const { results, rows } = planMerge(empty, { course: [course], student: [student], attendance: [attendance] })

    expect([results.course.new, results.student.new, results.attendance.new]).toEqual([1, 1, 1])
    expect(rows.student[0]).toMatchObject({ id: 's1', idNumber: 'A1', courseId: 'c1' })
  })

  it('adds nothing when merging identical data again', () => {
    const existing = { ...empty, course: [course], student: [student], attendance: [attendance] }
    const { results, rows } = planMerge(existing, { course: [course], student: [student], attendance: [attendance] })

    expect([rows.course, rows.student, rows.attendance]).toEqual([[], [], []])
    expect([results.course.existing, results.student.existing, results.attendance.existing]).toEqual([1, 1, 1])
  })

  it('reports a different student without adding or changing anything', () => {
    const existing = { ...empty, course: [course], student: [student] }
    const { results, rows } = planMerge(existing, { student: [{ ...student, firstName: 'Anna', courseId: 'c1' }] })

    expect(results.student.different).toBe(1)
    expect(results.student.examples).toEqual(['A1: firstName'])
    expect(rows.student).toEqual([])
  })

  it('recognizes a student by ID number when the database ID differs', () => {
    const existing = { ...empty, course: [course], student: [student] }
    const { results, rows } = planMerge(existing, { student: [{ ...student, id: 'other' }] })

    expect(results.student.existing).toBe(1)
    expect(rows.student).toEqual([])
  })

  it('points new students at the existing course with the same code', () => {
    const existing = { ...empty, course: [course] }
    const { rows } = planMerge(existing, {
      course: [{ ...course, id: 'backup-course' }],
      student: [{ ...student, id: 's2', idNumber: 'B2', courseId: 'backup-course' }],
    })

    expect(rows.course).toEqual([])
    expect(rows.student[0].courseId).toBe('c1')
  })

  it('clears a course reference that exists in neither the file nor the database', () => {
    const { rows } = planMerge(empty, { student: [{ ...student, courseId: 'missing' }] })

    expect(rows.student[0].courseId).toBeNull()
  })

  it('gives a new record a fresh ID when another record already uses its ID', () => {
    const existing = { ...empty, student: [student] }
    const { rows } = planMerge(existing, { student: [{ ...student, idNumber: 'B2', courseId: null }] })

    expect(rows.student[0].idNumber).toBe('B2')
    expect(rows.student[0].id).not.toBe('s1')
  })

  it('counts duplicates inside one file only once', () => {
    const { results, rows } = planMerge(empty, { student: [{ ...student, courseId: null }, { ...student, id: 's2', courseId: null }] })

    expect(rows.student).toHaveLength(1)
    expect(results.student.new).toBe(1)
    expect(results.student.existing).toBe(1)
  })

  it('matches attendance by ID even when its status has moved on', () => {
    const existing = { ...empty, attendance: [attendance] }
    const { results, rows } = planMerge(existing, { attendance: [{ ...attendance, status: 2, timeOut: '12:00:00' }] })

    expect(results.attendance.different).toBe(1)
    expect(results.attendance.examples[0]).toBe('A1 on 2026-08-28: status, timeOut')
    expect(rows.attendance).toEqual([])
  })

  it('matches attendance by person, date, and time when the ID differs', () => {
    const existing = { ...empty, attendance: [attendance] }
    const { results, rows } = planMerge(existing, { attendance: [{ ...attendance, id: 'other' }] })

    expect(results.attendance.existing).toBe(1)
    expect(rows.attendance).toEqual([])
  })

  it('adds a separate attendance record for another time', () => {
    const existing = { ...empty, attendance: [attendance] }
    const { rows } = planMerge(existing, { attendance: [{ ...attendance, id: 'a2', timeIn: '13:00:00', status: 3 }] })

    expect(rows.attendance).toHaveLength(1)
  })

  it.each([
    ['a student with no ID number', { student: [{ ...student, idNumber: '' }] }, 'student'],
    ['a student with no name', { student: [{ ...student, firstName: null }] }, 'student'],
    ['a course with no code', { course: [{ ...course, courseCode: undefined }] }, 'course'],
    ['attendance with no date', { attendance: [{ ...attendance, createdDate: undefined }] }, 'attendance'],
    ['attendance with an impossible status', { attendance: [{ ...attendance, status: 9 }] }, 'attendance'],
    ['a pattern with a broken regex', { idPattern: [{ pattern: 'x', regex: '(' }] }, 'idPattern'],
  ] as const)('rejects %s as invalid', (_label, data, table) => {
    const { results, rows } = planMerge(empty, data as never)

    expect(results[table].invalid).toBe(1)
    expect(Object.values(rows).flat()).toEqual([])
  })

  it('adds new ID patterns as inactive even if the backup says active', () => {
    const { rows } = planMerge(empty, { idPattern: [{ pattern: '##', regex: '^\\d\\d$', status: 'active' }] })

    expect(rows.idPattern[0].status).toBe('inactive')
  })

  it('never adds user accounts, only reports them', () => {
    const existing = { ...empty, user: [{ username: 'admin' }] }
    const { results, rows } = planMerge(existing, {
      user: [
        { username: 'admin', passwordHash: 'x', role: 'ADMIN' },
        { username: 'old-account', passwordHash: 'y', role: 'SUPER_ADMIN' },
      ],
    })

    expect(results.user.existing).toBe(1)
    expect(results.user.notAdded).toBe(1)
    expect(rows).not.toHaveProperty('user')
  })

  it('drops unknown columns from a backup', () => {
    const { rows } = planMerge(empty, { student: [{ ...student, courseId: null, hacked: true }] })

    expect(rows.student[0]).not.toHaveProperty('hacked')
  })

  it('ignores settings entirely', () => {
    const { rows } = planMerge(empty, { settings: [{ id: 1, appName: 'Other' }] })

    expect(Object.values(rows).flat()).toEqual([])
  })
})
