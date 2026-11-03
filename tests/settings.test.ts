import { describe, expect, it } from 'vitest'
import { appNameSchema } from '@/lib/validation/settings'

describe('appNameSchema', () => {
  it('trims surrounding whitespace', () => {
    expect(appNameSchema.parse('  Campus Time Log  ')).toBe('Campus Time Log')
  })

  it('accepts exactly 60 characters', () => {
    expect(appNameSchema.safeParse('x'.repeat(60)).success).toBe(true)
  })

  it.each([
    ['empty', ''],
    ['only spaces', '   '],
    ['too long', 'x'.repeat(61)],
    ['missing from the form', null],
  ])('rejects a name that is %s', (_label, value) => {
    expect(appNameSchema.safeParse(value).success).toBe(false)
  })
})
