import { describe, expect, it } from 'vitest'
import { computeFirstBackup, computeFollowingBackup, computeNextBackup, type BackupSchedule } from '@/lib/backup/schedule'
import { backupScheduleSchema } from '@/lib/validation/settings'

const schedule = (overrides: Partial<BackupSchedule>): BackupSchedule => ({
  frequency: 'daily',
  time: '18:00',
  weekday: 1,
  monthDay: 1,
  ...overrides,
})

// Wednesday, 4 November 2026, 12:00 local time.
const noon = new Date(2026, 10, 4, 12, 0)

describe('computeNextBackup', () => {
  it('returns null when backups are off', () => {
    expect(computeNextBackup(schedule({ frequency: 'off' }), noon)).toBeNull()
  })

  it('runs every24h exactly 24 hours later, ignoring the time', () => {
    expect(computeNextBackup(schedule({ frequency: 'every24h' }), noon)).toEqual(new Date(2026, 10, 5, 12, 0))
  })

  it('runs daily later today when the time has not passed', () => {
    expect(computeNextBackup(schedule({ time: '18:00' }), noon)).toEqual(new Date(2026, 10, 4, 18, 0))
  })

  it('runs daily tomorrow when the time has passed or is exactly now', () => {
    expect(computeNextBackup(schedule({ time: '09:00' }), noon)).toEqual(new Date(2026, 10, 5, 9, 0))
    expect(computeNextBackup(schedule({ time: '12:00' }), noon)).toEqual(new Date(2026, 10, 5, 12, 0))
  })

  it('runs weekly on the next matching weekday', () => {
    expect(computeNextBackup(schedule({ frequency: 'weekly', weekday: 5 }), noon)).toEqual(new Date(2026, 10, 6, 18, 0))
    expect(computeNextBackup(schedule({ frequency: 'weekly', weekday: 1 }), noon)).toEqual(new Date(2026, 10, 9, 18, 0))
  })

  it('runs weekly today if the time is still ahead, otherwise in a week', () => {
    expect(computeNextBackup(schedule({ frequency: 'weekly', weekday: 3, time: '18:00' }), noon)).toEqual(new Date(2026, 10, 4, 18, 0))
    expect(computeNextBackup(schedule({ frequency: 'weekly', weekday: 3, time: '09:00' }), noon)).toEqual(new Date(2026, 10, 11, 9, 0))
  })

  it('runs monthly this month if the day is ahead, otherwise next month', () => {
    expect(computeNextBackup(schedule({ frequency: 'monthly', monthDay: 15 }), noon)).toEqual(new Date(2026, 10, 15, 18, 0))
    expect(computeNextBackup(schedule({ frequency: 'monthly', monthDay: 1 }), noon)).toEqual(new Date(2026, 11, 1, 18, 0))
  })

  it('uses the last day of shorter months', () => {
    const jan31 = new Date(2027, 0, 31, 20, 0)
    expect(computeNextBackup(schedule({ frequency: 'monthly', monthDay: 31 }), jan31)).toEqual(new Date(2027, 1, 28, 18, 0))
  })

  it('rolls from December into January', () => {
    const dec = new Date(2026, 11, 20, 12, 0)
    expect(computeNextBackup(schedule({ frequency: 'monthly', monthDay: 5 }), dec)).toEqual(new Date(2027, 0, 5, 18, 0))
  })
})

describe('computeFirstBackup', () => {
  it('starts every24h at the selected time later today', () => {
    expect(computeFirstBackup(schedule({ frequency: 'every24h', time: '18:00' }), noon)).toEqual(new Date(2026, 10, 4, 18, 0))
  })

  it('starts every24h tomorrow when the selected time has passed', () => {
    expect(computeFirstBackup(schedule({ frequency: 'every24h', time: '09:00' }), noon)).toEqual(new Date(2026, 10, 5, 9, 0))
  })

  it('matches computeNextBackup for the other frequencies', () => {
    for (const frequency of ['off', 'daily', 'weekly', 'monthly'] as const) {
      expect(computeFirstBackup(schedule({ frequency }), noon)).toEqual(computeNextBackup(schedule({ frequency }), noon))
    }
  })
})

describe('computeFollowingBackup', () => {
  const every24h = schedule({ frequency: 'every24h', time: '18:00' })
  const due = new Date(2026, 10, 4, 18, 0, 0)

  it('keeps every24h on the selected time when a backup runs a few seconds late', () => {
    const late = new Date(2026, 10, 4, 18, 0, 28)
    expect(computeFollowingBackup(every24h, due, late)).toEqual(new Date(2026, 10, 5, 18, 0, 0))
  })

  it('counts every24h from now after a backup missed for days', () => {
    const days = new Date(2026, 10, 7, 9, 0, 0)
    expect(computeFollowingBackup(every24h, due, days)).toEqual(new Date(2026, 10, 8, 9, 0, 0))
  })

  it('returns to the selected time for daily after a missed backup', () => {
    const days = new Date(2026, 10, 7, 9, 0, 0)
    expect(computeFollowingBackup(schedule({ time: '18:00' }), due, days)).toEqual(new Date(2026, 10, 7, 18, 0, 0))
  })
})

describe('backupScheduleSchema', () => {
  const valid = { frequency: 'weekly', time: '18:30', weekday: '3', monthDay: '15' }

  it('accepts form values and converts the numbers', () => {
    expect(backupScheduleSchema.parse(valid)).toEqual({ folder: '', frequency: 'weekly', time: '18:30', weekday: 3, monthDay: 15 })
  })

  it('trims the folder and removes quotes from a copied path', () => {
    expect(backupScheduleSchema.parse({ ...valid, folder: '  D:\\Backups  ' }).folder).toBe('D:\\Backups')
    expect(backupScheduleSchema.parse({ ...valid, folder: '"D:\\My Backups"' }).folder).toBe('D:\\My Backups')
  })

  it('rejects a folder path over 500 characters', () => {
    expect(backupScheduleSchema.safeParse({ ...valid, folder: 'x'.repeat(501) }).success).toBe(false)
  })

  it.each([
    ['an unknown frequency', { frequency: 'hourly' }],
    ['a missing frequency', { frequency: undefined }],
    ['an impossible time', { time: '25:00' }],
    ['a malformed time', { time: '6pm' }],
    ['a weekday out of range', { weekday: '7' }],
    ['day 0 of the month', { monthDay: '0' }],
    ['day 32 of the month', { monthDay: '32' }],
    ['a fractional day', { monthDay: '1.5' }],
  ])('rejects %s', (_label, change) => {
    expect(backupScheduleSchema.safeParse({ ...valid, ...change }).success).toBe(false)
  })
})
