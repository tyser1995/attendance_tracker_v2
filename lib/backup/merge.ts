import { randomUUID } from 'node:crypto'
import type { PrismaClient } from '@/app/generated/prisma'
import type { BackupData } from './backup'

export type MergeTable = 'course' | 'student' | 'attendance' | 'idPattern' | 'user'

export type MergeTableResult = {
  total: number
  new: number // In the file but not the database; added when merging.
  existing: number // Already in the database and identical.
  different: number // Already in the database with other values; never overwritten.
  invalid: number // Missing required values; never added.
  notAdded: number // New, but deliberately not merged (user accounts).
  examples: string[] // A few of the differences, for the report.
}

export type MergeResults = Record<MergeTable, MergeTableResult>

type Row = Record<string, unknown>

// The current database, reduced to what identifying and comparing records needs.
export type ExistingData = {
  course: { id: string; courseCode: string; courseName: string; yearLevel: string }[]
  student: {
    id: string
    idNumber: string
    firstName: string
    lastName: string
    middleName: string | null
    dob: string | null
    sex: string | null
    isDeleted: boolean
    courseId: string | null
  }[]
  attendance: {
    id: string
    idNumber: string
    name: string
    timeIn: string | null
    timeOut: string | null
    createdDate: string
    status: number
  }[]
  idPattern: { id: string; pattern: string; regex: string }[]
  user: { username: string }[]
}

export type MergePlan = {
  results: MergeResults
  rows: { course: Row[]; student: Row[]; attendance: Row[]; idPattern: Row[] }
}

const MAX_EXAMPLES = 10

function emptyResult(): MergeTableResult {
  return { total: 0, new: 0, existing: 0, different: 0, invalid: 0, notAdded: 0, examples: [] }
}

function requiredText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null
}

function optionalText(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null
}

// Only well-formed dates are kept; otherwise the schema's default applies.
function timestamps(row: Row) {
  const toDate = (value: unknown) => {
    if (typeof value !== 'string' && !(value instanceof Date)) return undefined
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? undefined : date
  }
  const createdAt = toDate(row.createdAt)
  const updatedAt = toDate(row.updatedAt)
  return { ...(createdAt ? { createdAt } : {}), ...(updatedAt ? { updatedAt } : {}) }
}

function recordMatch(result: MergeTableResult, label: string, differences: string[]) {
  if (differences.length === 0) {
    result.existing += 1
    return
  }
  result.different += 1
  if (result.examples.length < MAX_EXAMPLES) result.examples.push(`${label}: ${differences.join(', ')}`)
}

function changedFields(fields: Record<string, [unknown, unknown]>): string[] {
  return Object.entries(fields)
    .filter(([, [current, incoming]]) => current !== incoming)
    .map(([name]) => name)
}

// A backup's ID is kept unless another record already uses it.
function availableId(value: unknown, taken: Set<string>): string {
  const id = typeof value === 'string' && value && !taken.has(value) ? value : randomUUID()
  taken.add(id)
  return id
}

function isValidRegex(pattern: string): boolean {
  try {
    new RegExp(pattern)
    return true
  } catch {
    return false
  }
}

// Works out what a merge would do without touching the database. Records are matched by
// what identifies them in practice (course code, student ID number, username), so the
// same record is recognized even when its database ID differs between backups.
export function planMerge(existing: ExistingData, data: BackupData): MergePlan {
  const results: MergeResults = {
    course: emptyResult(),
    student: emptyResult(),
    attendance: emptyResult(),
    idPattern: emptyResult(),
    user: emptyResult(),
  }
  const rows: MergePlan['rows'] = { course: [], student: [], attendance: [], idPattern: [] }

  // Courses, first: students need to know each course's final ID.
  const courseIds = new Set(existing.course.map((c) => c.id))
  const courseByCode = new Map(existing.course.map((c) => [c.courseCode, c]))
  const courseIdMap = new Map<string, string>()
  for (const row of data.course ?? []) {
    const result = results.course
    result.total += 1
    const courseCode = requiredText(row.courseCode)
    const courseName = requiredText(row.courseName)
    if (!courseCode || !courseName) {
      result.invalid += 1
      continue
    }
    const yearLevel = typeof row.yearLevel === 'string' ? row.yearLevel : ''
    const match = courseByCode.get(courseCode)
    if (match) {
      if (typeof row.id === 'string') courseIdMap.set(row.id, match.id)
      recordMatch(
        result,
        courseCode,
        changedFields({ courseName: [match.courseName, courseName], yearLevel: [match.yearLevel, yearLevel] })
      )
      continue
    }
    const id = availableId(row.id, courseIds)
    if (typeof row.id === 'string') courseIdMap.set(row.id, id)
    courseByCode.set(courseCode, { id, courseCode, courseName, yearLevel })
    rows.course.push({ id, courseCode, courseName, yearLevel, ...timestamps(row) })
    result.new += 1
  }

  const knownCourseIds = new Set(existing.course.map((c) => c.id))
  const resolveCourseId = (value: unknown): string | null => {
    if (typeof value !== 'string') return null
    return courseIdMap.get(value) ?? (knownCourseIds.has(value) ? value : null)
  }

  // Students, by ID number.
  const studentIds = new Set(existing.student.map((s) => s.id))
  const studentByIdNumber = new Map<string, ExistingData['student'][number]>()
  for (const student of existing.student) {
    // An active student wins if the database has a soft-deleted one with the same ID number.
    const current = studentByIdNumber.get(student.idNumber)
    if (!current || current.isDeleted) studentByIdNumber.set(student.idNumber, student)
  }
  for (const row of data.student ?? []) {
    const result = results.student
    result.total += 1
    const idNumber = requiredText(row.idNumber)
    const firstName = requiredText(row.firstName)
    const lastName = requiredText(row.lastName)
    if (!idNumber || !firstName || !lastName) {
      result.invalid += 1
      continue
    }
    const incoming = {
      idNumber,
      firstName,
      lastName,
      middleName: optionalText(row.middleName),
      dob: optionalText(row.dob),
      sex: optionalText(row.sex),
      isDeleted: Boolean(row.isDeleted),
      courseId: resolveCourseId(row.courseId),
    }
    const match = studentByIdNumber.get(idNumber)
    if (match) {
      recordMatch(
        result,
        idNumber,
        changedFields({
          firstName: [match.firstName, incoming.firstName],
          lastName: [match.lastName, incoming.lastName],
          middleName: [match.middleName, incoming.middleName],
          dob: [match.dob, incoming.dob],
          sex: [match.sex, incoming.sex],
          isDeleted: [match.isDeleted, incoming.isDeleted],
          course: [match.courseId, incoming.courseId],
        })
      )
      continue
    }
    const id = availableId(row.id, studentIds)
    studentByIdNumber.set(idNumber, { id, ...incoming })
    rows.student.push({ id, ...incoming, ...timestamps(row) })
    result.new += 1
  }

  // Attendance, by record ID, or else by who scanned and when: the same scan can have a
  // different ID in backups from different systems.
  const attendanceKey = (idNumber: string, createdDate: string, timeIn: string | null) =>
    `${idNumber}|${createdDate}|${timeIn ?? ''}`
  const attendanceIds = new Set(existing.attendance.map((a) => a.id))
  const attendanceById = new Map(existing.attendance.map((a) => [a.id, a]))
  const attendanceByKey = new Map(existing.attendance.map((a) => [attendanceKey(a.idNumber, a.createdDate, a.timeIn), a]))
  for (const row of data.attendance ?? []) {
    const result = results.attendance
    result.total += 1
    const idNumber = requiredText(row.idNumber)
    const createdDate = requiredText(row.createdDate)
    const status = row.status
    if (!idNumber || !createdDate || typeof status !== 'number' || !Number.isInteger(status) || status < 1 || status > 4) {
      result.invalid += 1
      continue
    }
    const incoming = {
      idNumber,
      name: typeof row.name === 'string' ? row.name : '',
      timeIn: optionalText(row.timeIn),
      timeOut: optionalText(row.timeOut),
      createdDate,
      status,
    }
    const key = attendanceKey(idNumber, createdDate, incoming.timeIn)
    const match = (typeof row.id === 'string' ? attendanceById.get(row.id) : undefined) ?? attendanceByKey.get(key)
    if (match) {
      recordMatch(
        result,
        `${idNumber} on ${createdDate}`,
        changedFields({
          status: [match.status, incoming.status],
          timeIn: [match.timeIn, incoming.timeIn],
          timeOut: [match.timeOut, incoming.timeOut],
        })
      )
      continue
    }
    const id = availableId(row.id, attendanceIds)
    const added = { id, ...incoming }
    attendanceById.set(id, added)
    attendanceByKey.set(key, added)
    rows.attendance.push({ ...added, ...timestamps(row) })
    result.new += 1
  }

  // ID patterns, by mask. Added as inactive: an active pattern from an old backup could
  // start rejecting every current student's scan.
  const patternIds = new Set(existing.idPattern.map((p) => p.id))
  const patternByMask = new Map(existing.idPattern.map((p) => [p.pattern, p]))
  for (const row of data.idPattern ?? []) {
    const result = results.idPattern
    result.total += 1
    const pattern = requiredText(row.pattern)
    const regex = requiredText(row.regex)
    if (!pattern || !regex || !isValidRegex(regex)) {
      result.invalid += 1
      continue
    }
    const match = patternByMask.get(pattern)
    if (match) {
      recordMatch(result, pattern, changedFields({ regex: [match.regex, regex] }))
      continue
    }
    const id = availableId(row.id, patternIds)
    patternByMask.set(pattern, { id, pattern, regex })
    rows.idPattern.push({ id, pattern, regex, status: 'inactive', ...timestamps(row) })
    result.new += 1
  }

  // User accounts are compared but never merged: an old backup could otherwise bring back
  // a deleted account, with its old password.
  const usernames = new Set(existing.user.map((u) => u.username))
  for (const row of data.user ?? []) {
    const result = results.user
    result.total += 1
    const username = requiredText(row.username)
    if (!username) result.invalid += 1
    else if (usernames.has(username)) result.existing += 1
    else {
      result.notAdded += 1
      usernames.add(username)
      if (result.examples.length < MAX_EXAMPLES) result.examples.push(`${username}: account not added`)
    }
  }

  return { results, rows }
}

// Compares a backup with the database and, when `apply` is true, adds the new records.
// Added time logs are marked as imported from `source` (the file name). Nothing existing
// is ever updated or deleted, and a failure adds nothing from the file.
export async function mergeBackup(prisma: PrismaClient, data: BackupData, apply: boolean, source: string): Promise<MergeResults> {
  const [course, student, attendance, idPattern, user] = await Promise.all([
    prisma.course.findMany({ select: { id: true, courseCode: true, courseName: true, yearLevel: true } }),
    prisma.student.findMany({
      select: { id: true, idNumber: true, firstName: true, lastName: true, middleName: true, dob: true, sex: true, isDeleted: true, courseId: true },
    }),
    prisma.attendance.findMany({
      select: { id: true, idNumber: true, name: true, timeIn: true, timeOut: true, createdDate: true, status: true },
    }),
    prisma.idPattern.findMany({ select: { id: true, pattern: true, regex: true } }),
    prisma.user.findMany({ select: { username: true } }),
  ])

  const { results, rows } = planMerge({ course, student, attendance, idPattern, user }, data)

  if (apply) {
    await prisma.$transaction(
      async (tx) => {
        // Courses first, because students refer to them.
        if (rows.course.length) await tx.course.createMany({ data: rows.course as never })
        if (rows.student.length) await tx.student.createMany({ data: rows.student as never })
        if (rows.idPattern.length) await tx.idPattern.createMany({ data: rows.idPattern as never })
        if (rows.attendance.length) {
          const importedAt = new Date()
          const marked = rows.attendance.map((row) => ({ ...row, importedAt, importSource: source }))
          await tx.attendance.createMany({ data: marked as never })
        }
      },
      { timeout: 60_000 }
    )
  }

  return results
}
