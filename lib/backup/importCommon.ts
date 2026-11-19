// Shared by the single-table imports (user accounts, attendance time logs).

export type ImportResult = {
  total: number
  new: number // Valid and not in the database; added when importing.
  duplicate: number // Already in the database; never overwritten.
  duplicateInFile: number // Appears earlier in the same file; only the first is used.
  invalid: number // Missing or malformed values; never added.
  examples: string[] // A few of the skipped records and why, for the report.
  dateRange?: { from: string; to: string } // Time logs only: the first and last day of the new logs.
  students?: StudentImportSummary // Time logs only: students added for IDs not in the student list.
}

export type StudentImportSummary = {
  new: number // Not in the student list; added when importing.
  skipped: number // Not added: no name in the file, or the same name already has another ID.
  examples: string[]
}

export type ImportKind = 'users' | 'attendance'

const MAX_EXAMPLES = 10

export function emptyImportResult(): ImportResult {
  return { total: 0, new: 0, duplicate: 0, duplicateInFile: 0, invalid: 0, examples: [] }
}

export function addExample(result: ImportResult, text: string) {
  if (result.examples.length < MAX_EXAMPLES) result.examples.push(text)
}

export function optionalText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

export function toDate(value: unknown): Date | undefined {
  if (typeof value !== 'string' && !(value instanceof Date)) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

// Finds a list of rows in a parsed JSON file: a plain array, or the first of `keys` that
// holds an array. Throws when there isn't one.
export function extractList(raw: unknown, keys: string[], what: string): Record<string, unknown>[] {
  let list: unknown = Array.isArray(raw) ? raw : undefined
  if (!list && typeof raw === 'object' && raw !== null) {
    const file = raw as Record<string, unknown>
    list = keys.map((key) => file[key]).find(Array.isArray)
  }
  if (!Array.isArray(list)) {
    const names = keys.map((key) => `"${key}"`).join(' or ')
    throw new Error(`No ${what} found. The file needs a ${names} list, or be a list of ${what}.`)
  }
  return list.map((row) => (typeof row === 'object' && row !== null && !Array.isArray(row) ? (row as Record<string, unknown>) : {}))
}
