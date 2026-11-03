import type { BackupData } from './backup'

// Backups exported by the Flutter app: { version, exported_at, students, courses,
// attendances, id_patterns }, each table a map of id -> snake_case row. They carry no
// users or settings, so converting leaves those keys out and restoring keeps them.
type LegacyRow = Record<string, unknown>
type LegacyTable = Record<string, LegacyRow>

const LEGACY_TABLES = ['students', 'courses', 'attendances', 'id_patterns'] as const

function isTable(value: unknown): value is LegacyTable {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isLegacyBackup(raw: Record<string, unknown>): boolean {
  return LEGACY_TABLES.every((table) => isTable(raw[table]))
}

// Flutter rows may have null timestamps; omit them so the schema's defaults apply.
function timestamps(row: LegacyRow) {
  return {
    ...(row.created_at ? { createdAt: new Date(String(row.created_at)) } : {}),
    ...(row.updated_at ? { updatedAt: new Date(String(row.updated_at)) } : {}),
  }
}

export function convertLegacyBackup(raw: Record<string, unknown>): BackupData {
  const courses = raw.courses as LegacyTable
  const students = raw.students as LegacyTable
  const attendances = raw.attendances as LegacyTable
  const idPatterns = raw.id_patterns as LegacyTable

  return {
    course: Object.entries(courses).map(([id, row]) => ({
      id,
      courseCode: row.course_code,
      courseName: row.course_name,
      yearLevel: row.year_level ?? '',
      ...timestamps(row),
    })),
    student: Object.entries(students).map(([id, row]) => ({
      id,
      idNumber: row.idnumber,
      firstName: row.fn,
      lastName: row.ln,
      middleName: row.mn ?? null,
      dob: row.dob ?? null,
      sex: row.sex ?? null,
      isDeleted: Boolean(row.is_deleted),
      courseId: row.course_id ?? null,
      ...timestamps(row),
    })),
    attendance: Object.entries(attendances).map(([id, row]) => ({
      id,
      idNumber: row.idnumber,
      name: row.name ?? '',
      timeIn: row.time_in ?? null,
      timeOut: row.time_out ?? null,
      createdDate: row.created_date,
      status: row.status,
      ...timestamps(row),
    })),
    idPattern: Object.entries(idPatterns).map(([id, row]) => ({
      id,
      pattern: row.pattern,
      regex: row.regex,
      status: row.status ?? 'active',
      ...timestamps(row),
    })),
  }
}
