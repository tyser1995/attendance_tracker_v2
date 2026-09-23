import { prisma } from '@/lib/prisma/client'

export type LogAttendanceResult =
  | { success: true; message: string; record: AttendanceRecord }
  | { success: false; message: string }

export type AttendanceRecord = {
  id: string
  idNumber: string
  name: string
  timeIn: string | null
  timeOut: string | null
  createdDate: string
  status: number
}

// Minimal slice of the Prisma client this function needs — lets tests pass a
// lightweight fake instead of a real database.
export type AttendanceDb = {
  idPattern: {
    findMany: (args: { where: { status: string } }) => Promise<{ regex: string }[]>
  }
  student: {
    findFirst: (args: {
      where: { idNumber: string; isDeleted: boolean }
    }) => Promise<{ firstName: string; middleName: string | null; lastName: string } | null>
  }
  attendance: {
    findFirst: (args: unknown) => Promise<AttendanceRecord | null>
    create: (args: { data: Record<string, unknown> }) => Promise<AttendanceRecord>
    update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<AttendanceRecord>
  }
}

function todayStr(now = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function timeNowStr(now = new Date()): string {
  const h = String(now.getHours()).padStart(2, '0')
  const m = String(now.getMinutes()).padStart(2, '0')
  const s = String(now.getSeconds()).padStart(2, '0')
  return `${h}:${m}:${s}`
}

export function statusText(status: number): string {
  switch (status) {
    case 1:
      return 'AM Time In'
    case 2:
      return 'AM Time Out'
    case 3:
      return 'PM Time In'
    case 4:
      return 'PM Time Out'
    default:
      return 'Unknown'
  }
}

function fullName(student: { firstName: string; middleName: string | null; lastName: string }): string {
  const parts = [student.firstName]
  if (student.middleName) parts.push(student.middleName)
  parts.push(student.lastName)
  return parts.join(' ')
}

// Ports the 6-step state machine from the Flutter app's
// server/src/services/attendanceLogic.js (originally lib/data/sources/local/local_attendance_source.dart).
export async function logAttendance(
  idNumber: string,
  db: AttendanceDb = prisma as unknown as AttendanceDb,
  now: Date = new Date()
): Promise<LogAttendanceResult> {
  const patterns = await db.idPattern.findMany({ where: { status: 'active' } })
  if (patterns.length > 0) {
    const matches = patterns.some((p) => new RegExp(p.regex).test(idNumber))
    if (!matches) {
      return { success: false, message: `ID '${idNumber}' does not match any allowed pattern.` }
    }
  }

  const student = await db.student.findFirst({ where: { idNumber, isDeleted: false } })
  if (!student) {
    return { success: false, message: `No student found with ID '${idNumber}'.` }
  }

  const today = todayStr(now)
  const lastRec = await db.attendance.findFirst({
    where: { idNumber, createdDate: today },
    orderBy: { updatedAt: 'desc' },
  })

  const lastStatus = lastRec ? lastRec.status : 0
  const nextStatus = lastStatus + 1

  if (nextStatus > 4) {
    return { success: false, message: 'Already completed 4 logs for today.' }
  }

  const timeNow = timeNowStr(now)
  const name = fullName(student)
  let record: AttendanceRecord

  if (nextStatus === 1 || nextStatus === 3) {
    record = await db.attendance.create({
      data: { idNumber, name, timeIn: timeNow, timeOut: null, createdDate: today, status: nextStatus },
    })
  } else {
    record = await db.attendance.update({
      where: { id: lastRec!.id },
      data: { status: nextStatus, timeOut: timeNow },
    })
  }

  return { success: true, message: `${name} — ${statusText(nextStatus)} recorded.`, record }
}
