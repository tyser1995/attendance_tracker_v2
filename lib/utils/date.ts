export function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function formatDateLabel(dateStr: string): string {
  // dateStr: "YYYY-MM-DD" -> "Mon, 01/15"
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const day = date.toLocaleDateString('en-US', { weekday: 'short' })
  return `${day}, ${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}`
}

export function formatDateLong(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}
