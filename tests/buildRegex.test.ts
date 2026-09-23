import { describe, expect, it } from 'vitest'
import { buildRegex } from '@/lib/idPattern/buildRegex'

describe('buildRegex', () => {
  it('converts # to a digit placeholder', () => {
    expect(buildRegex('##-#####-#')).toBe('^\\d\\d-\\d\\d\\d\\d\\d-\\d$')
  })

  it('matches a conforming ID and rejects a non-conforming one', () => {
    const regex = new RegExp(buildRegex('##-#####-#'))
    expect(regex.test('21-12345-6')).toBe(true)
    expect(regex.test('21-1234-6')).toBe(false)
    expect(regex.test('AB-12345-6')).toBe(false)
  })

  it('keeps literal letters and digits as-is', () => {
    expect(buildRegex('E###')).toBe('^E\\d\\d\\d$')
    expect(new RegExp(buildRegex('E###')).test('E123')).toBe(true)
    expect(new RegExp(buildRegex('E###')).test('F123')).toBe(false)
  })

  it('escapes regex-special characters in the mask', () => {
    const regex = new RegExp(buildRegex('##.##'))
    expect(regex.test('12.34')).toBe(true)
    expect(regex.test('12a34')).toBe(false)
  })
})
