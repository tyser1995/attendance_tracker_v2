// Reads an uploaded file's bytes as text. Files are expected in UTF-8, but Excel saves CSV
// in Windows-1252 by default, where a name like "Cañal" isn't valid UTF-8; those files are
// read as Windows-1252 instead, so the ñ survives.
export function decodeText(bytes: ArrayBuffer | Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return new TextDecoder('windows-1252').decode(bytes)
  }
}

// Minimal RFC 4180 CSV reader: quoted fields, "" escapes, commas and line breaks inside
// quotes, CRLF or LF line endings, and a leading byte-order mark (added by Excel).
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  const input = text.replace(/^﻿/, '')

  for (let i = 0; i < input.length; i++) {
    const c = input[i]
    if (quoted) {
      if (c === '"' && input[i + 1] === '"') {
        field += '"'
        i++
      } else if (c === '"') quoted = false
      else field += c
    } else if (c === '"') quoted = true
    else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && input[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else field += c
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  // Blank lines, such as the one Excel leaves at the end.
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''))
}
