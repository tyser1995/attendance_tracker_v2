export const BACKUP_FREQUENCIES = ['off', 'every24h', 'daily', 'weekly', 'monthly'] as const

export type BackupFrequency = (typeof BACKUP_FREQUENCIES)[number]

export type BackupSchedule = {
  frequency: BackupFrequency
  time: string // "HH:MM", server local time
  weekday: number // 0 = Sunday; weekly only
  monthDay: number // 1-31; monthly only
}

const DAY_MS = 24 * 60 * 60 * 1000

// Months without this day use their last day, so a 31st schedule still runs in February.
function monthlyRun(year: number, month: number, monthDay: number, hours: number, minutes: number): Date {
  const lastDay = new Date(year, month + 1, 0).getDate()
  return new Date(year, month, Math.min(monthDay, lastDay), hours, minutes)
}

// The first run after saving a schedule. every24h starts at the selected time, like
// daily; only its later runs are counted from the previous backup.
export function computeFirstBackup(schedule: BackupSchedule, now: Date): Date | null {
  const frequency = schedule.frequency === 'every24h' ? 'daily' : schedule.frequency
  return computeNextBackup({ ...schedule, frequency }, now)
}

// The run after one that was due at `scheduled` and ran at `now`. Counting from the due
// time stops every24h drifting later each day; a run that's long overdue counts from now.
export function computeFollowingBackup(schedule: BackupSchedule, scheduled: Date, now: Date): Date | null {
  const next = computeNextBackup(schedule, scheduled)
  return next && next <= now ? computeNextBackup(schedule, now) : next
}

// The first scheduled run strictly after `after`, or null when backups are off.
export function computeNextBackup(schedule: BackupSchedule, after: Date): Date | null {
  const [hours, minutes] = schedule.time.split(':').map(Number)
  const year = after.getFullYear()
  const month = after.getMonth()
  const date = after.getDate()

  switch (schedule.frequency) {
    case 'off':
      return null
    case 'every24h':
      return new Date(after.getTime() + DAY_MS)
    case 'daily': {
      const today = new Date(year, month, date, hours, minutes)
      return today > after ? today : new Date(year, month, date + 1, hours, minutes)
    }
    case 'weekly': {
      const daysAhead = (schedule.weekday - after.getDay() + 7) % 7
      const run = new Date(year, month, date + daysAhead, hours, minutes)
      return run > after ? run : new Date(year, month, date + daysAhead + 7, hours, minutes)
    }
    case 'monthly': {
      const run = monthlyRun(year, month, schedule.monthDay, hours, minutes)
      return run > after ? run : monthlyRun(year, month + 1, schedule.monthDay, hours, minutes)
    }
  }
}
