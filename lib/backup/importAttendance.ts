import type { PrismaClient } from '@/app/generated/prisma'
import { addExample, emptyImportResult, extractList, optionalText, toDate, type ImportResult } from './importCommon'
import { convertLegacyBackup, isLegacyBackup } from './legacy'

// Imports only attendance time logs from a JSON file, skipping any log that would
// duplicate one already in the database or earlier in the same file. Accepts:
//   - a full backup from this app: { attendance: [...], ... } (other tables are ignored)
//   - a backup from the Flutter app (only its attendances are read)
//   - { attendances: [...] }
//   - a plain array of logs: [...]
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

export type AttendanceImportPlan = { result: AttendanceImportResult; rows: IncomingAttendance[] }

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/
const TIME = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/

export function extractAttendance(raw: unknown): Record<string, unknown>[] {
  if (typeof raw === 'object' && raw !== null && !Array.isArray(raw) && isLegacyBackup(raw as Record<string, unknown>)) {
    return (convertLegacyBackup(raw as Record<string, unknown>).attendance ?? []) as Record<string, unknown>[]
  }
  return extractList(raw, ['attendance', 'attendances'], 'attendance logs')
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
    if (students.size > 0 && knownName === undefined) note(`${label}: no student with this ID number, imported anyway`)
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

  return { result, rows: plan }
}

function fullName(student: { firstName: string; middleName: string | null; lastName: string }): string {
  return [student.firstName, student.middleName, student.lastName].filter(Boolean).join(' ')
}

// Compares the logs in a file with the database and, when `apply` is true, adds the new
// ones, marked with when they were imported and from which file. Existing logs are never
// changed, and a failure adds nothing.
export async function importAttendance(
  prisma: PrismaClient,
  rows: Record<string, unknown>[],
  apply: boolean,
  source: string
): Promise<AttendanceImportResult> {
  const [existing, studentRows] = await Promise.all([
    prisma.attendance.findMany({ select: { idNumber: true, createdDate: true, status: true } }),
    prisma.student.findMany({
      where: { isDeleted: false },
      select: { idNumber: true, firstName: true, middleName: true, lastName: true },
    }),
  ])
  const students = new Map(studentRows.map((s) => [s.idNumber, fullName(s)]))
  const { result, rows: planned } = planAttendanceImport(existing, rows, students)

  if (apply && planned.length) {
    const importedAt = new Date()
    await prisma.attendance.createMany({ data: planned.map((row) => ({ ...row, importedAt, importSource: source })) })
  }

  return result
}
