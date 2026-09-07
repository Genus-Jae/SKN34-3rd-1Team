import { describe, expect, it } from 'vitest'

import { conditionMatchedProgram, relocationReviewRequiredProgram, supportPrograms } from '../../../data/fixtures/supportPrograms'
import { formatSupportProgramEligibilityCounts, groupSupportProgramsByEligibility } from './supportProgramEligibility'

describe('검색 결과 자격 판정 구분', () => {
  it('태그와 점수가 높아도 확인 필요 공고를 조건 확인에 포함하지 않고 최신 목록도 분리한다', () => {
    const latest = { ...supportPrograms[3], recommendationScore: null }
    const programs = [relocationReviewRequiredProgram, supportPrograms[1], latest, conditionMatchedProgram]
    expect(groupSupportProgramsByEligibility(programs)).toEqual({
      matched: [conditionMatchedProgram],
      reviewRequired: [relocationReviewRequiredProgram, supportPrograms[1]],
      latest: [latest],
    })
    expect(formatSupportProgramEligibilityCounts(programs))
      .toBe('조건 확인 공고 1건, 확인 필요 공고 2건, 최신 공고 1건(자격 미평가)')
  })

  it('빈 결과에서도 조건 확인·확인 필요 건수를 각각 0건으로 안내한다', () => {
    expect(formatSupportProgramEligibilityCounts([])).toBe('조건 확인 공고 0건, 확인 필요 공고 0건')
  })
})
