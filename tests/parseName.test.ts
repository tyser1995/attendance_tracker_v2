import { describe, expect, it } from 'vitest'
import { nameKey, parseFullName } from '@/lib/students/parseName'

const parts = (firstName: string, middleName: string | null, lastName: string) => ({ firstName, middleName, lastName })

describe('parseFullName', () => {
  it.each([
    ['Derence S. Contreras', parts('Derence', 'S.', 'Contreras')],
    ['MJ Strong C. Palacios', parts('MJ Strong', 'C.', 'Palacios')],
    ['Hjellan Mary T Gutang', parts('Hjellan Mary', 'T.', 'Gutang')],
    ['Ma. Juliana D. Evangelista', parts('Ma. Juliana', 'D.', 'Evangelista')],
    ['Juan D. Dela Cruz Jr.', parts('Juan', 'D.', 'Dela Cruz Jr.')],
    ['Contreras, Derence S.', parts('Derence', 'S.', 'Contreras')],
    ['Shiela Dela Cruz', parts('Shiela', null, 'Dela Cruz')],
    ['John Carlo Matillano', parts('John Carlo', null, 'Matillano')],
    ['Kyla Mogar', parts('Kyla', null, 'Mogar')],
    ['LUIS MARIE ANIDA POTICAR', parts('Luis Marie', 'Anida', 'Poticar')],
    ['DAISY MAE DELA GRACIA CAUNGA', parts('Daisy Mae', 'Dela Gracia', 'Caunga')],
    ['  Mae   Ann  D.  Cordero ', parts('Mae Ann', 'D.', 'Cordero')],
  ])('%s', (name, expected) => {
    expect(parseFullName(name)).toEqual(expected)
  })

  it('returns null for a blank name', () => {
    expect(parseFullName('   ')).toBeNull()
  })
})

describe('nameKey', () => {
  it('matches a middle initial with the full middle name, ignoring case and dots', () => {
    expect(nameKey(parts('Jeo', 'F.', 'Sabanal'))).toBe(nameKey(parts('JEO', 'Francisco', 'sabanal')))
    expect(nameKey(parts('Jeo', 'F.', 'Sabanal'))).not.toBe(nameKey(parts('Jeo', 'G.', 'Sabanal')))
  })
})
