import type { PrismaClient, Role } from '@/app/generated/prisma'
import { hashPassword } from '@/lib/auth/password'
import { addExample, emptyImportResult, extractList, optionalText, toDate, type ImportResult } from './importCommon'

// Imports only user accounts (login details) from a JSON file, skipping any account that
// would duplicate one already in the database or earlier in the same file. Accepts:
//   - a full backup from this app: { user: [...], ... } (other tables are ignored)
//   - { users: [...] }
//   - a plain array of accounts: [...]
// Each account needs a username and either a bcrypt `passwordHash` (as in backups) or a
// plain `password` of at least 6 characters, which is hashed before saving.

export type UserImportResult = ImportResult

export type ExistingUser = { username: string; cardId: string | null }

type IncomingUser = {
  username: string
  role: Role
  passwordHash?: string
  password?: string
  cardId: string | null
  faceDescriptor: string | null
  createdAt?: Date
}

export type UserImportPlan = { result: UserImportResult; rows: IncomingUser[] }

const ROLES: readonly Role[] = ['SUPER_ADMIN', 'ADMIN', 'STAFF']
const BCRYPT_HASH = /^\$2[abxy]\$\d{2}\$[./A-Za-z0-9]{53}$/
const MIN_PASSWORD_LENGTH = 6

export function extractUsers(raw: unknown): Record<string, unknown>[] {
  return extractList(raw, ['user', 'users'], 'user accounts')
}

// Usernames are compared ignoring case and surrounding spaces, so "Admin" and "admin "
// count as the same login.
const usernameKey = (username: string) => username.trim().toLowerCase()

// Works out what an import would do without touching the database.
export function planUserImport(existing: ExistingUser[], rows: Record<string, unknown>[]): UserImportPlan {
  const result = emptyImportResult()
  const plan: IncomingUser[] = []
  const note = (text: string) => addExample(result, text)

  const inDatabase = new Set(existing.map((u) => usernameKey(u.username)))
  const inFile = new Set<string>()
  const takenCards = new Set(existing.map((u) => u.cardId).filter((id): id is string => Boolean(id)))

  rows.forEach((row, index) => {
    result.total += 1

    const username = optionalText(row.username)
    if (!username) {
      result.invalid += 1
      note(`Row ${index + 1}: missing username`)
      return
    }

    const role = row.role === undefined || row.role === null || row.role === '' ? 'STAFF' : row.role
    if (!ROLES.includes(role as Role)) {
      result.invalid += 1
      note(`${username}: unknown role "${String(role)}"`)
      return
    }

    const passwordHash = typeof row.passwordHash === 'string' && BCRYPT_HASH.test(row.passwordHash) ? row.passwordHash : undefined
    const password = typeof row.password === 'string' && row.password.length >= MIN_PASSWORD_LENGTH ? row.password : undefined
    if (!passwordHash && !password) {
      result.invalid += 1
      note(`${username}: needs a valid passwordHash or a password of at least ${MIN_PASSWORD_LENGTH} characters`)
      return
    }

    const key = usernameKey(username)
    if (inDatabase.has(key)) {
      result.duplicate += 1
      note(`${username}: already exists`)
      return
    }
    if (inFile.has(key)) {
      result.duplicateInFile += 1
      note(`${username}: listed more than once in the file`)
      return
    }
    inFile.add(key)

    // A card ID already linked to someone else is dropped rather than rejecting the account.
    let cardId = optionalText(row.cardId)
    if (cardId && takenCards.has(cardId)) {
      note(`${username}: card ID already in use, imported without it`)
      cardId = null
    }
    if (cardId) takenCards.add(cardId)

    const createdAt = toDate(row.createdAt)
    plan.push({
      username,
      role: role as Role,
      ...(passwordHash ? { passwordHash } : { password }),
      cardId,
      faceDescriptor: optionalText(row.faceDescriptor),
      ...(createdAt ? { createdAt } : {}),
    })
    result.new += 1
  })

  return { result, rows: plan }
}

// Compares the accounts in a file with the database and, when `apply` is true, adds the
// new ones. Existing accounts are never changed, and a failure adds nothing.
export async function importUsers(prisma: PrismaClient, rows: Record<string, unknown>[], apply: boolean): Promise<UserImportResult> {
  const existing = await prisma.user.findMany({ select: { username: true, cardId: true } })
  const { result, rows: planned } = planUserImport(existing, rows)

  if (apply && planned.length) {
    const data = await Promise.all(
      planned.map(async ({ password, passwordHash, ...user }) => ({
        ...user,
        passwordHash: passwordHash ?? (await hashPassword(password!)),
      }))
    )
    await prisma.user.createMany({ data })
  }

  return result
}
