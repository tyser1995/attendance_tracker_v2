'use server'

import { logAttendance, statusText } from '@/lib/attendance/logAttendance'

export type ScanResult = {
  success: boolean
  message: string
  name?: string
  status?: number
  statusLabel?: string
  time?: string
}

export async function scanIdAction(idNumber: string): Promise<ScanResult> {
  const trimmed = idNumber.trim()
  if (!trimmed) return { success: false, message: 'Enter an ID number.' }

  const result = await logAttendance(trimmed)

  if (!result.success) {
    return { success: false, message: result.message }
  }

  const time = result.record.status % 2 === 1 ? result.record.timeIn : result.record.timeOut

  return {
    success: true,
    message: result.message,
    name: result.record.name,
    status: result.record.status,
    statusLabel: statusText(result.record.status),
    time: time ?? undefined,
  }
}
