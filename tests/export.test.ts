import { describe, expect, it } from 'vitest'
import { toCsv, type AttendanceExportRow } from '@/lib/export/download'

const row: AttendanceExportRow = {
  date: '2026-08-28',
  idNumber: 'ABC123',
  name: 'Ann Reyes',
  course: 'BSED ENG1',
  year: '1',
  status: 'AM Time In',
  timeIn: '08:00:00',
  timeOut: '',
}

describe('toCsv', () => {
  it('includes Course and Year after Name', () => {
    const [header, line] = toCsv([row]).split('\n')

    expect(header).toBe('Date,Student ID,Name,Course,Year,Status,Time In,Time Out')
    expect(line).toBe('2026-08-28,ABC123,Ann Reyes,BSED ENG1,1,AM Time In,08:00:00,')
  })

  it('leaves Course and Year blank when the student has no course', () => {
    const line = toCsv([{ ...row, course: '', year: '' }]).split('\n')[1]

    expect(line).toBe('2026-08-28,ABC123,Ann Reyes,,,AM Time In,08:00:00,')
  })
})
