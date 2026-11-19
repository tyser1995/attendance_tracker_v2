// Splits a full name, as written in attendance logs and report exports, into the parts
// a student record stores. Handles the shapes these names come in:
//   "Derence S. Contreras"          -> Derence / S. / Contreras
//   "MJ Strong C. Palacios"         -> MJ Strong / C. / Palacios
//   "Juan D. Dela Cruz Jr."         -> Juan / D. / Dela Cruz Jr.
//   "Contreras, Derence S."         -> Derence / S. / Contreras
//   "LUIS MARIE ANIDA POTICAR"      -> Luis Marie / Anida / Poticar  (no initial: 4+ parts)
//   "John Carlo Matillano"          -> John Carlo / - / Matillano    (no initial: 3 parts)
// Without a middle initial a name is ambiguous, so with three parts the first two are
// taken as the first name, and with four or more the second-to-last is the middle name.

export type NameParts = { firstName: string; middleName: string | null; lastName: string }

// Words that start a compound surname: "Dela Cruz", "De los Santos", "San Juan".
const PARTICLES = new Set(['de', 'del', 'dela', 'delos', 'los', 'la', 'las', 'san', 'santa', 'sta.', 'sto.', 'van', 'von', 'di', 'da', 'du'])
const SUFFIXES = /^(jr\.?|sr\.?|ii|iii|iv|v)$/i
const INITIAL = /^[A-Za-z]\.?$/

function titleCase(word: string): string {
  return word.toLowerCase().replace(/(^|[-'])([a-z])/g, (_, sep: string, ch: string) => sep + ch.toUpperCase())
}

// Groups surname particles with the word after them: ["Shiela", "Dela", "Cruz"] -> ["Shiela", "Dela Cruz"].
function units(words: string[]): string[] {
  const out: string[] = []
  let pending: string[] = []
  for (const word of words) {
    pending.push(word)
    if (!PARTICLES.has(word.toLowerCase())) {
      out.push(pending.join(' '))
      pending = []
    }
  }
  if (pending.length) out.push(pending.join(' '))
  return out
}

const initial = (word: string) => `${word[0].toUpperCase()}.`

export function parseFullName(fullName: string): NameParts | null {
  let text = fullName.replace(/\s+/g, ' ').trim()
  if (!text) return null
  // ALL-CAPS names are converted to title case, as the student list uses.
  if (text === text.toUpperCase() && /[A-Z]/.test(text)) text = text.split(' ').map(titleCase).join(' ')

  // "Last, First Middle"
  const comma = text.indexOf(',')
  if (comma > 0) {
    const lastName = text.slice(0, comma).trim()
    const rest = parseFullName(`${text.slice(comma + 1).trim()} ${lastName}`)
    return rest && { ...rest, lastName }
  }

  const words = text.split(' ')
  let suffix = ''
  if (words.length > 2 && SUFFIXES.test(words[words.length - 1])) suffix = ` ${words.pop()}`
  if (words.length === 1) return { firstName: words[0], middleName: null, lastName: suffix.trim() || words[0] }

  // A middle initial anywhere after the first word splits the name.
  const at = words.findIndex((word, i) => i > 0 && i < words.length - 1 && INITIAL.test(word))
  if (at > 0) {
    return { firstName: words.slice(0, at).join(' '), middleName: initial(words[at]), lastName: words.slice(at + 1).join(' ') + suffix }
  }

  const parts = units(words)
  const lastName = parts.pop()! + suffix
  if (parts.length >= 3) {
    const middleName = parts.pop()!
    return { firstName: parts.join(' '), middleName, lastName }
  }
  return { firstName: parts.join(' '), middleName: null, lastName }
}

// For spotting the same person under another ID. Middle names are compared by their first
// letter, so "Jeo F. Sabanal" matches "Jeo Francisco Sabanal"; case, spacing and dots are
// ignored.
export function nameKey(parts: { firstName: string; middleName: string | null; lastName: string }): string {
  const clean = (text: string) => text.toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ').trim()
  const middle = clean(parts.middleName ?? '').charAt(0)
  return `${clean(parts.firstName)}|${middle}|${clean(parts.lastName)}`
}
