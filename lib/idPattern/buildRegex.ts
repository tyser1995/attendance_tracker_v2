// Converts a mask like "##-#####-#" into a regex string like "^\d{2}-\d{5}-\d$".
// `#` matches a single digit; other letters/digits match themselves literally;
// everything else is escaped so it's matched literally too.
export function buildRegex(pattern: string): string {
  let out = '^'
  for (const ch of pattern) {
    if (ch === '#') {
      out += '\\d'
    } else if (/[A-Za-z0-9]/.test(ch)) {
      out += ch
    } else {
      out += ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    }
  }
  out += '$'
  return out
}
