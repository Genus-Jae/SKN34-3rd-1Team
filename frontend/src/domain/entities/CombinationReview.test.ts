import { describe, expect, it } from 'vitest'
import { supportsAutomaticReview } from './CombinationReview'

describe('supportsAutomaticReview', () => {
  it.each([
    { sourceCode: 'BIZINFO', sourceProgramId: 'PBLN_1', subProgramId: null },
    { sourceCode: 'KSTARTUP', sourceProgramId: '177911', subProgramId: null },
    { sourceCode: 'MSIT', sourceProgramId: '3186573', subProgramId: null },
    { sourceCode: 'CNTRADE_NOTICE', sourceProgramId: '3862', subProgramId: null },
  ])('accepts a supported official identity: $sourceCode:$sourceProgramId', (program) => {
    expect(supportsAutomaticReview(program)).toBe(true)
  })

  it.each([
    { sourceCode: 'BIZINFO', sourceProgramId: `PBLN_${'1'.repeat(33)}`, subProgramId: null },
    { sourceCode: 'MSIT', sourceProgramId: '0', subProgramId: null },
    { sourceCode: 'MSIT', sourceProgramId: '3186573', subProgramId: '세부사업' },
    { sourceCode: 'KSTARTUP', sourceProgramId: 'PBLN_1', subProgramId: null },
    { sourceCode: 'CNTRADE_NOTICE', sourceProgramId: '0', subProgramId: null },
  ])('rejects an unsupported automatic identity: $sourceCode:$sourceProgramId', (program) => {
    expect(supportsAutomaticReview(program)).toBe(false)
  })
})
