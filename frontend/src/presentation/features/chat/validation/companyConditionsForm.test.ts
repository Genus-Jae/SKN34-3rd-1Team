import { afterEach, describe, expect, it, vi } from 'vitest'

import { emptyCompanyConditionsDraft, seoulToday, validateCompanyConditions } from './companyConditionsForm'

afterEach(() => vi.useRealTimers())

describe('company conditions form', () => {
  it('trims explicit values and omits blank conditions', () => {
    expect(validateCompanyConditions({ ...emptyCompanyConditionsDraft(), region: '  서울  ', industry: '   ' }))
      .toEqual({ conditions: { region: '서울' }, error: null })
    expect(validateCompanyConditions(emptyCompanyConditionsDraft()))
      .toEqual({ conditions: {}, error: null })
  })

  it.each(['2025-02-29', '2026-02-30', '2026-9-01', '1899-12-31', '2026-09-08', 'not-a-date', ' 2024-01-01 '])
    ('rejects invalid or out-of-range established date %s', (establishedOn) => {
      const result = validateCompanyConditions({ ...emptyCompanyConditionsDraft(), establishedOn }, '2026-09-07')
      expect(result.conditions).toBeNull()
      expect(result.error).toMatch(/설립일/)
    })

  it.each(['1900-01-01', '2024-02-29', '2026-09-07'])('accepts a real established date %s', (establishedOn) => {
    expect(validateCompanyConditions({ ...emptyCompanyConditionsDraft(), establishedOn }, '2026-09-07'))
      .toEqual({ conditions: { establishedOn }, error: null })
  })

  it.each([
    ['region', '가'.repeat(51)], ['industry', '가'.repeat(101)],
    ['supportPurpose', '가'.repeat(101)], ['industry', '제조\u0000업'], ['region', '\n서울'], ['region', '서울\t'],
  ])('rejects malformed or too long %s', (field, value) => {
    expect(validateCompanyConditions({ ...emptyCompanyConditionsDraft(), [field]: value }).conditions).toBeNull()
  })

  it('uses the date in Seoul rather than the browser timezone', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-06T15:01:00Z'))
    expect(seoulToday()).toBe('2026-09-07')
  })
})
