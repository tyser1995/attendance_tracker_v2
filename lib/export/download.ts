export type AttendanceExportRow = {
  date: string
  idNumber: string
  name: string
  status: string
  timeIn: string
  timeOut: string
}

export function toCsv(rows: AttendanceExportRow[]): string {
  const header = ['Date', 'Student ID', 'Name', 'Status', 'Time In', 'Time Out']
  const escape = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
  const lines = [header.join(',')]
  for (const r of rows) {
    lines.push([r.date, r.idNumber, r.name, r.status, r.timeIn, r.timeOut].map(escape).join(','))
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
    head: [['Date', 'Student ID', 'Name', 'Status', 'Time In', 'Time Out']],
    body: rows.map((r) => [r.date, r.idNumber, r.name, r.status, r.timeIn, r.timeOut]),
    styles: { fontSize: 8 },
  })

  doc.save(filename)
}
