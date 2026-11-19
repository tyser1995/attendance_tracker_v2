import { randomUUID } from 'node:crypto'
import type { PrismaClient } from '@/app/generated/prisma'
import { nameKey, parseFullName } from '@/lib/students/parseName'
import {
  addExample,
  emptyImportResult,
  extractList,
  optionalText,
  toDate,
  type ImportResult,
  type StudentImportSummary,
} from './importCommon'
import { convertLegacyBackup, isLegacyBackup } from './legacy'
import { parseCsv } from './csv'

// Imports only attendance time logs from a JSON file, skipping any log that would
// duplicate one already in the database or earlier in the same file. Accepts:
//   - a full backup from this app: { attendance: [...], ... } (other tables are ignored)
//   - a backup from the Flutter app (only its attendances are read)
//   - { attendances: [...] }
//   - a plain array of logs: [...]
//   - a CSV exported from Reports (this app or the Flutter app)
//
// The scanner keeps at most one AM record (status 1 = time in, 2 = time out) and one PM
// record (3 = time in, 4 = time out) per student per day, so a log is a duplicate when
// the same student already has a record for that day and session.

export type AttendanceImportResult = ImportResult

export type ExistingAttendance = { idNumber: string; createdDate: string; status: number }

type IncomingAttendance = {
  idNumber: string
  name: string
  timeIn: string
  timeOut: string | null
  createdDate: string
  status: number
  createdAt?: Date
  updatedAt?: Date
}

// Who a log belongs to, as the file describes them; used to add missing students.
export type Person = { name: string | null; course: string | null; year: string | null }

export type AttendanceImportPlan = { result: AttendanceImportResult; rows: IncomingAttendance[]; people: Map<string, Person> }

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/
const TIME = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/

export function extractAttendance(raw: unknown): Record<string, unknown>[] {
  if (typeof raw === 'object' && raw !== null && !Array.isArray(raw) && isLegacyBackup(raw as Record<string, unknown>)) {
    return (convertLegacyBackup(raw as Record<string, unknown>).attendance ?? []) as Record<string, unknown>[]
  }
  return extractList(raw, ['attendance', 'attendances'], 'attendance logs')
}

// CSV columns, matched by header name ignoring case and spaces. Covers this app's Reports
// export (Date, Student ID, Name, Course, Year, Status, Time In, Time Out) and the Flutter
// app's (Date, Student ID, Student Name, Status, Time In, Time Out). Other columns are ignored.
const CSV_COLUMNS = {
  createdDate: ['date', 'createddate'],
  idNumber: ['studentid', 'idnumber', 'id'],
  name: ['name', 'studentname'],
  status: ['status'],
  timeIn: ['timein'],
  timeOut: ['timeout'],
  course: ['course', 'coursecode'],
  year: ['year', 'yearlevel'],
} as const
const REQUIRED_CSV_COLUMNS = { createdDate: 'Date', idNumber: 'Student ID', status: 'Status', timeIn: 'Time In' } as const

const STATUS_LABELS: Record<string, number> = { 'am time in': 1, 'am time out': 2, 'pm time in': 3, 'pm time out': 4 }

// "AM Time Out" or "2" -> 2. Anything else is passed through so validation reports it.
function csvStatus(value: string): unknown {
  const text = value.trim().toLowerCase().replace(/\s+/g, ' ')
  if (text in STATUS_LABELS) return STATUS_LABELS[text]
  return /^[1-4]$/.test(text) ? Number(text) : value
}

// Spreadsheet apps often rewrite dates as 10/29/2026 (month first) when a CSV is saved
// again; those become 2026-10-29. Anything else is passed through for validation.
function csvDate(value: string): string {
  const text = value.trim()
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text)
  if (!match) return text
  const [, month, day, year] = match
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

// 8:05, 8:05:09, and 2:15:18 PM become HH:MM:SS. Anything else is passed through.
function csvTime(value: string): string {
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AaPp][Mm])?$/.exec(value.trim())
  if (!match) return value.trim()
  const [, h, m, s = '00', meridiem] = match
  let hour = Number(h)
  if (meridiem) {
    if (hour < 1 || hour > 12) return value.trim()
    hour = (hour % 12) + (meridiem.toLowerCase() === 'pm' ? 12 : 0)
  }
  return `${String(hour).padStart(2, '0')}:${m}:${s}`
}

// Turns an exported attendance CSV into rows for planAttendanceImport, or throws if the
// header is missing a required column.
export function extractAttendanceCsv(text: string): Record<string, unknown>[] {
  const [header, ...lines] = parseCsv(text)
  if (!header) throw new Error('This CSV file is empty.')

  const normalized = header.map((cell) => cell.trim().toLowerCase().replace(/[\s_]+/g, ''))
  const index = Object.fromEntries(
    Object.entries(CSV_COLUMNS).map(([field, names]) => [field, normalized.findIndex((cell) => (names as readonly string[]).includes(cell))])
  ) as Record<keyof typeof CSV_COLUMNS, number>

  const missing = Object.entries(REQUIRED_CSV_COLUMNS)
    .filter(([field]) => index[field as keyof typeof CSV_COLUMNS] < 0)
    .map(([, label]) => label)
  if (missing.length) {
    throw new Error(`This CSV file is missing the ${missing.join(', ')} column${missing.length > 1 ? 's' : ''}.`)
  }

  const cell = (line: string[], field: keyof typeof CSV_COLUMNS) => (index[field] >= 0 ? (line[index[field]] ?? '') : '')
  return lines.map((line) => ({
    idNumber: cell(line, 'idNumber').trim(),
    name: cell(line, 'name').trim(),
    createdDate: csvDate(cell(line, 'createdDate')),
    status: csvStatus(cell(line, 'status')),
    timeIn: csvTime(cell(line, 'timeIn')),
    timeOut: cell(line, 'timeOut').trim() ? csvTime(cell(line, 'timeOut')) : null,
    course: cell(line, 'course').trim(),
    year: cell(line, 'year').trim(),
  }))
}

// Reads an uploaded time log file: JSON (a backup or a list of logs) or an exported CSV.
export function readAttendanceFile(text: string): Record<string, unknown>[] {
  const start = text.replace(/^﻿/, '').trimStart()[0]
  return start === '{' || start === '[' ? extractAttendance(JSON.parse(text)) : extractAttendanceCsv(text)
}

function isRealDate(value: string): boolean {
  const match = DATE.exec(value)
  if (!match) return false
  const [y, m, d] = match.slice(1).map(Number)
  const date = new Date(y, m - 1, d)
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d
}

// "08:05" and "08:05:00" are the same time.
const normalizeTime = (time: string) => (time.length === 5 ? `${time}:00` : time)

const session = (status: number) => (status <= 2 ? 'AM' : 'PM')
const logKey = (idNumber: string, createdDate: string, status: number) => `${idNumber}|${createdDate}|${session(status)}`

// Works out what an import would do without touching the database. `students` maps ID
// numbers to names, used to fill in a missing name and to flag unknown students.
export function planAttendanceImport(
  existing: ExistingAttendance[],
  rows: Record<string, unknown>[],
  students: Map<string, string> = new Map()
): AttendanceImportPlan {
  const result = emptyImportResult()
  const plan: IncomingAttendance[] = []
  const note = (text: string) => addExample(result, text)

  const inDatabase = new Set(existing.map((a) => logKey(a.idNumber, a.createdDate, a.status)))
  const inFile = new Set<string>()
  const people = new Map<string, Person>()

  rows.forEach((row, index) => {
    result.total += 1
    const idNumber = optionalText(row.idNumber)
    const createdDate = optionalText(row.createdDate)
    const label = idNumber && createdDate ? `${idNumber} on ${createdDate}` : `Row ${index + 1}`
    const invalid = (reason: string) => {
      result.invalid += 1
      note(`${label}: ${reason}`)
    }

    if (!idNumber) return invalid('missing student ID number')
    if (!createdDate || !isRealDate(createdDate)) return invalid('missing or invalid date (use YYYY-MM-DD)')

    const status = row.status
    if (typeof status !== 'number' || !Number.isInteger(status) || status < 1 || status > 4) {
      return invalid('status must be 1 to 4')
    }

    const timeInText = optionalText(row.timeIn)
    if (!timeInText || !TIME.test(timeInText)) return invalid('missing or invalid time in (use HH:MM:SS)')
    const timeIn = normalizeTime(timeInText)

    const timeOutText = optionalText(row.timeOut)
    if (timeOutText && !TIME.test(timeOutText)) return invalid('invalid time out (use HH:MM:SS)')
    const timeOut = timeOutText ? normalizeTime(timeOutText) : null
    const isTimeOut = status === 2 || status === 4
    if (isTimeOut && !timeOut) return invalid('status is a time out but there is no time out')
    if (!isTimeOut && timeOut) return invalid('has a time out but status is a time in')

    // Everyone with a valid log, even one that already exists, is a candidate student.
    if (!people.has(idNumber)) {
      people.set(idNumber, { name: optionalText(row.name), course: optionalText(row.course), year: optionalText(row.year) })
    }

    const key = logKey(idNumber, createdDate, status)
    if (inDatabase.has(key)) {
      result.duplicate += 1
      note(`${label}: ${session(status)} log already exists`)
      return
    }
    if (inFile.has(key)) {
      result.duplicateInFile += 1
      note(`${label}: ${session(status)} log listed more than once in the file`)
      return
    }
    inFile.add(key)

    const knownName = students.get(idNumber)
    // Real logs from devices with a wrong clock can have this, so they're kept as recorded.
    if (timeOut && timeOut < timeIn) note(`${label}: time out ${timeOut} is earlier than time in ${timeIn}, imported as recorded`)

    const createdAt = toDate(row.createdAt)
    const updatedAt = toDate(row.updatedAt)
    plan.push({
      idNumber,
      name: optionalText(row.name) ?? knownName ?? '',
      timeIn,
      timeOut,
      createdDate,
      status,
      ...(createdAt ? { createdAt } : {}),
      ...(updatedAt ? { updatedAt } : {}),
    })
    result.new += 1
    const range = result.dateRange
    if (!range) result.dateRange = { from: createdDate, to: createdDate }
    else if (createdDate < range.from) range.from = createdDate
    else if (createdDate > range.to) range.to = createdDate
  })

  return { result, rows: plan, people }
}

export type ExistingStudent = { idNumber: string; firstName: string; middleName: string | null; lastName: string }
export type ExistingCourse = { id: string; courseCode: string }

type NewStudent = { idNumber: string; firstName: string; middleName: string | null; lastName: string; courseId: string | null }
type NewCourse = { id: string; courseCode: string; courseName: string; yearLevel: string }

export type StudentPlan = { summary: StudentImportSummary; students: NewStudent[]; courses: NewCourse[] }

// Works out which people in the file to add as students: those whose ID number isn't in
// the student list (deleted students included), split into first, middle and last name.
// Someone is skipped when another student already has the same name under a different
// ID, which usually means the ID was mistyped, or when the file has no name for them.
// A course from the file's Course column is linked by code, and added if it's missing.
export function planNewStudents(
  existing: ExistingStudent[],
  courses: ExistingCourse[],
  people: Map<string, Person>,
  newId: () => string = randomUUID
): StudentPlan {
  const summary: StudentImportSummary = { new: 0, skipped: 0, examples: [] }
  const note = (text: string) => {
    if (summary.examples.length < 10) summary.examples.push(text)
  }
  const students: NewStudent[] = []
  const newCourses: NewCourse[] = []

  const knownIds = new Set(existing.map((s) => s.idNumber))
  const idByName = new Map(existing.map((s) => [nameKey(s), s.idNumber]))
  const courseIdByCode = new Map(courses.map((c) => [c.courseCode.toLowerCase(), c.id]))

  for (const [idNumber, person] of people) {
    if (knownIds.has(idNumber)) continue
    const parts = person.name ? parseFullName(person.name) : null
    if (!parts) {
      summary.skipped += 1
      note(`${idNumber}: no name in the file, student not added`)
      continue
    }
    const sameName = idByName.get(nameKey(parts))
    if (sameName) {
      summary.skipped += 1
      note(`${idNumber} ${person.name}: same name as student ${sameName}, not added (check the ID)`)
      continue
    }

    let courseId: string | null = null
    if (person.course) {
      const code = person.course.toLowerCase()
      courseId = courseIdByCode.get(code) ?? null
      if (!courseId) {
        courseId = newId()
        courseIdByCode.set(code, courseId)
        newCourses.push({ id: courseId, courseCode: person.course, courseName: person.course, yearLevel: person.year ?? '' })
        note(`Course ${person.course}: not in the course list, added`)
      }
    }

    students.push({ idNumber, ...parts, courseId })
    knownIds.add(idNumber)
    idByName.set(nameKey(parts), idNumber)
    summary.new += 1
  }

  return { summary, students, courses: newCourses }
}

function fullName(student: { firstName: string; middleName: string | null; lastName: string }): string {
  return [student.firstName, student.middleName, student.lastName].filter(Boolean).join(' ')
}

// Compares the logs in a file with the database and, when `apply` is true, adds the new
// ones, marked with when they were imported and from which file, plus any students (and
// courses) they belong to that aren't in the database yet. Existing records are never
// changed, and a failure adds nothing.
export async function importAttendance(
  prisma: PrismaClient,
  rows: Record<string, unknown>[],
  apply: boolean,
  source: string
): Promise<AttendanceImportResult> {
  const [existing, studentRows, courseRows] = await Promise.all([
    prisma.attendance.findMany({ select: { idNumber: true, createdDate: true, status: true } }),
    prisma.student.findMany({ select: { idNumber: true, firstName: true, middleName: true, lastName: true, isDeleted: true } }),
    prisma.course.findMany({ select: { id: true, courseCode: true } }),
  ])
  const names = new Map(studentRows.filter((s) => !s.isDeleted).map((s) => [s.idNumber, fullName(s)]))
  const { result, rows: planned, people } = planAttendanceImport(existing, rows, names)
  const studentPlan = planNewStudents(studentRows, courseRows, people)
  result.students = studentPlan.summary

  if (apply && (planned.length || studentPlan.students.length)) {
    const importedAt = new Date()
    await prisma.$transaction(
      async (tx) => {
        if (studentPlan.courses.length) await tx.course.createMany({ data: studentPlan.courses })
        if (studentPlan.students.length) await tx.student.createMany({ data: studentPlan.students })
        if (planned.length) {
          await tx.attendance.createMany({ data: planned.map((row) => ({ ...row, importedAt, importSource: source })) })
        }
      },
      { timeout: 60_000 }
    )
  }

  return result
}
