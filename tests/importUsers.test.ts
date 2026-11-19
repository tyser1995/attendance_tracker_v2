import { describe, expect, it } from 'vitest'
import { extractUsers, planUserImport } from '@/lib/backup/importUsers'

const hash = '$2b$10$' + 'a'.repeat(53)

describe('extractUsers', () => {
  it('reads only the user list from a full backup', () => {
    const rows = extractUsers({ course: [{ courseCode: 'X' }], user: [{ username: 'ann' }] })
    expect(rows).toEqual([{ username: 'ann' }])
  })

  it('accepts a "users" key or a plain array', () => {
    expect(extractUsers({ users: [{ username: 'a' }] })).toHaveLength(1)
    expect(extractUsers([{ username: 'a' }, { username: 'b' }])).toHaveLength(2)
  })

  it('refuses files without a user list', () => {
    expect(() => extractUsers({ course: [] })).toThrow()
    expect(() => extractUsers('nope')).toThrow()
    expect(() => extractUsers({ user: 'x' })).toThrow()
  })
})

describe('planUserImport', () => {
  it('adds valid new accounts, defaulting the role to STAFF', () => {
    const { result, rows } = planUserImport([], [
      { id: 'old-id', username: 'ann', passwordHash: hash, role: 'ADMIN' },
      { username: 'ben', password: 'secret1' },
    ])
    expect(result.new).toBe(2)
    expect(rows[0]).toMatchObject({ username: 'ann', passwordHash: hash, role: 'ADMIN' })
    expect(rows[0]).not.toHaveProperty('id')
    expect(rows[1]).toMatchObject({ username: 'ben', password: 'secret1', role: 'STAFF' })
  })

  it('skips usernames already in the database, ignoring case and spaces', () => {
    const { result, rows } = planUserImport([{ username: 'Admin', cardId: null }], [{ username: ' admin ', passwordHash: hash }])
    expect(result.duplicate).toBe(1)
    expect(rows).toEqual([])
  })

  it('keeps only the first of a username repeated in the file', () => {
    const { result, rows } = planUserImport([], [
      { username: 'ann', passwordHash: hash },
      { username: 'ANN', password: 'secret1' },
    ])
    expect([result.new, result.duplicateInFile]).toEqual([1, 1])
    expect(rows).toHaveLength(1)
  })

  it('rejects missing usernames, bad roles and missing or weak passwords', () => {
    const { result, rows } = planUserImport([], [
      { passwordHash: hash },
      { username: 'a', passwordHash: hash, role: 'ROOT' },
      { username: 'b' },
      { username: 'c', passwordHash: 'not-a-hash' },
      { username: 'd', password: '123' },
    ])
    expect(result.invalid).toBe(5)
    expect(rows).toEqual([])
  })

  it('drops a card ID already linked to another account', () => {
    const { rows, result } = planUserImport([{ username: 'x', cardId: 'C1' }], [{ username: 'ann', passwordHash: hash, cardId: 'C1' }])
    expect(rows[0].cardId).toBeNull()
    expect(result.examples).toContain('ann: card ID already in use, imported without it')
  })
})
