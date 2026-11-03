export type AttendanceExportRow = {
  date: string
  idNumber: string
  name: string
  course: string
  year: string
  status: string
  timeIn: string
  timeOut: string
}

const EXPORT_HEADER = ['Date', 'Student ID', 'Name', 'Course', 'Year', 'Status', 'Time In', 'Time Out']

function exportCells(r: AttendanceExportRow): string[] {
  return [r.date, r.idNumber, r.name, r.course, r.year, r.status, r.timeIn, r.timeOut]
}

export function toCsv(rows: AttendanceExportRow[]): string {
  const escape = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
  const lines = [EXPORT_HEADER.join(',')]
  for (const r of rows) {
    lines.push(exportCells(r).map(escape).join(','))
  }
  return lines.join('\n')
}

export function downloadBlob(content: BlobPart, filename: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export async function downloadPdf(rows: AttendanceExportRow[], filename: string, title: string) {
  const { default: jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default

  const doc = new jsPDF()
  doc.setFontSize(14)
  doc.text(title, 14, 16)

  autoTable(doc, {
    startY: 22,
    head: [EXPORT_HEADER],
    body: rows.map(exportCells),
    styles: { fontSize: 8 },
  })

  doc.save(filename)
}
