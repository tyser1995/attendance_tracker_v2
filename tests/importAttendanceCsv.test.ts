import { describe, expect, it } from 'vitest'
import { decodeText, parseCsv } from '@/lib/backup/csv'
import { extractAttendanceCsv, planAttendanceImport, readAttendanceFile } from '@/lib/backup/importAttendance'

describe('parseCsv', () => {
  it('handles quotes, escaped quotes, commas, CRLF, a BOM and blank lines', () => {
    const rows = parseCsv('﻿a,b\r\n"x, y","say ""hi"""\r\n\r\n')
    expect(rows).toEqual([
      ['a', 'b'],
      ['x, y', 'say "hi"'],
    ])
  })
})

describe('extractAttendanceCsv', () => {
  it('reads a Flutter Reports export', () => {
    const rows = extractAttendanceCsv(
      'Date,Student ID,Student Name,Status,Time In,Time Out\n' +
        '2026-10-28,KAG02152005,"Gonzales, Kiny A.",AM Time Out,08:39:42,11:02:09\n' +
        '2026-10-29,DSC01212008,"Derence S. Contreras",AM Time In,14:15:18,\n'
    )
    expect(rows).toEqual([
      { idNumber: 'KAG02152005', name: 'Gonzales, Kiny A.', createdDate: '2026-10-28', status: 2, timeIn: '08:39:42', timeOut: '11:02:09', course: '', year: '' },
      { idNumber: 'DSC01212008', name: 'Derence S. Contreras', createdDate: '2026-10-29', status: 1, timeIn: '14:15:18', timeOut: null, course: '', year: '' },
    ])
  })

  it("reads this app's Reports export, including Course and Year", () => {
    const rows = extractAttendanceCsv(
      'Date,Student ID,Name,Course,Year,Status,Time In,Time Out\n2026-10-28,A1,Ann,BSIT,1,PM Time Out,13:00:00,17:00:00'
    )
    expect(rows[0]).toEqual({ idNumber: 'A1', name: 'Ann', createdDate: '2026-10-28', status: 4, timeIn: '13:00:00', timeOut: '17:00:00', course: 'BSIT', year: '1' })
  })

  it('accepts dates and times rewritten by a spreadsheet app', () => {
    const [row] = extractAttendanceCsv('Date,Student ID,Status,Time In,Time Out\n10/5/2026,A1,PM Time Out,1:05 PM,5:30:15 PM')
    expect(row).toMatchObject({ createdDate: '2026-10-05', timeIn: '13:05:00', timeOut: '17:30:15' })
  })

  it('refuses a CSV missing required columns', () => {
    expect(() => extractAttendanceCsv('Date,Name\n2026-10-01,Ann')).toThrow('Student ID, Status, Time In')
  })

  it('leaves unknown statuses for validation to reject', () => {
    const rows = extractAttendanceCsv('Date,Student ID,Status,Time In\n2026-10-01,A1,Absent,08:00:00')
    expect(planAttendanceImport([], rows).result.invalid).toBe(1)
  })
})

describe('readAttendanceFile', () => {
  it('reads JSON or CSV by content', () => {
    expect(readAttendanceFile('[{"idNumber":"A1"}]')).toEqual([{ idNumber: 'A1' }])
    expect(readAttendanceFile('Date,Student ID,Status,Time In\n2026-10-01,A1,AM Time In,08:00:00')).toHaveLength(1)
  })
})

describe('decodeText', () => {
  it('reads UTF-8, and falls back to Windows-1252 for Excel-saved files', () => {
    expect(decodeText(new TextEncoder().encode('Cañal'))).toBe('Cañal')
    expect(decodeText(new Uint8Array([0x43, 0x61, 0xf1, 0x61, 0x6c]))).toBe('Cañal')
  })
})
