import { describe, expect, it } from 'vitest'

import { conditionMatchedProgram, relocationReviewRequiredProgram, supportPrograms } from '../fixtures/supportPrograms'
import { supportProgramDtoSchema, toSupportProgram } from './SupportProgramDto'

describe('지원사업 자격 판정 HTTP 계약', () => {
  const matched = conditionMatchedProgram.eligibilityReview!

  it('이전 응답의 판정 누락과 명시적 null을 자격 판정 없음으로 유지한다', () => {
    expect(supportProgramDtoSchema.parse({ ...supportPrograms[0], eligibilityReview: undefined }).eligibilityReview)
      .toBeNull()
    expect(supportProgramDtoSchema.parse(supportPrograms[0]).eligibilityReview).toBeNull()
  })

  it.each([conditionMatchedProgram, relocationReviewRequiredProgram])('판정과 중첩 인용을 도메인에 복사한다: $title', (program) => {
    const dto = supportProgramDtoSchema.parse(program)
    const domain = toSupportProgram(dto)
    expect(domain).toEqual(program)
    expect(domain.eligibilityReview).not.toBe(dto.eligibilityReview)
    expect(domain.eligibilityReview?.target).not.toBe(dto.eligibilityReview?.target)
    expect(domain.eligibilityReview?.target.evidence).not.toBe(dto.eligibilityReview?.target.evidence)
    expect(domain.eligibilityReview?.target.evidence[0]).not.toBe(dto.eligibilityReview?.target.evidence[0])
    expect(domain.eligibilityReview?.region.evidence[0]).not.toBe(dto.eligibilityReview?.region.evidence[0])
  })

  it.each([
    { ...matched, status: 'REVIEW_REQUIRED' },
    { ...matched, target: { ...matched.target, status: 'UNKNOWN' } },
    { ...matched, region: { ...matched.region, status: 'UNKNOWN' } },
    { ...matched, target: { ...matched.target, evidence: [] } },
    { ...matched, region: { ...matched.region, evidence: [] } },
    { ...matched, basis: 'TAGS' },
    { ...matched, target: { ...matched.target, status: 'DISQUALIFIED' } },
    { ...matched, target: { ...matched.target, evidence: [...matched.target.evidence, ...matched.target.evidence] } },
    { ...matched, target: { ...matched.target, evidence: [{ field: 'REGIONS', quote: '전국' }] } },
    { ...matched, target: { ...matched.target, explanation: '' } },
    { ...matched, target: { ...matched.target, explanation: '   ' } },
    { ...matched, target: { ...matched.target, evidence: [{ field: 'SUMMARY', quote: ' ' }] } },
  ])('모순된 판정이나 유효한 본문 근거 없는 MATCH를 거부한다 (%#)', (eligibilityReview) => {
    expect(supportProgramDtoSchema.safeParse({ ...conditionMatchedProgram, eligibilityReview }).success).toBe(false)
  })

  it('UNKNOWN은 인용 없이 확인이 필요한 이유를 제공할 수 있다', () => {
    const review = {
      ...matched,
      status: 'REVIEW_REQUIRED',
      region: { status: 'UNKNOWN', explanation: '이전 의향을 확인해야 합니다.', evidence: [] },
    }
    expect(supportProgramDtoSchema.parse({ ...conditionMatchedProgram, eligibilityReview: review }).eligibilityReview)
      .toEqual(review)
  })

  it('설명 160·인용 240자의 원시 코드 포인트 상한을 검사하고 공백을 임의 제거하지 않는다', () => {
    const explanation = ` ${'😀'.repeat(158)} `
    const quote = ` ${'😀'.repeat(238)} `
    const review = { ...matched, region: { ...matched.region, explanation, evidence: [{ field: 'SUMMARY', quote }] } }
    expect(supportProgramDtoSchema.parse({ ...conditionMatchedProgram, eligibilityReview: review }).eligibilityReview?.region)
      .toEqual(review.region)
    expect(supportProgramDtoSchema.safeParse({ ...conditionMatchedProgram, eligibilityReview: {
      ...review, region: { ...review.region, explanation: `${explanation} ` },
    } }).success).toBe(false)
    expect(supportProgramDtoSchema.safeParse({ ...conditionMatchedProgram, eligibilityReview: {
      ...review, region: { ...review.region, evidence: [{ field: 'SUMMARY', quote: `${quote} ` }] },
    } }).success).toBe(false)
  })

  it.each(['\n', '\r', '\t', '\u0000', '\u200b', '\ud800'])('설명과 인용의 제어문자·형식문자·서로게이트를 거부한다 (%#)', (invalid) => {
    expect(supportProgramDtoSchema.safeParse({ ...conditionMatchedProgram, eligibilityReview: {
      ...matched, target: { ...matched.target, explanation: `설명${invalid}` },
    } }).success).toBe(false)
    expect(supportProgramDtoSchema.safeParse({ ...conditionMatchedProgram, eligibilityReview: {
      ...matched, region: { ...matched.region, evidence: [{ field: 'SUMMARY', quote: `${invalid}인용` }] },
    } }).success).toBe(false)
  })
})
